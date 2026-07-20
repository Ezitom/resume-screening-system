import os
import logging
import smtplib
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _get_smtp_config():
    login = os.environ.get("BREVO_SMTP_LOGIN") or os.environ.get("BREVO_LOGIN") or "b1230e001@smtp-brevo.com"
    password = os.environ.get("BREVO_SMTP_PASSWORD") or os.environ.get("BREVO_PASSWORD") or os.environ.get("BREVO_API_KEY")
    sender_email = os.environ.get("BREVO_SENDER_EMAIL") or os.environ.get("SENDER_EMAIL") or "onitomiwa911@gmail.com"
    sender_name = os.environ.get("BREVO_SENDER_NAME") or os.environ.get("SENDER_NAME") or "EBEN Recruitment"

    return {
        "login": login,
        "password": password,
        "sender_email": sender_email,
        "sender_name": sender_name
    }


def _send_smtp_email(to_email, to_name, subject, html_content):
    """
    Ultra-resilient email dispatch for Brevo.
    Tries SMTP 587 (STARTTLS) -> SMTP 465 (SSL) -> SMTP 2525 -> HTTP REST API.
    Returns True on success, False on failure with detailed error logging.
    """
    config = _get_smtp_config()
    if not to_email:
        logger.error("Cannot send email: recipient email address (to_email) is missing.")
        return False

    if not config["password"]:
        logger.error("Cannot send email: BREVO_SMTP_PASSWORD or BREVO_API_KEY environment variable is missing!")
        return False

    display_name = to_name or "Candidate"

    # --- Method 1: SMTP Port 587 (STARTTLS) ---
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = formataddr((config["sender_name"], config["sender_email"]))
        msg["To"] = formataddr((display_name, to_email))
        msg.attach(MIMEText(html_content, "html", "utf-8"))

        logger.info(f"[SMTP 587] Attempting STARTTLS to smtp-relay.brevo.com:587 for {to_email}...")
        with smtplib.SMTP("smtp-relay.brevo.com", 587, timeout=8) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(config["login"], config["password"])
            server.sendmail(config["sender_email"], [to_email], msg.as_string())
        logger.info(f"[SMTP 587] Successfully sent email to {to_email}")
        return True
    except Exception as e:
        logger.warning(f"[SMTP 587 Failed] {str(e)}. Trying port 465 SSL...")

    # --- Method 2: SMTP Port 465 (SSL) ---
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = formataddr((config["sender_name"], config["sender_email"]))
        msg["To"] = formataddr((display_name, to_email))
        msg.attach(MIMEText(html_content, "html", "utf-8"))

        logger.info(f"[SMTP 465] Attempting SSL to smtp-relay.brevo.com:465 for {to_email}...")
        with smtplib.SMTP_SSL("smtp-relay.brevo.com", 465, timeout=8) as server:
            server.login(config["login"], config["password"])
            server.sendmail(config["sender_email"], [to_email], msg.as_string())
        logger.info(f"[SMTP 465] Successfully sent email to {to_email}")
        return True
    except Exception as e:
        logger.warning(f"[SMTP 465 Failed] {str(e)}. Trying port 2525...")

    # --- Method 3: SMTP Port 2525 (Alternative STARTTLS) ---
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = formataddr((config["sender_name"], config["sender_email"]))
        msg["To"] = formataddr((display_name, to_email))
        msg.attach(MIMEText(html_content, "html", "utf-8"))

        logger.info(f"[SMTP 2525] Attempting STARTTLS to smtp-relay.brevo.com:2525 for {to_email}...")
        with smtplib.SMTP("smtp-relay.brevo.com", 2525, timeout=8) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(config["login"], config["password"])
            server.sendmail(config["sender_email"], [to_email], msg.as_string())
        logger.info(f"[SMTP 2525] Successfully sent email to {to_email}")
        return True
    except Exception as e:
        logger.warning(f"[SMTP 2525 Failed] {str(e)}. Trying Brevo HTTP API fallback...")

    # --- Method 4: Brevo HTTP REST API Fallback ---
    try:
        logger.info(f"[HTTP API] Attempting Brevo REST API fallback for {to_email}...")
        api_key = config["password"]
        headers = {
            "accept": "application/json",
            "api-key": api_key,
            "content-type": "application/json"
        }
        payload = {
            "sender": {"name": config["sender_name"], "email": config["sender_email"]},
            "to": [{"email": to_email, "name": display_name}],
            "subject": subject,
            "htmlContent": html_content
        }
        response = requests.post(
            "https://api.brevo.com/v3/smtp/email",
            json=payload,
            headers=headers,
            timeout=10
        )
        if response.status_code in [200, 201, 202]:
            logger.info(f"[HTTP API] Successfully sent email to {to_email}. Response: {response.text}")
            return True
        else:
            logger.error(f"[HTTP API Failed] Status: {response.status_code}, Body: {response.text}")
    except Exception as e:
        logger.error(f"[HTTP API Error] Failed to send email to {to_email}: {str(e)}", exc_info=True)

    return False


def send_job_message_email(candidate_email, candidate_name, job_title, message_text):
    """
    Sends an email update to a candidate regarding a job posting via Brevo's SMTP relay / API.
    Returns True if sent successfully, False otherwise.
    """
    display_name = candidate_name if candidate_name else "Candidate"
    subject = f"Update regarding your application for {job_title}"
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #E0DAD3; border-radius: 8px; background-color: #ffffff;">
        <h2 style="color: #1C1C1C;">Hello {display_name},</h2>
        <p style="color: #333333; line-height: 1.6; white-space: pre-wrap;">{message_text}</p>
        <hr style="border: none; border-top: 1px solid #E0DAD3; margin: 24px 0;">
        <p style="color: #6B6560; font-size: 14px;"><strong>Best regards,</strong><br>The Recruitment Team</p>
    </div>
    """
    return _send_smtp_email(candidate_email, display_name, subject, html_content)


def send_interview_invite_email(candidate_email, candidate_name, job_title, company_name):
    """
    Sends an interview invitation email to a candidate via Brevo's SMTP relay / API.
    Returns True if sent successfully, False otherwise.
    """
    display_name = candidate_name if candidate_name else "Candidate"
    comp_name = company_name if company_name else "EBEN Recruitment"
    subject = f"Interview Invitation: {job_title} at {comp_name}"

    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #E0DAD3; border-radius: 8px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #C8963E; padding-bottom: 12px;">
            <h1 style="color: #1C1C1C; font-size: 20px; margin: 0;">{comp_name}</h1>
        </div>
        <h2 style="color: #3A7D44;">Hello {display_name},</h2>
        <p style="color: #333333; line-height: 1.6;">We are pleased to invite you for an interview for the <strong>{job_title}</strong> role.</p>
        <p style="color: #333333; line-height: 1.6;">Our team was impressed by your profile, and we would love to discuss how your skills and experience align with our requirements.</p>
        <p style="color: #333333; line-height: 1.6;">We will follow up shortly with scheduling details. If you have any immediate questions, please feel free to reply to this email.</p>
        <hr style="border: none; border-top: 1px solid #E0DAD3; margin: 24px 0;">
        <p style="color: #6B6560; font-size: 14px;"><strong>Best regards,</strong><br>The Recruitment Team at {comp_name}</p>
    </div>
    """
    return _send_smtp_email(candidate_email, display_name, subject, html_content)


def send_application_confirmation_email(candidate_email, candidate_name, job_title):
    """
    Sends a short HTML email confirming application receipt via Brevo's SMTP relay / API.
    Returns True if sent successfully, False otherwise.
    """
    display_name = candidate_name if candidate_name else "Applicant"
    subject = f"Application Received: {job_title}"

    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #E0DAD3; border-radius: 8px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #C8963E; padding-bottom: 12px;">
            <h1 style="color: #1C1C1C; font-size: 20px; margin: 0;">EBEN Recruitment Platform</h1>
        </div>
        <h2 style="color: #3A7D44;">Hello {display_name},</h2>
        <p style="color: #333333; line-height: 1.6;">Thank you for submitting your application for the position of <strong>{job_title}</strong>.</p>
        <p style="color: #333333; line-height: 1.6;">We have successfully received your resume and credentials. Our team will review your application, and you will receive an update regarding whether you are shortlisted or declined for the role.</p>
        <p style="color: #333333; line-height: 1.6;">We appreciate your interest in joining our team.</p>
        <hr style="border: none; border-top: 1px solid #E0DAD3; margin: 24px 0;">
        <p style="color: #6B6560; font-size: 14px;"><strong>Best regards,</strong><br>The Recruitment Team</p>
    </div>
    """
    return _send_smtp_email(candidate_email, display_name, subject, html_content)


def send_application_received_email(candidate_email, candidate_name, job_title):
    return send_application_confirmation_email(candidate_email, candidate_name, job_title)


def send_custom_html_email(to_email, to_name, subject, html_content):
    """
    Sends a custom HTML email via Brevo SMTP relay / API.
    Returns True if sent successfully, False otherwise.
    """
    return _send_smtp_email(to_email, to_name, subject, html_content)
