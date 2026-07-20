# app.py
import os
import logging
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS

# Load local environment variables (if .env exists)
load_dotenv()
from supabase import create_client, Client
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



if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
