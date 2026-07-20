import os
import logging
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _get_api_instance():
    """Initializes and returns the Brevo TransactionalEmailsApi client using BREVO_API_KEY."""
    api_key = os.environ.get("BREVO_API_KEY")
    if not api_key:
        logger.error("BREVO_API_KEY environment variable is not configured.")
        return None

    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key['api-key'] = api_key
    api_client = sib_api_v3_sdk.ApiClient(configuration)
    return sib_api_v3_sdk.TransactionalEmailsApi(api_client)


def _get_sender():
    """Retrieves sender name and email from environment variables BREVO_SENDER_NAME and BREVO_SENDER_EMAIL."""
    sender_name = os.environ.get("BREVO_SENDER_NAME") or os.environ.get("SENDER_NAME", "EBEN Recruitment")
    sender_email = os.environ.get("BREVO_SENDER_EMAIL") or os.environ.get("SENDER_EMAIL")
    if not sender_email:
        logger.error("BREVO_SENDER_EMAIL environment variable is not configured.")
        return None
    return {"name": sender_name, "email": sender_email}


def send_job_message_email(candidate_email, candidate_name, job_title, message_text):
    """
    Sends an email update to a candidate regarding a job posting via Brevo's TransactionalEmailsApi.
    Returns True if sent successfully, False otherwise.
    """
    if not candidate_email:
        logger.error("Cannot send job message email: recipient email is missing.")
        return False

    api_instance = _get_api_instance()
    sender = _get_sender()

    if not api_instance or not sender:
        logger.error("Cannot send job message email: Brevo configuration missing.")
        return False

    display_name = candidate_name if candidate_name else "Candidate"
    subject = f"Update regarding your application for {job_title}"
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #E0DAD3; border-radius: 8px; background-color: #ffffff;">
        <h2 style="color: #1C1C1C;">Hello {display_name},</h2>
        <p style="color: #333333; line-height: 1.6; white-space: pre-wrap;">{message_text}</p>
        <hr style="border: none; border-top: 1px solid #E0DAD3; margin: 24px 0;">
        <p style="color: #6B6560; font-size: 14px;"><strong>Best regards,</strong><br>{sender['name']}</p>
    </div>
    """

    send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
        to=[{"email": candidate_email, "name": display_name}],
        sender=sender,
        subject=subject,
        html_content=html_content
    )

    try:
        response = api_instance.send_transac_email(send_smtp_email)
        logger.info(f"Job message email sent successfully to {candidate_email}. Message ID: {getattr(response, 'message_id', 'N/A')}")
        return True
    except ApiException as e:
        logger.error(f"Brevo API error sending job message email to {candidate_email}: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error sending job message email to {candidate_email}: {e}")
        return False


def send_interview_invite_email(candidate_email, candidate_name, job_title, company_name):
    """
    Sends an interview invitation email to a candidate via Brevo's TransactionalEmailsApi.
    Returns True if sent successfully, False otherwise.
    """
    if not candidate_email:
        logger.error("Cannot send interview invite email: recipient email is missing.")
        return False

    api_instance = _get_api_instance()
    sender = _get_sender()

    if not api_instance or not sender:
        logger.error("Cannot send interview invite email: Brevo configuration missing.")
        return False

    display_name = candidate_name if candidate_name else "Candidate"
    comp_name = company_name if company_name else sender.get("name", "EBEN Recruitment")
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

    send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
        to=[{"email": candidate_email, "name": display_name}],
        sender=sender,
        subject=subject,
        html_content=html_content
    )

    try:
        response = api_instance.send_transac_email(send_smtp_email)
        logger.info(f"Interview invite email sent successfully to {candidate_email}. Message ID: {getattr(response, 'message_id', 'N/A')}")
        return True
    except ApiException as e:
        logger.error(f"Brevo API error sending interview invite email to {candidate_email}: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error sending interview invite email to {candidate_email}: {e}")
        return False
