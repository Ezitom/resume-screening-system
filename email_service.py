import os
import logging
import smtplib
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr, parseaddr

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _get_smtp_config():
    host = os.environ.get("MAIL_HOST") or os.environ.get("BREVO_SMTP_HOST") or "smtp-relay.brevo.com"
    login = os.environ.get("MAIL_USER") or os.environ.get("BREVO_SMTP_LOGIN") or os.environ.get("BREVO_LOGIN")
    password = os.environ.get("MAIL_PASS") or os.environ.get("BREVO_SMTP_PASSWORD") or os.environ.get("BREVO_PASSWORD") or os.environ.get("BREVO_API_KEY")
    
    sender_email = os.environ.get("BREVO_SENDER_EMAIL") or os.environ.get("SENDER_EMAIL")
    sender_name = os.environ.get("BREVO_SENDER_NAME") or os.environ.get("SENDER_NAME")

    mail_from = os.environ.get("MAIL_FROM")
    if mail_from:
        p_name, p_email = parseaddr(mail_from)
        if p_email:
            sender_email = p_email
        if p_name:
            sender_name = p_name

    if not sender_name:
        sender_name = "Resume Screening Team"

    port_val = os.environ.get("MAIL_PORT") or os.environ.get("BREVO_SMTP_PORT")
    try:
        port = int(port_val) if port_val else 587
    except (ValueError, TypeError):
        port = 587

    return {
        "host": host,
        "login": login,
        "password": password,
        "sender_email": sender_email,
        "sender_name": sender_name,
        "port": port
    }


def _send_smtp_email(to_email, to_name, subject, html_content):
    """
    Email dispatch for Brevo using SMTP (with HTTP API fallback if port is unreachable).
    Returns True on success, False on failure with detailed exception logging.
    """
    config = _get_smtp_config()
    if not to_email:
        logger.error("Cannot send email: recipient email address (to_email) is missing.")
        return False

    if not config["login"] or not config["password"] or not config["sender_email"]:
        logger.error("Cannot send email: MAIL_USER/BREVO_SMTP_LOGIN, MAIL_PASS/BREVO_SMTP_PASSWORD, or MAIL_FROM/BREVO_SENDER_EMAIL is missing!")
        return False

    display_name = to_name or "Candidate"
    primary_port = config.get("port", 2525)
    host = config.get("host", "smtp-relay.brevo.com")

    # --- Method 1: SMTP (Try primary port, then fallback ports like 2525/587) ---
    ports_to_try = [primary_port]
    for p in [2525, 587, 465]:
        if p not in ports_to_try:
            ports_to_try.append(p)

    for port in ports_to_try:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = formataddr((config["sender_name"], config["sender_email"]))
            msg["To"] = formataddr((display_name, to_email))
            msg.attach(MIMEText(html_content, "html", "utf-8"))

            logger.info(f"[SMTP {port}] Connecting to {host}:{port} to send email to {to_email}...")
            if port == 465:
                with smtplib.SMTP_SSL(host, port, timeout=6) as server:
                    server.login(config["login"], config["password"])
                    server.sendmail(config["sender_email"], [to_email], msg.as_string())
            else:
                with smtplib.SMTP(host, port, timeout=6) as server:
                    server.ehlo()
                    server.starttls()
                    server.ehlo()
                    server.login(config["login"], config["password"])
                    server.sendmail(config["sender_email"], [to_email], msg.as_string())
            logger.info(f"[SMTP {port}] Successfully sent email to {to_email}")
            return True
        except Exception as e:
            logger.warning(f"[SMTP port {port} failed]: {str(e)}")

    # --- Method 2: Brevo HTTP REST API Fallback ---
    api_key = os.environ.get("BREVO_API_KEY") or config["password"]
    try:
        logger.info(f"[HTTP API] Sending via Brevo REST API fallback for {to_email}...")
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
            timeout=8
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
    comp_name = company_name if company_name else "Resume Screening Team"
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


def send_shortlist_email(candidate_email, candidate_name, job_title, custom_message=None):
    """
    Sends a shortlist notification email to a candidate via Brevo's SMTP relay / API.
    Returns True if sent successfully, False otherwise.
    """
    display_name = candidate_name if candidate_name else "Candidate"
    comp_job = job_title if job_title else "the position"
    subject = f"Congratulations! You have been shortlisted for {comp_job}"

    if custom_message and custom_message.strip():
        body_html = f'<p style="color: #333333; line-height: 1.6; white-space: pre-wrap;">{custom_message.strip()}</p>'
    else:
        body_html = f"""
        <p style="color: #333333; line-height: 1.6;">We are pleased to inform you that after reviewing your application and resume, you have been <strong>shortlisted</strong> for the position of <strong>{comp_job}</strong>.</p>
        <p style="color: #333333; line-height: 1.6;">Our recruitment team was impressed with your qualifications and experience. We would like to invite you to the next stage of our process.</p>
        <p style="color: #333333; line-height: 1.6;">You will receive further details regarding next steps shortly.</p>
        """

    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #E0DAD3; border-radius: 8px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #C8963E; padding-bottom: 12px;">
            <h1 style="color: #1C1C1C; font-size: 20px; margin: 0;">EBEN Recruitment Platform</h1>
        </div>
        <h2 style="color: #3A7D44;">Congratulations, {display_name}!</h2>
        {body_html}
        <hr style="border: none; border-top: 1px solid #E0DAD3; margin: 24px 0;">
        <p style="color: #6B6560; font-size: 14px;"><strong>Best regards,</strong><br>The Recruitment Team</p>
    </div>
    """
    return _send_smtp_email(candidate_email, display_name, subject, html_content)


def send_rejection_email(candidate_email, candidate_name, job_title, custom_message=None):
    """
    Sends a rejection notification email to a candidate via Brevo's SMTP relay / API.
    Returns True if sent successfully, False otherwise.
    """
    display_name = candidate_name if candidate_name else "Candidate"
    comp_job = job_title if job_title else "the position"
    subject = f"Update regarding your application for {comp_job}"

    if custom_message and custom_message.strip():
        body_html = f'<p style="color: #333333; line-height: 1.6; white-space: pre-wrap;">{custom_message.strip()}</p>'
    else:
        body_html = f"""
        <p style="color: #333333; line-height: 1.6;">Thank you for your interest in the position of <strong>{comp_job}</strong>.</p>
        <p style="color: #333333; line-height: 1.6;">After careful consideration of all applications, we regret to inform you that we will not be moving forward with your application at this time.</p>
        <p style="color: #333333; line-height: 1.6;">We appreciate the time you took to apply and wish you all the best in your career search.</p>
        """

    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #E0DAD3; border-radius: 8px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #C8963E; padding-bottom: 12px;">
            <h1 style="color: #1C1C1C; font-size: 20px; margin: 0;">EBEN Recruitment Platform</h1>
        </div>
        <h2 style="color: #1C1C1C;">Hello {display_name},</h2>
        {body_html}
        <hr style="border: none; border-top: 1px solid #E0DAD3; margin: 24px 0;">
        <p style="color: #6B6560; font-size: 14px;"><strong>Best regards,</strong><br>The Recruitment Team</p>
    </div>
    """
    return _send_smtp_email(candidate_email, display_name, subject, html_content)


def send_custom_html_email(to_email, to_name, subject, html_content):
    """
    Sends a custom HTML email via Brevo SMTP relay / API.
    Returns True if sent successfully, False otherwise.
    """
    return _send_smtp_email(to_email, to_name, subject, html_content)

