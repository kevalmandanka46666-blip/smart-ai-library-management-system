import os
import random
import string
import logging
import asyncio
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from ..config import settings

logger = logging.getLogger("app.sms_service")

# ─────────────────────────────────────────────────────────────
# 1. PLAIN TEXT SMS TEMPLATE BUILDERS
# ─────────────────────────────────────────────────────────────
def build_otp_sms(otp_code: str) -> str:
    return f"Smart AI Library Verification Code: {otp_code}. Valid for 5 minutes. Do not share this code."

def build_due_reminder_sms(student_name: str, book_title: str, due_date: str, days_overdue: int = 0) -> str:
    if days_overdue > 0:
        return f"Urgent: Hello {student_name}, your borrowed book '{book_title}' was due on {due_date} and is {days_overdue} days overdue. Please return it to avoid further fines."
    return f"Reminder: Hello {student_name}, the book '{book_title}' is due on {due_date}. Please return or renew it soon."

def build_fine_alert_sms(student_name: str, amount: float, book_title: str) -> str:
    return f"Fine Alert: Hello {student_name}, a late fine of Rs. {amount:.2f} has been charged for the book '{book_title}'."

def build_reservation_sms(student_name: str, book_title: str, status: str) -> str:
    return f"Reservation Update: Hello {student_name}, your reservation for '{book_title}' is now '{status}'."

def build_issue_confirmation_sms(student_name: str, book_title: str, due_date: str) -> str:
    return f"Book Issued: Hello {student_name}, '{book_title}' has been successfully issued to you. Due date: {due_date}."

def build_return_confirmation_sms(student_name: str, book_title: str) -> str:
    return f"Book Returned: Hello {student_name}, we have received the returned book '{book_title}'. Thank you."

def build_welcome_sms(user_name: str) -> str:
    return f"Welcome: Hello {user_name}, welcome to Smart AI Library! Your account has been registered successfully."

def build_custom_sms(message: str) -> str:
    return f"[Smart AI Library] {message}"


# ─────────────────────────────────────────────────────────────
# 2. CORE SMS SERVICE CLASS
# ─────────────────────────────────────────────────────────────
class SmsService:

    @staticmethod
    def get_sms_config(db=None) -> Dict[str, Any]:
        """Fetch active SMS provider configuration from database or environment settings fallback."""
        provider = getattr(settings, "SMS_PROVIDER", "")
        api_key = getattr(settings, "SMS_API_KEY", "")
        api_secret = getattr(settings, "SMS_API_SECRET", "")
        sender_id = getattr(settings, "SMS_SENDER_ID", "SMARTLIB")

        if db is not None:
            try:
                sms_doc = db.system_settings.find_one({"key": "sms_config"})
                if sms_doc and sms_doc.get("value"):
                    val = sms_doc["value"]
                    provider = val.get("provider", provider)
                    api_key = val.get("api_key", api_key)
                    api_secret = val.get("api_secret", api_secret)
                    sender_id = val.get("sender_id", sender_id)
            except Exception as e:
                logger.warning(f"Failed to read SMS config from DB: {e}")

        return {
            "provider": provider,
            "api_key": api_key,
            "api_secret": api_secret,
            "sender_id": sender_id
        }

    @classmethod
    def _send_sync(cls, phone: str, message: str, config: Dict[str, Any]) -> bool:
        """Synchronous provider dispatch worker."""
        if not phone:
            logger.error("Recipient phone number is missing")
            return False

        # If provider is empty or mock, log simulation and return True
        provider = config.get("provider", "").lower()
        if not provider or provider == "mock" or not config.get("api_key"):
            logger.info(f"📱 [SMS Simulation] To: {phone} | Msg: {message}")
            print(f"\n[SMS SIMULATION DISPATCH]\nTo: {phone}\nMessage: {message}\nProvider: MOCK/SIMULATION\n")
            return True

        # Twilio, Vonage, MSG91 integration simulation using requests/httpx pattern
        try:
            logger.info(f"📱 Calling SMS Provider {provider} for {phone}")
            print(f"\n[SMS DISPATCH VIA PROVIDER: {provider}]\nTo: {phone}\nMessage: {message}\n")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to dispatch SMS to {phone} via {provider}: {e}")
            return False

    @classmethod
    async def send_sms_async(
        cls,
        phone: str,
        message: str,
        template_name: str = "generic",
        db=None
    ) -> bool:
        """Asynchronous non-blocking SMS dispatch with MongoDB history logging."""
        config = cls.get_sms_config(db)
        success = await asyncio.to_thread(cls._send_sync, phone, message, config)

        if db is not None:
            try:
                log_entry = {
                    "recipient_phone": phone,
                    "message": message,
                    "template_name": template_name,
                    "status": "sent" if success else "failed",
                    "dispatched_at": datetime.utcnow()
                }
                db.sms_logs.insert_one(log_entry)
            except Exception as e:
                logger.warning(f"Failed to save SMS history log: {e}")

        return success

    # ─────────────────────────────────────────────────────────────
    # 3. OTP VERIFICATION ENGINE
    # ─────────────────────────────────────────────────────────────
    @classmethod
    async def send_otp_sms(cls, phone: str, db=None) -> Optional[str]:
        """Generate, save, and send a 6-digit OTP code to a phone number."""
        otp_code = "".join(random.choices(string.digits, k=6))
        message = build_otp_sms(otp_code)
        
        # Save to database with 5-minute expiration
        if db is not None:
            try:
                db.otp_store.update_one(
                    {"phone": phone},
                    {
                        "$set": {
                            "phone": phone,
                            "code": otp_code,
                            "expires_at": datetime.utcnow() + timedelta(minutes=5)
                        }
                    },
                    upsert=True
                )
            except Exception as e:
                logger.error(f"Failed to store OTP: {e}")
                return None

        success = await cls.send_sms_async(phone, message, "otp_verification", db)
        return otp_code if success else None

    @classmethod
    def verify_otp(cls, phone: str, code: str, db) -> bool:
        """Verify OTP code from database."""
        if not db:
            return False
        try:
            record = db.otp_store.find_one({"phone": phone})
            if not record:
                return False
            
            # Check expiration
            expires_at = record.get("expires_at")
            if expires_at and expires_at < datetime.utcnow():
                db.otp_store.delete_one({"phone": phone})
                return False

            if record.get("code") == code:
                db.otp_store.delete_one({"phone": phone})
                return True
        except Exception as e:
            logger.error(f"Error verifying OTP: {e}")
        return False

    # ─────────────────────────────────────────────────────────────
    # 4. CONVENIENCE DISPATCHERS
    # ─────────────────────────────────────────────────────────────
    @classmethod
    async def send_issue_confirmation(cls, phone: str, student_name: str, book_title: str, due_date: str, db=None):
        msg = build_issue_confirmation_sms(student_name, book_title, due_date)
        await cls.send_sms_async(phone, msg, "issue_confirmation", db)

    @classmethod
    async def send_return_confirmation(cls, phone: str, student_name: str, book_title: str, db=None):
        msg = build_return_confirmation_sms(student_name, book_title)
        await cls.send_sms_async(phone, msg, "return_confirmation", db)

    @classmethod
    async def send_due_reminder(cls, phone: str, student_name: str, book_title: str, due_date: str, days_overdue: int = 0, db=None):
        msg = build_due_reminder_sms(student_name, book_title, due_date, days_overdue)
        await cls.send_sms_async(phone, msg, "due_reminder", db)

    @classmethod
    async def send_fine_reminder(cls, phone: str, student_name: str, book_title: str, amount: float, db=None):
        msg = build_fine_alert_sms(student_name, amount, book_title)
        await cls.send_sms_async(phone, msg, "fine_notice", db)

    @classmethod
    async def send_reservation_notification(cls, phone: str, student_name: str, book_title: str, status_str: str, db=None):
        msg = build_reservation_sms(student_name, book_title, status_str)
        await cls.send_sms_async(phone, msg, "reservation_update", db)

    @classmethod
    async def send_welcome_sms(cls, phone: str, user_name: str, db=None):
        msg = build_welcome_sms(user_name)
        await cls.send_sms_async(phone, msg, "welcome_sms", db)

    @classmethod
    async def send_custom_sms(cls, phone: str, message: str, db=None):
        msg = build_custom_sms(message)
        return await cls.send_sms_async(phone, msg, "custom_admin", db)
