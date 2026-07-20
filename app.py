# app.py
import os
import logging
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS

# Load local environment variables (if .env exists)
load_dotenv()
import requests
from supabase import create_client, Client
from email_service import send_job_message_email, send_interview_invite_email

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configure CORS: reads ALLOWED_ORIGINS (comma-separated) from env, falling back to Netlify domain
allowed_origins_raw = os.environ.get('ALLOWED_ORIGINS') or os.environ.get('ALLOWED_ORIGIN', 'https://ezitom.netlify.app')
allowed_origins = [o.strip() for o in allowed_origins_raw.split(',') if o.strip()] + [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]
CORS(app, resources={r"/api/*": {"origins": allowed_origins}})


# Initialize Supabase Client
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY")
supabase: Client = None

if supabase_url and supabase_key:
    try:
        supabase = create_client(supabase_url, supabase_key)
        logger.info("Supabase client initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
else:
    logger.warning("Supabase environment variables are missing!")

# Brevo configuration
BREVO_API_KEY = os.environ.get("BREVO_API_KEY")
BREVO_SENDER_EMAIL = os.environ.get("BREVO_SENDER_EMAIL") or os.environ.get("SENDER_EMAIL")
SENDER_NAME = os.environ.get("SENDER_NAME", "EBEN Recruitment")

def send_brevo_email(to_email, to_name, subject, html_content):
    if not BREVO_API_KEY:
        raise ValueError("BREVO_API_KEY is not configured on the server.")
    if not BREVO_SENDER_EMAIL:
        raise ValueError("BREVO_SENDER_EMAIL is not configured on the server.")
    
    headers = {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json"
    }
    
    payload = {
        "sender": {"name": SENDER_NAME, "email": BREVO_SENDER_EMAIL},
        "to": [{"email": to_email, "name": to_name}],
        "subject": subject,
        "htmlContent": html_content
    }
    
    response = requests.post(
        "https://api.brevo.com/v3/smtp/email",
        json=payload,
        headers=headers
    )
    
    if response.status_code not in [200, 201, 202]:
        logger.error(f"Brevo API error: {response.status_code} - {response.text}")
        raise RuntimeError(f"Brevo API error: {response.text}")
        
    return response.json()

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
            
        res = send_brevo_email(to_email, to_name, subject, html_content)
        return jsonify(res), 200
    except Exception as e:
        logger.exception("Error sending email")
        return jsonify({"message": str(e)}), 500

@app.route('/api/job-posting-email', methods=['POST'])
@app.route('/api/jobs/message-applicants', methods=['POST'])
def message_applicants():
    # Trigger A: send message to all applicants of a job
    try:
        data = request.get_json()
        if not data:
            return jsonify({"message": "Missing JSON request body"}), 400
            
        job_title = data.get("job_title")
        message_content = data.get("message")
        company_name = data.get("company_name", "EBEN Recruitment")
        
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
                results.append({"email": cand_email, "name": cand_name, "status": "failed", "error": "Failed to send email via Brevo"})
                
        return jsonify({
            "message": f"Processed {len(candidates)} candidates.",
            "success_count": success_count,
            "failure_count": failure_count,
            "results": results
        }), 200
        
    except Exception as e:
        logger.exception("Error messaging applicants")
        return jsonify({"message": str(e)}), 500

@app.route('/api/interview-invite', methods=['POST'])
@app.route('/api/candidates/invite-interview', methods=['POST'])
def invite_interview():
    # Trigger B: send individual interview invite
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
            return jsonify({"message": "Failed to send interview invite email"}), 500
        
    except Exception as e:
        logger.exception("Error sending interview invite")
        return jsonify({"message": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
