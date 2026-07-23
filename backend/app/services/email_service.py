import smtplib
import asyncio
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import Optional, Dict, Any

from ..config import settings

logger = logging.getLogger("app.email_service")

# ─────────────────────────────────────────────────────────────
# 1. HTML EMAIL TEMPLATES BUILDER
# ─────────────────────────────────────────────────────────────
def _base_email_template(title: str, content_html: str) -> str:
    """Standardized branded HTML email layout (Classic Gold Theme)."""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>{title}</title>
      <style>
        body {{ margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Arial, sans-serif; color: #1e1b15; }}
        .container {{ max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }}
        .header {{ background: linear-gradient(135deg, #1e1b15 0%, #3a3225 100%); padding: 24px; text-align: center; border-bottom: 3px solid #D4A017; }}
        .header h1 {{ color: #D4A017; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }}
        .body-content {{ padding: 32px 28px; line-height: 1.6; color: #334155; }}
        .info-card {{ background: #fdfcf9; border-left: 4px solid #D4A017; padding: 16px 20px; border-radius: 6px; margin: 20px 0; border-top: 1px solid #f1ece1; border-right: 1px solid #f1ece1; border-bottom: 1px solid #f1ece1; }}
        .info-row {{ display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }}
        .info-label {{ font-weight: 600; color: #64748b; }}
        .info-val {{ font-weight: 700; color: #0f172a; }}
        .btn {{ display: inline-block; background: #D4A017; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; margin-top: 16px; font-size: 14px; }}
        .footer {{ background: #f1f5f9; padding: 16px 28px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Smart AI Library</h1>
        </div>
        <div class="body-content">
          {content_html}
        </div>
        <div class="footer">
          <p>© {datetime.utcnow().year} Smart AI Library Management System. All rights reserved.</p>
          <p>This is an automated notification. Please do not reply directly to this email.</p>
        </div>
      </div>
    </body>
    </html>
    """

def build_issue_confirmation_html(student_name: str, book_title: str, issue_date: str, due_date: str) -> str:
    content = f"""
      <h2 style="color: #0f172a; margin-top: 0;">Book Issued Successfully</h2>
      <p>Hello <strong>{student_name}</strong>,</p>
      <p>You have successfully borrowed <strong>"{book_title}"</strong> from the library. Please keep track of your return deadline below:</p>
      
      <div class="info-card">
        <div class="info-row"><span class="info-label">Book Title:</span> <span class="info-val">{book_title}</span></div>
        <div class="info-row"><span class="info-label">Issue Date:</span> <span class="info-val">{issue_date}</span></div>
        <div class="info-row"><span class="info-label">Due Date:</span> <span class="info-val" style="color: #d97706;">{due_date}</span></div>
      </div>
      
      <p>Ensure to return or renew the book prior to the due date to avoid late fine charges.</p>
    """
    return _base_email_template("Book Issue Confirmation", content)

def build_return_confirmation_html(student_name: str, book_title: str, return_date: str) -> str:
    content = f"""
      <h2 style="color: #0f172a; margin-top: 0;">Book Returned Successfully</h2>
      <p>Hello <strong>{student_name}</strong>,</p>
      <p>We confirm that <strong>"{book_title}"</strong> has been returned to the library catalog.</p>
      
      <div class="info-card">
        <div class="info-row"><span class="info-label">Book Title:</span> <span class="info-val">{book_title}</span></div>
        <div class="info-row"><span class="info-label">Returned On:</span> <span class="info-val" style="color: #16a34a;">{return_date}</span></div>
      </div>
      
      <p>Thank you for using the Smart AI Library!</p>
    """
    return _base_email_template("Book Return Confirmation", content)

def build_due_reminder_html(student_name: str, book_title: str, due_date: str, days_overdue: int = 0) -> str:
    if days_overdue > 0:
        status_text = f"<span style='color: #dc2626;'>{days_overdue} day(s) Overdue</span>"
        title_text = "Overdue Book Notice"
    else:
        status_text = "<span style='color: #d97706;'>Due Soon</span>"
        title_text = "Book Due Reminder"

    content = f"""
      <h2 style="color: #0f172a; margin-top: 0;">{title_text}</h2>
      <p>Hello <strong>{student_name}</strong>,</p>
      <p>This is a reminder regarding your borrowed book <strong>"{book_title}"</strong>.</p>
      
      <div class="info-card">
        <div class="info-row"><span class="info-label">Book Title:</span> <span class="info-val">{book_title}</span></div>
        <div class="info-row"><span class="info-label">Due Date:</span> <span class="info-val">{due_date}</span></div>
        <div class="info-row"><span class="info-label">Status:</span> <span class="info-val">{status_text}</span></div>
      </div>
      
      <p>Please return the book to the library desk to prevent fine accumulation.</p>
    """
    return _base_email_template(title_text, content)

def build_fine_reminder_html(student_name: str, book_title: str, amount: float, reason: str) -> str:
    content = f"""
      <h2 style="color: #0f172a; margin-top: 0;">Outstanding Fine Notice</h2>
      <p>Hello <strong>{student_name}</strong>,</p>
      <p>A fine record has been issued for your account regarding <strong>"{book_title}"</strong>.</p>
      
      <div class="info-card" style="border-left-color: #dc2626;">
        <div class="info-row"><span class="info-label">Amount Due:</span> <span class="info-val" style="color: #dc2626; font-size: 16px;">${amount:.2f}</span></div>
        <div class="info-row"><span class="info-label">Reason:</span> <span class="info-val">{reason}</span></div>
        <div class="info-row"><span class="info-label">Book:</span> <span class="info-val">{book_title}</span></div>
      </div>
      
      <p>Log in to your student portal to clear your pending fines online or visit the librarian desk.</p>
    """
    return _base_email_template("Outstanding Fine Notice", content)

def build_reservation_notification_html(student_name: str, book_title: str, status_str: str) -> str:
    content = f"""
      <h2 style="color: #0f172a; margin-top: 0;">Book Reservation Update</h2>
      <p>Hello <strong>{student_name}</strong>,</p>
      <p>Your reservation status for <strong>"{book_title}"</strong> has been updated to <strong>{status_str.upper()}</strong>.</p>
      
      <div class="info-card">
        <div class="info-row"><span class="info-label">Book Title:</span> <span class="info-val">{book_title}</span></div>
        <div class="info-row"><span class="info-label">Reservation Status:</span> <span class="info-val" style="color: #2563eb;">{status_str.title()}</span></div>
      </div>
      
      <p>If your reservation is approved/available, please visit the desk within 48 hours to issue the book.</p>
    """
    return _base_email_template("Reservation Update", content)

def build_test_email_html(recipient_email: str) -> str:
    content = f"""
      <h2 style="color: #16a34a; margin-top: 0;">SMTP Test Connection Successful</h2>
      <p>Hello System Administrator,</p>
      <p>This test message confirms that your SMTP Email Dispatch configuration is active and properly communicating with the mail server.</p>
      
      <div class="info-card" style="border-left-color: #16a34a;">
        <div class="info-row"><span class="info-label">Target Recipient:</span> <span class="info-val">{recipient_email}</span></div>
        <div class="info-row"><span class="info-label">Dispatched At:</span> <span class="info-val">{datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")}</span></div>
        <div class="info-row"><span class="info-label">Status:</span> <span class="info-val" style="color: #16a34a;">Operational</span></div>
      </div>
    """
    return _base_email_template("SMTP System Test", content)

def build_welcome_email_html(user_name: str, username: str, user_role: str) -> str:
    content = f"""
      <h2 style="color: #0f172a; margin-top: 0;">Welcome to Smart AI Library! 📚</h2>
      <p>Hello <strong>{user_name}</strong>,</p>
      <p>Your library account has been successfully created and registered into our system.</p>
      
      <div class="info-card">
        <div class="info-row"><span class="info-label">Username:</span> <span class="info-val">{username}</span></div>
        <div class="info-row"><span class="info-label">Account Role:</span> <span class="info-val" style="color: #D4A017;">{user_role.upper()}</span></div>
        <div class="info-row"><span class="info-label">Portal Access:</span> <span class="info-val">Active</span></div>
      </div>
      
      <p>You can now browse the digital catalogue, reserve titles, track issue deadlines, and manage your account online.</p>
    """
    return _base_email_template("Welcome to Smart AI Library", content)

def build_password_reset_html(user_name: str, otp_code: str) -> str:
    content = f"""
      <h2 style="color: #0f172a; margin-top: 0;">Password Reset Request</h2>
      <p>Hello <strong>{user_name}</strong>,</p>
      <p>We received a request to reset the password associated with your library account.</p>
      
      <div style="background: #fffbe5; border: 2px dashed #D4A017; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0;">
        <span style="font-size: 13px; font-weight: 700; color: #78350f; letter-spacing: 1px; text-transform: uppercase;">Your Verification OTP Code</span>
        <div style="font-size: 32px; font-weight: 900; color: #1e1b15; letter-spacing: 6px; margin-top: 8px;">{otp_code}</div>
      </div>
      
      <p style="font-size: 13px; color: #64748b;">This verification code is valid for 10 minutes. If you did not request a password reset, please ignore this email.</p>
    """
    return _base_email_template("Password Reset Verification Code", content)

def build_custom_email_html(subject: str, message_body: str) -> str:
    content = f"""
      <h2 style="color: #0f172a; margin-top: 0;">{subject}</h2>
      <div style="white-space: pre-wrap; font-size: 15px; color: #334155; line-height: 1.7;">
        {message_body}
      </div>
    """
    return _base_email_template(subject, content)


# ─────────────────────────────────────────────────────────────
# 2. EMAIL DISPATCH SERVICE
# ─────────────────────────────────────────────────────────────
class EmailService:
    @staticmethod
    def get_smtp_config(db=None) -> Dict[str, Any]:
        """Fetch active SMTP configuration from database or settings fallback."""
        host = settings.SMTP_HOST
        port = settings.SMTP_PORT
        user = settings.SMTP_USER
        password = settings.SMTP_PASSWORD
        from_email = settings.SMTP_FROM_EMAIL
        from_name = settings.SMTP_FROM_NAME
        tls = settings.SMTP_TLS

        if db is not None:
            try:
                smtp_doc = db.system_settings.find_one({"key": "smtp_config"})
                if smtp_doc and smtp_doc.get("value"):
                    val = smtp_doc["value"]
                    host = val.get("host", host)
                    port = int(val.get("port", port))
                    user = val.get("username", user)
                    password = val.get("password", password)
                    from_email = val.get("from_email", from_email)
                    from_name = val.get("from_name", from_name)
                    tls = val.get("tls", tls)
            except Exception as e:
                logger.warning(f"Failed to read SMTP config from DB: {e}")

        return {
            "host": host,
            "port": port,
            "user": user,
            "password": password,
            "from_email": from_email,
            "from_name": from_name,
            "tls": tls
        }

    @classmethod
    def _send_sync(cls, recipient_email: str, subject: str, html_body: str, smtp_config: Dict[str, Any]) -> bool:
        """Synchronous SMTP mail delivery worker."""
        if not recipient_email or "@" not in recipient_email:
            logger.error(f"Invalid recipient email: '{recipient_email}'")
            return False

        from_addr = f"{smtp_config['from_name']} <{smtp_config['from_email']}>"

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = from_addr
        msg["To"] = recipient_email
        msg.attach(MIMEText(html_body, "html"))

        # If host is empty or mock, log simulation and return True
        if not smtp_config["host"] or smtp_config["host"] == "localhost" or not smtp_config["user"]:
            logger.info(f"📧 [Email Simulation] To: {recipient_email} | Subject: {subject}")
            print(f"\n[EMAIL SIMULATION DISPATCH]\nTo: {recipient_email}\nSubject: {subject}\nFrom: {from_addr}\n")
            return True

        try:
            with smtplib.SMTP(smtp_config["host"], smtp_config["port"], timeout=10) as server:
                if smtp_config["tls"]:
                    server.starttls()
                if smtp_config["user"] and smtp_config["password"]:
                    server.login(smtp_config["user"], smtp_config["password"])
                server.sendmail(smtp_config["from_email"], [recipient_email], msg.as_string())

            logger.info(f"✅ Email successfully delivered to {recipient_email}")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to dispatch email to {recipient_email}: {e}")
            # Non-blocking simulation fallback on network failure
            print(f"\n[EMAIL DISPATCH FALLBACK LOG]\nTo: {recipient_email}\nSubject: {subject}\nError: {e}\n")
            return False

    @classmethod
    @classmethod
    async def send_email_async(
        cls,
        recipient_email: str,
        subject: str,
        html_body: str,
        template_name: str = "generic",
        db=None
    ) -> bool:
        """Asynchronous non-blocking email dispatch with MongoDB history logging."""
        smtp_config = cls.get_smtp_config(db)
        success = await asyncio.to_thread(cls._send_sync, recipient_email, subject, html_body, smtp_config)

        # Log into email_logs collection in MongoDB if db is provided
        if db is not None:
            try:
                log_entry = {
                    "recipient_email": recipient_email,
                    "subject": subject,
                    "template_name": template_name,
                    "body": html_body,
                    "status": "sent" if success else "failed",
                    "dispatched_at": datetime.utcnow()
                }
                db.email_logs.insert_one(log_entry)
            except Exception as e:
                logger.warning(f"Failed to save email history log: {e}")

        return success

    @classmethod
    async def send_issue_confirmation(cls, recipient_email: str, student_name: str, book_title: str, issue_date: str, due_date: str, db=None):
        html = build_issue_confirmation_html(student_name, book_title, issue_date, due_date)
        await cls.send_email_async(recipient_email, f"Book Issued: {book_title}", html, "issue_confirmation", db)

    @classmethod
    async def send_return_confirmation(cls, recipient_email: str, student_name: str, book_title: str, return_date: str, db=None):
        html = build_return_confirmation_html(student_name, book_title, return_date)
        await cls.send_email_async(recipient_email, f"Book Returned: {book_title}", html, "return_confirmation", db)

    @classmethod
    async def send_due_reminder(cls, recipient_email: str, student_name: str, book_title: str, due_date: str, days_overdue: int = 0, db=None):
        subject = f"Overdue Notice: {book_title}" if days_overdue > 0 else f"Due Reminder: {book_title}"
        html = build_due_reminder_html(student_name, book_title, due_date, days_overdue)
        await cls.send_email_async(recipient_email, subject, html, "due_reminder", db)

    @classmethod
    async def send_fine_reminder(cls, recipient_email: str, student_name: str, book_title: str, amount: float, reason: str, db=None):
        html = build_fine_reminder_html(student_name, book_title, amount, reason)
        await cls.send_email_async(recipient_email, f"Fine Notice: ₹{amount:.2f} - {book_title}", html, "fine_notice", db)

    @classmethod
    async def send_reservation_notification(cls, recipient_email: str, student_name: str, book_title: str, status_str: str, db=None):
        html = build_reservation_notification_html(student_name, book_title, status_str)
        await cls.send_email_async(recipient_email, f"Reservation Update: {book_title}", html, "reservation_update", db)

    @classmethod
    async def send_welcome_email(cls, recipient_email: str, user_name: str, username: str, user_role: str, db=None):
        html = build_welcome_email_html(user_name, username, user_role)
        await cls.send_email_async(recipient_email, "Welcome to Smart AI Library System", html, "welcome_email", db)

    @classmethod
    async def send_password_reset_email(cls, recipient_email: str, user_name: str, otp_code: str, db=None):
        html = build_password_reset_html(user_name, otp_code)
        await cls.send_email_async(recipient_email, "Password Reset OTP Verification Code", html, "password_reset", db)

    @classmethod
    async def send_custom_email(cls, recipient_email: str, subject: str, message_body: str, db=None):
        html = build_custom_email_html(subject, message_body)
        return await cls.send_email_async(recipient_email, subject, html, "custom_admin", db)

    @classmethod
    async def send_test_email(cls, recipient_email: str, db=None) -> bool:
        html = build_test_email_html(recipient_email)
        return await cls.send_email_async(recipient_email, "Smart AI Library: SMTP Connection Test", html, "smtp_test", db)
