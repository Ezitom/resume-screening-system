# app.py
import os
import json
import time
import logging
import datetime
import urllib.request
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS

# Load local environment variables (if .env exists)
load_dotenv()
try:
    from supabase import create_client, Client
except ImportError:
    create_client = None
    Client = None
from email_service import (
    send_job_message_email,
    send_interview_invite_email,
    send_application_confirmation_email,
    send_custom_html_email,
    send_shortlist_email,
    send_rejection_email
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configure CORS: allow all origins so Netlify frontend preflight never fails with Failed to fetch
CORS(app, resources={r"/api/*": {"origins": "*"}})


@app.route('/')
def health_check():
    return jsonify({"status": "ok", "message": "EBEN backend is running"}), 200


# Initialize Supabase Client
supabase_url = (os.environ.get("SUPABASE_URL") or "").strip().strip('"').strip("'")
service_key = (os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or "").strip().strip('"').strip("'")
anon_key = (os.environ.get("SUPABASE_ANON_KEY") or "").strip().strip('"').strip("'")

supabase: Client = None

if supabase_url:
    # Prioritize valid JWT keys (Supabase keys always start with 'eyJ')
    keys_to_try = []
    if service_key:
        keys_to_try.append(service_key)
    if anon_key and anon_key not in keys_to_try:
        keys_to_try.append(anon_key)

    # Sort so keys starting with 'eyJ' are tried first
    keys_to_try.sort(key=lambda k: 0 if k.startswith("eyJ") else 1)

    for key in keys_to_try:
        try:
            supabase = create_client(supabase_url, key)
            logger.info("Supabase client initialized successfully.")
            break
        except Exception as e:
            logger.warning(f"Attempt to initialize Supabase client failed: {e}")

    if not supabase:
        logger.error("Failed to initialize Supabase client: All provided keys failed or were invalid.")
else:
    logger.warning("Supabase environment variables are missing!")


@app.route('/api/send-email', methods=['POST'])
def send_email():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"message": "Missing JSON request body"}), 400
            
        to_email = data.get("to")
        subject = data.get("subject")
        html_content = data.get("html")
        to_name = data.get("to_name", "Candidate")
        
        if not to_email or not subject or not html_content:
            return jsonify({"message": "Missing required fields (to, subject, html)"}), 400
            
        success = send_custom_html_email(to_email, to_name, subject, html_content)
        if success:
            return jsonify({"message": "Email sent successfully"}), 200
        else:
            return jsonify({"message": "Failed to send email via Brevo SMTP. Check server logs."}), 500
    except Exception as e:
        logger.exception("Error sending email endpoint")
        return jsonify({"message": str(e)}), 500


@app.route('/api/job-posting-email', methods=['POST'])
@app.route('/api/jobs/message-applicants', methods=['POST'])
def message_applicants():
    # Send message to all applicants of a job posting
    try:
        data = request.get_json()
        if not data:
            return jsonify({"message": "Missing JSON request body"}), 400
            
        job_title = data.get("job_title")
        message_content = data.get("message")
        
        if not job_title or not message_content:
            return jsonify({"message": "Missing required fields (job_title, message)"}), 400
            
        if not supabase:
            return jsonify({"message": "Supabase client not initialized on server"}), 500
            
        # Fetch candidates for this job title
        query_response = supabase.table("candidates").select("id, name, email").eq("job_title", job_title).execute()
        candidates = query_response.data
        
        if not candidates:
            return jsonify({
                "message": f"No applicants found for job title '{job_title}'",
                "success_count": 0,
                "failure_count": 0,
                "results": []
            }), 200
            
        success_count = 0
        failure_count = 0
        results = []
        
        for cand in candidates:
            cand_name = cand.get("name", "Candidate")
            cand_email = cand.get("email")
            
            if not cand_email:
                logger.warning(f"Candidate {cand_name} (ID: {cand.get('id')}) has no email.")
                failure_count += 1
                results.append({"email": None, "name": cand_name, "status": "failed", "error": "No email address"})
                continue
                
            success = send_job_message_email(cand_email, cand_name, job_title, message_content)
            if success:
                success_count += 1
                results.append({"email": cand_email, "name": cand_name, "status": "success"})
            else:
                failure_count += 1
                results.append({"email": cand_email, "name": cand_name, "status": "failed", "error": "Failed to send email via Brevo SMTP"})
                
        status_code = 200 if success_count > 0 else 500
        return jsonify({
            "message": f"Processed {len(candidates)} candidates.",
            "success_count": success_count,
            "failure_count": failure_count,
            "results": results
        }), status_code
        
    except Exception as e:
        logger.exception("Error messaging applicants")
        return jsonify({"message": str(e)}), 500


@app.route('/api/interview-invite', methods=['POST'])
@app.route('/api/candidates/invite-interview', methods=['POST'])
def invite_interview():
    # Send individual interview invite
    try:
        data = request.get_json()
        if not data:
            return jsonify({"message": "Missing JSON request body"}), 400
            
        candidate_name = data.get("candidate_name")
        candidate_email = data.get("candidate_email")
        job_title = data.get("job_title")
        company_name = data.get("company_name", "EBEN Recruitment")
        
        # If candidate_id is passed instead of direct email/name, attempt to fetch from Supabase
        candidate_id = data.get("candidate_id")
        if candidate_id and supabase and (not candidate_email or not candidate_name or not job_title):
            try:
                cand_resp = supabase.table("candidates").select("name, email, job_title").eq("id", candidate_id).execute()
                if cand_resp.data:
                    c_data = cand_resp.data[0]
                    candidate_name = candidate_name or c_data.get("name")
                    candidate_email = candidate_email or c_data.get("email")
                    job_title = job_title or c_data.get("job_title")
            except Exception as ex:
                logger.error(f"Error fetching candidate {candidate_id} from database: {ex}")

        if not candidate_name or not candidate_email or not job_title:
            return jsonify({"message": "Missing required fields (candidate_name, candidate_email, job_title)"}), 400
            
        success = send_interview_invite_email(candidate_email, candidate_name, job_title, company_name)
        if success:
            return jsonify({"message": "Interview invite sent successfully"}), 200
        else:
            return jsonify({"message": "Failed to send interview invite email via Brevo SMTP. Check server logs."}), 500
        
    except Exception as e:
        logger.exception("Error sending interview invite")
        return jsonify({"message": str(e)}), 500


@app.route('/api/application-received', methods=['POST'])
@app.route('/api/application-confirmation', methods=['POST'])
def application_received():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"message": "Missing JSON request body"}), 400
            
        candidate_name = data.get("candidate_name")
        candidate_email = data.get("candidate_email")
        job_title = data.get("job_title", "Position")
        
        if not candidate_email:
            return jsonify({"message": "Missing candidate_email field"}), 400
            
        success = send_application_confirmation_email(candidate_email, candidate_name, job_title)
        if success:
            return jsonify({"message": "Application confirmation email sent successfully"}), 200
        else:
            return jsonify({"message": "Failed to send application confirmation email via Brevo SMTP. Check server logs."}), 500
    except Exception as e:
        logger.exception("Error sending application confirmation email")
        return jsonify({"message": str(e)}), 500


@app.route('/api/shortlist-email', methods=['POST'])
@app.route('/api/candidates/shortlist', methods=['POST'])
def shortlist_candidate():
    try:
        data = request.get_json() or {}
        candidate_email = data.get("candidate_email") or data.get("to")
        candidate_name = data.get("candidate_name") or data.get("to_name")
        job_title = data.get("job_title", "Position")
        custom_message = data.get("message") or data.get("custom_message")
        
        if not candidate_email:
            return jsonify({"message": "Missing candidate_email"}), 400
            
        success = send_shortlist_email(candidate_email, candidate_name, job_title, custom_message)
        if success:
            return jsonify({"message": "Shortlist email sent successfully"}), 200
        logger.error(f"Failed to send shortlist email to {candidate_email}")
        return jsonify({"message": "Failed to send shortlist email via Brevo SMTP. Check server logs."}), 500
    except Exception as e:
        logger.exception("Error in shortlist candidate endpoint")
        return jsonify({"message": str(e)}), 500


@app.route('/api/rejection-email', methods=['POST'])
@app.route('/api/candidates/reject', methods=['POST'])
def reject_candidate():
    try:
        data = request.get_json() or {}
        candidate_email = data.get("candidate_email") or data.get("to")
        candidate_name = data.get("candidate_name") or data.get("to_name")
        job_title = data.get("job_title", "Position")
        custom_message = data.get("message") or data.get("custom_message")
        
        if not candidate_email:
            return jsonify({"message": "Missing candidate_email"}), 400
            
        success = send_rejection_email(candidate_email, candidate_name, job_title, custom_message)
        if success:
            return jsonify({"message": "Rejection email sent successfully"}), 200
        logger.error(f"Failed to send rejection email to {candidate_email}")
        return jsonify({"message": "Failed to send rejection email via Brevo SMTP. Check server logs."}), 500
    except Exception as e:
        logger.exception("Error in reject candidate endpoint")
        return jsonify({"message": str(e)}), 500


# ============================================================
# SERVER-SIDE RESUME EVALUATION (GROQ AI API)
# ============================================================

ALLOWED_RECOMMENDATIONS = ["Highly Suitable", "Suitable", "Under Review", "Not Suitable"]

def ask_groq(prompt, json_mode=False):
    groq_api_key = (os.environ.get("GROQ_API_KEY") or "").strip().strip('"').strip("'")
    groq_model = (os.environ.get("GROQ_MODEL") or "openai/gpt-oss-120b").strip().strip('"').strip("'")
    
    if not groq_api_key:
        raise ValueError("GROQ_API_KEY environment variable is missing on server.")

    url = "https://api.groq.com/openai/v1/chat/completions"
    payload = {
        "model": groq_model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3,
        "max_tokens": 2048
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    headers = {
        "Authorization": f"Bearer {groq_api_key}",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    }

    max_retries = 3
    for attempt in range(max_retries):
        try:
            req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers)
            with urllib.request.urlopen(req, timeout=35) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                choice = data.get("choices", [{}])[0]
                msg = choice.get("message", {})
                content = msg.get("content") or msg.get("reasoning") or ""
                return content
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < max_retries - 1:
                logging.warning(f"Groq API 429 Rate Limit (attempt {attempt + 1}/{max_retries}). Retrying in 2.5s...")
                time.sleep(2.5)
                continue
            raise e


@app.route('/api/evaluate-resume', methods=['POST'])
@app.route('/api/evaluate', methods=['POST'])
def evaluate_resume():
    try:
        data = request.get_json() or {}
        resume_text = data.get("resume_text") or data.get("resumeText") or ""
        sustainability_answer = data.get("sustainability_statement") or data.get("sustainabilityAnswer") or ""
        job_posting = data.get("job_posting") or data.get("jobPosting") or {}

        if not resume_text:
            return jsonify({"message": "Missing required field: resume_text"}), 400
        if not job_posting or not isinstance(job_posting, dict):
            return jsonify({"message": "Job posting data is required for evaluation."}), 400

        job_title = job_posting.get("title") or job_posting.get("job_title") or "Unspecified Role"
        job_description = job_posting.get("description") or "No description provided."
        required_skills = job_posting.get("mustHaveSkills") or job_posting.get("must_have") or job_posting.get("required_skills") or job_posting.get("skills") or "Not explicitly specified."
        preferred_skills = job_posting.get("niceToHaveSkills") or job_posting.get("nice_to_have") or job_posting.get("preferred_skills") or "Not explicitly specified."
        required_experience = job_posting.get("experienceLevel") or job_posting.get("experience_level") or "Not explicitly specified."

        # 1. Summary Generation
        summary_prompt = f"""You are an expert HR professional. Based on the resume text below, write a concise professional summary of this candidate in 3-4 sentences. Focus on their key strengths, experience level, and what makes them stand out. Write in third person. CRITICAL: Always use gender-neutral pronouns (they/them/their) or refer to them as "the candidate". Do not assume or guess their gender under any circumstances.

Resume Text:
{resume_text}

Return ONLY the summary paragraph. No labels, no headers, no extra text."""

        # 2. Structured Data Extraction
        structured_prompt = f"""You are an expert resume parser. Extract the following information from the resume text below and return it as a valid JSON object only. No markdown, no backticks, no extra text — just raw JSON.

Resume Text:
{resume_text}

Return this exact JSON structure:
{{
  "technicalSkills": ["skill1", "skill2", "skill3"],
  "education": [
    {{ "degree": "...", "institution": "...", "year": "..." }}
  ],
  "experience": [
    {{ "title": "...", "company": "...", "duration": "...", "responsibilities": "..." }}
  ],
  "yearsOfExperience": "...",
  "name": "...",
  "email": "...",
  "phone": "..."
}}

If a field cannot be found, use an empty string or empty array. Return ONLY the JSON object."""

        # 3. Category Scoring & Rubric
        scores_prompt = f"""You are a senior HR evaluator and talent acquisition specialist.
Analyze the candidate's resume AND sustainability statement against the specific job posting requirements below.
Score the candidate across 6 distinct categories and compute the exact overall weighted score.

Return ONLY a raw JSON object matching the exact schema specified. No markdown fences, no backticks, no text before or after the JSON.

==================================================
1. JOB POSTING DETAILS
==================================================
Job Title: {job_title}
Experience Level Required: {required_experience}
Job Description: {job_description}
Must-Have / Required Skills: {required_skills}
Nice-to-Have / Preferred Skills: {preferred_skills}

==================================================
2. CANDIDATE RESUME TEXT
==================================================
{resume_text}

==================================================
3. CANDIDATE SUSTAINABILITY STATEMENT
==================================================
{sustainability_answer or "No sustainability statement provided."}

==================================================
4. EVALUATION RUBRIC & SCORING BANDS
==================================================
Evaluate the candidate across the following categories (0-100 score each):

1. skillsMatch (Weight: 35%):
   Compare candidate's technical and soft skills directly against the Must-Have and Nice-to-Have lists above. Use these exact scoring bands:
   - 90-100: Meets all must-haves + most nice-to-haves.
   - 70-89: Meets all must-haves, missing some nice-to-haves.
   - 50-69: Missing 1-2 core must-have skills.
   - <50: Missing major must-have skills.

2. experienceLevel (Weight: 25%):
   Evaluate candidate's total years of experience, seniority, and past roles explicitly against what this specific job requires ({required_experience}). Do not score experience in isolation; evaluate suitability for this specific role.

3. education (Weight: 15%):
   Score based on degree level, institution, field relevance, and academic/professional certifications relative to the job position.

4. communication (Weight: 10%):
   Score based on document structure, clarity, professional tone, formatting, and articulation of achievements in the resume.

5. leadership (Weight: 5%):
   Score based on evidence of project ownership, team management, mentoring, initiative, or leadership roles in the resume.

6. sustainability (Weight: 10%):
   Score based PRIMARILY on the candidate's sustainability statement. Consider environmental awareness, social responsibility, community involvement, ethical work practices, values-driven projects, and mentoring.
   - Detailed, genuine statement: 70-100.
   - Vague or minimal statement: 30-50.
   - Empty statement: 0.

OVERALL WEIGHTED SCORE FORMULA:
Calculate overallScore using this exact formula:
overallScore = Math.round((skillsMatch * 0.35) + (experienceLevel * 0.25) + (education * 0.15) + (communication * 0.10) + (leadership * 0.05) + (sustainability * 0.10))

==================================================
5. REQUIRED JSON OUTPUT SCHEMA
==================================================
{{
  "skillsMatch": {{
    "score": <number 0-100>,
    "matchedSkills": ["skill1", "skill2"],
    "missingSkills": ["missingSkill1"],
    "reason": "<Detailed justification citing specific matched and missing requirements>"
  }},
  "experienceLevel": {{
    "score": <number 0-100>,
    "yearsFound": "<e.g. 5 years>",
    "reason": "<Detailed justification evaluating candidate experience against the job's required experience level>"
  }},
  "education": {{
    "score": <number 0-100>,
    "reason": "<Justification referencing candidate degree and relevance to role>"
  }},
  "communication": {{
    "score": <number 0-100>,
    "reason": "<Justification referencing document clarity and structure>"
  }},
  "leadership": {{
    "score": <number 0-100>,
    "reason": "<Justification referencing evidence of initiative or leadership>"
  }},
  "sustainability": {{
    "score": <number 0-100>,
    "reason": "<Justification referencing specific sustainability statement content and resume evidence>"
  }},
  "overallScore": {{
    "score": <number 0-100>,
    "recommendation": "<Must be exactly one of: 'Highly Suitable' | 'Suitable' | 'Under Review' | 'Not Suitable'>",
    "reason": "<Holistic summary of fit, key strengths, and critical gaps relative to the job posting>"
  }}
}}"""

        summary = ask_groq(summary_prompt)

        raw_structured = ask_groq(structured_prompt, json_mode=True)
        cleaned_structured = raw_structured.replace("```json", "").replace("```", "").strip()
        try:
            structured = json.loads(cleaned_structured)
        except Exception:
            structured = {"technicalSkills": [], "education": [], "experience": [], "yearsOfExperience": "", "name": "", "email": "", "phone": ""}

        raw_scores = ask_groq(scores_prompt, json_mode=True)
        cleaned_scores = raw_scores.replace("```json", "").replace("```", "").strip()
        try:
            scores = json.loads(cleaned_scores)
            if isinstance(scores, dict) and "overallScore" in scores:
                rec = scores["overallScore"].get("recommendation")
                if rec not in ALLOWED_RECOMMENDATIONS:
                    score_val = float(scores["overallScore"].get("score") or 0)
                    if score_val >= 80:
                        scores["overallScore"]["recommendation"] = "Highly Suitable"
                    elif score_val >= 65:
                        scores["overallScore"]["recommendation"] = "Suitable"
                    elif score_val >= 50:
                        scores["overallScore"]["recommendation"] = "Under Review"
                    else:
                        scores["overallScore"]["recommendation"] = "Not Suitable"
        except Exception as e:
            logger.error(f"Score parse error in backend evaluate_resume: {e}. Raw: {raw_scores}")
            return jsonify({"message": f"Evaluation parsing failed: {e}"}), 500

        result = {
            "resumeText": resume_text,
            "sustainabilityAnswer": sustainability_answer,
            "summary": summary,
            "technicalSkills": structured.get("technicalSkills") or [],
            "education": structured.get("education") or [],
            "experience": structured.get("experience") or [],
            "yearsOfExperience": structured.get("yearsOfExperience") or "",
            "extractedName": structured.get("name") or "",
            "extractedEmail": structured.get("email") or "",
            "extractedPhone": structured.get("phone") or "",
            "scores": scores,
            "dateApplied": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
        return jsonify(result), 200

    except urllib.error.HTTPError as e:
        logger.exception("HTTP error in evaluate_resume endpoint")
        if e.code == 429:
            return jsonify({"message": "AI Evaluation service is currently experiencing high demand. Please wait a few seconds and try submitting again."}), 429
        return jsonify({"message": f"Resume evaluation failed: {str(e)}"}), 500
    except Exception as e:
        logger.exception("Error in evaluate_resume endpoint")
        return jsonify({"message": str(e)}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
