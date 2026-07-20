import os
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SMTP_SERVER = "smtp-relay.brevo.com"
SMTP_PORT = 587


def _get_smtp_config():
    login = os.environ.get("BREVO_SMTP_LOGIN")
    password = os.environ.get("BREVO_SMTP_PASSWORD")
    sender_email = os.environ.get("BREVO_SENDER_EMAIL") or os.environ.get("SENDER_EMAIL")
    sender_name = os.environ.get("BREVO_SENDER_NAME") or os.environ.get("SENDER_NAME", "EBEN Recruitment")

    if not login or not password or not sender_email:
        logger.error(
            f"Brevo SMTP configuration is incomplete. "
            f"BREVO_SMTP_LOGIN={'SET' if login else 'MISSING'}, "
            f"BREVO_SMTP_PASSWORD={'SET' if password else 'MISSING'}, "
            f"BREVO_SENDER_EMAIL={'SET' if sender_email else 'MISSING'}"
        )
        return None

    return {
        "login": login,
        "password": password,
        "sender_email": sender_email,
        "sender_name": sender_name
    }


def _send_smtp_email(to_email, to_name, subject, html_content):
    """
    Core function to send an email using Brevo SMTP relay via smtplib.
    Returns True on confirmed send, False on any exception.
    Logs full exception text (str(e)) with stack trace.
    """
    config = _get_smtp_config()
    if not config:
        logger.error("Cannot send email: Brevo SMTP configuration missing.")
        return False

    if not to_email:
        logger.error("Cannot send email: recipient email address (to_email) is missing.")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = formataddr((config["sender_name"], config["sender_email"]))
        msg["To"] = formataddr((to_name or "Candidate", to_email))

        part_html = MIMEText(html_content, "html", "utf-8")
        msg.attach(part_html)

        logger.info(f"Connecting to SMTP server {SMTP_SERVER}:{SMTP_PORT} to send email to {to_email}...")
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=30) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(config["login"], config["password"])
            server.sendmail(config["sender_email"], [to_email], msg.as_string())

        logger.info(f"Email successfully sent via Brevo SMTP to {to_email}. Subject: '{subject}'")
        return True

    except Exception as e:
        logger.error(f"Failed to send SMTP email to {to_email} (Subject: '{subject}'): {str(e)}", exc_info=True)
        return False


def send_job_message_email(candidate_email, candidate_name, job_title, message_text):
    """
    Sends an email update to a candidate regarding a job posting via Brevo's SMTP relay.
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
    Sends an interview invitation email to a candidate via Brevo's SMTP relay.
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
    Sends a short HTML email confirming application receipt via Brevo's SMTP relay.
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


# Backwards compatibility alias for application confirmation
def send_application_received_email(candidate_email, candidate_name, job_title):
    return send_application_confirmation_email(candidate_email, candidate_name, job_title)


def send_custom_html_email(to_email, to_name, subject, html_content):
    """
    Sends a custom HTML email via Brevo SMTP relay.
    Returns True if sent successfully, False otherwise.
    """
    return _send_smtp_email(to_email, to_name, subject, html_content)
