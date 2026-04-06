import smtplib
import ssl
from email.message import EmailMessage

from app.core.config import settings


class EmailConfigurationError(RuntimeError):
    pass


class EmailDeliveryError(RuntimeError):
    pass


def _build_from_header() -> str:
    if settings.SMTP_FROM_NAME:
        return f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    return settings.SMTP_FROM_EMAIL


def send_password_reset_email(recipient_email: str, recipient_name: str, code: str) -> None:
    if not settings.smtp_is_configured:
        raise EmailConfigurationError("SMTP is not configured")

    if settings.SMTP_USE_TLS and settings.SMTP_USE_SSL:
        raise EmailConfigurationError("SMTP_USE_TLS and SMTP_USE_SSL cannot both be enabled")

    message = EmailMessage()
    message["Subject"] = "Password reset code"
    message["From"] = _build_from_header()
    message["To"] = recipient_email
    message.set_content(
        (
            f"Bonjour {recipient_name},\n\n"
            f"Votre code de reinitialisation est : {code}\n"
            f"Ce code expire dans {settings.PASSWORD_RESET_CODE_EXPIRE_MINUTES} minutes.\n\n"
            "Si vous n'avez pas demande cette reinitialisation, ignorez cet email.\n\n"
            f"Hello {recipient_name},\n\n"
            f"Your password reset code is: {code}\n"
            f"This code expires in {settings.PASSWORD_RESET_CODE_EXPIRE_MINUTES} minutes.\n\n"
            "If you did not request this reset, you can ignore this email.\n"
        )
    )

    try:
        if settings.SMTP_USE_SSL:
            smtp_client = smtplib.SMTP_SSL(
                settings.SMTP_HOST,
                settings.SMTP_PORT,
                timeout=settings.SMTP_TIMEOUT_SECONDS,
                context=ssl.create_default_context(),
            )
        else:
            smtp_client = smtplib.SMTP(
                settings.SMTP_HOST,
                settings.SMTP_PORT,
                timeout=settings.SMTP_TIMEOUT_SECONDS,
            )

        with smtp_client as server:
            server.ehlo()
            if settings.SMTP_USE_TLS and not settings.SMTP_USE_SSL:
                server.starttls(context=ssl.create_default_context())
                server.ehlo()
            if settings.SMTP_USERNAME:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(message)
    except (OSError, smtplib.SMTPException) as exc:
        raise EmailDeliveryError("Failed to send email") from exc
