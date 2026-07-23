from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

from ..database import get_db
from ..core.security import get_current_admin
from ..services.email_service import EmailService

router = APIRouter(prefix="/api/v1/email", tags=["Email Service"])

class SmtpSettingsRequest(BaseModel):
    host: str
    port: int = 587
    username: Optional[str] = ""
    password: Optional[str] = ""
    from_email: str
    from_name: str = "Smart AI Library"
    tls: bool = True

class TestEmailRequest(BaseModel):
    recipient_email: EmailStr

# ─────────────────────────────────────────────
# 1. GET SMTP SETTINGS
# ─────────────────────────────────────────────
@router.get("/settings", response_model=dict)
async def get_smtp_settings(db=Depends(get_db), current_admin=Depends(get_current_admin)):
    """Retrieve active SMTP settings."""
    cfg = EmailService.get_smtp_config(db)
    # Mask password for security
    if cfg.get("password"):
        cfg["password"] = "••••••••"
    return cfg

# ─────────────────────────────────────────────
# 2. UPDATE SMTP SETTINGS
# ─────────────────────────────────────────────
@router.post("/settings", response_model=dict)
async def update_smtp_settings(
    settings_payload: SmtpSettingsRequest,
    db=Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    """Save updated SMTP settings in Database."""
    data = settings_payload.dict()
    # Preserve old password if masked placeholder passed
    if data.get("password") == "••••••••":
        old_cfg = EmailService.get_smtp_config(db)
        data["password"] = old_cfg.get("password", "")

    db.system_settings.update_one(
        {"key": "smtp_config"},
        {"$set": {"key": "smtp_config", "value": data, "updated_at": datetime.utcnow()}},
        upsert=True
    )
    return {"message": "SMTP settings saved successfully"}

# ─────────────────────────────────────────────
# 3. DISPATCH TEST EMAIL
# ─────────────────────────────────────────────
@router.post("/test", response_model=dict)
async def send_test_email(
    request: TestEmailRequest,
    db=Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    """Send an SMTP connection test email."""
    success = await EmailService.send_test_email(request.recipient_email, db)
    if not success:
        return {
            "status": "warning",
            "message": f"Test email dispatched via fallback logger to {request.recipient_email}. (Verify SMTP server credentials if real email delivery is expected)."
        }
    return {
        "status": "success",
        "message": f"Test email sent successfully to {request.recipient_email}"
    }

# ─────────────────────────────────────────────
# 4. BULK TRIGGER DUE REMINDERS
# ─────────────────────────────────────────────
@router.post("/remind-due", response_model=dict)
async def trigger_due_reminders(
    db=Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    """Scan all active borrows and send due/overdue email reminders."""
    now = datetime.utcnow()
    active_borrows = list(db.borrows.find({"status": "issued"}))

    dispatched_count = 0
    for borrow in active_borrows:
        student_id = borrow.get("student_id")
        student = db.students.find_one({"student_id": student_id}) if student_id else None
        student_email = student.get("email") if student else None

        if student_email:
            due_dt = borrow.get("due_date")
            due_str = due_dt.strftime("%Y-%m-%d") if isinstance(due_dt, datetime) else str(due_dt or "N/A")
            days_overdue = 0
            if isinstance(due_dt, datetime) and due_dt < now:
                days_overdue = (now - due_dt).days or 1

            student_name = borrow.get("student_name") or (student.get("full_name") if student else "Student")
            book_title = borrow.get("book_title", "Borrowed Book")

            # Non-blocking async call
            await EmailService.send_due_reminder(
                recipient_email=student_email,
                student_name=student_name,
                book_title=book_title,
                due_date=due_str,
                days_overdue=days_overdue,
                db=db
            )
            dispatched_count += 1

    return {
        "message": f"Dispatched {dispatched_count} due/overdue reminders to active borrowers."
    }

class CustomEmailRequest(BaseModel):
    recipient_email: Optional[str] = None
    broadcast_all_members: bool = False
    subject: str
    message: str

class ScheduleSettingsRequest(BaseModel):
    enabled: bool = True
    daily_reminder_time: str = "08:00"

# ─────────────────────────────────────────────
# 5. GET EMAIL DISPATCH HISTORY LOGS
# ─────────────────────────────────────────────
@router.get("/history", response_model=list)
async def get_email_history(
    limit: int = 100,
    search: Optional[str] = None,
    db=Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    """Fetch logs from email_logs collection."""
    query = {}
    if search:
        query["$or"] = [
            {"recipient_email": {"$regex": search, "$options": "i"}},
            {"subject": {"$regex": search, "$options": "i"}},
            {"template_name": {"$regex": search, "$options": "i"}}
        ]
    logs = list(db.email_logs.find(query).sort("dispatched_at", -1).limit(limit))
    for log in logs:
        log["id"] = str(log["_id"])
        del log["_id"]
    return logs

# ─────────────────────────────────────────────
# 6. RESEND EMAIL FROM LOG HISTORY
# ─────────────────────────────────────────────
@router.post("/resend/{log_id}", response_model=dict)
async def resend_email(
    log_id: str,
    db=Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    """Re-send an email from an existing log ID."""
    from bson import ObjectId
    if not ObjectId.is_valid(log_id):
        raise HTTPException(status_code=400, detail="Invalid log ID format")

    log_entry = db.email_logs.find_one({"_id": ObjectId(log_id)})
    if not log_entry:
        raise HTTPException(status_code=404, detail="Email log record not found")

    recipient = log_entry.get("recipient_email")
    subject = log_entry.get("subject", "Resent Notification")
    body = log_entry.get("body", "")
    template_name = log_entry.get("template_name", "resend")

    success = await EmailService.send_email_async(
        recipient_email=recipient,
        subject=subject,
        html_body=body,
        template_name=template_name,
        db=db
    )
    return {
        "success": success,
        "message": f"Resent email to {recipient} ({'Success' if success else 'Failed'})"
    }

# ─────────────────────────────────────────────
# 7. SEND CUSTOM ADMIN ANNOUNCEMENT EMAIL
# ─────────────────────────────────────────────
@router.post("/custom-send", response_model=dict)
async def send_custom_announcement(
    payload: CustomEmailRequest,
    db=Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    """Dispatch custom admin broadcast or direct email."""
    if payload.broadcast_all_members:
        members = list(db.users.find({"role": "member"}, {"email": 1, "full_name": 1}))
        students = list(db.students.find({}, {"email": 1, "full_name": 1}))
        emails = set([m["email"] for m in members if m.get("email")] + [s["email"] for s in students if s.get("email")])
        count = 0
        for em in emails:
            await EmailService.send_custom_email(em, payload.subject, payload.message, db=db)
            count += 1
        return {"success": True, "message": f"Broadcast email dispatched to {count} library members!"}
    
    if not payload.recipient_email:
        raise HTTPException(status_code=400, detail="Recipient email required when not broadcasting")

    success = await EmailService.send_custom_email(payload.recipient_email, payload.subject, payload.message, db=db)
    return {"success": success, "message": f"Custom email sent to {payload.recipient_email}"}

# ─────────────────────────────────────────────
# 8. GET LIST OF TEMPLATES
# ─────────────────────────────────────────────
@router.get("/templates", response_model=list)
async def get_email_templates(current_admin=Depends(get_current_admin)):
    """Return available system HTML email templates."""
    return [
        {"id": "issue_confirmation", "name": "Book Issue Confirmation", "description": "Sent when a student borrows a book."},
        {"id": "return_confirmation", "name": "Book Return Confirmation", "description": "Sent when a borrowed book is returned."},
        {"id": "due_reminder", "name": "Due & Overdue Reminder", "description": "Sent prior to or after return deadline."},
        {"id": "fine_notice", "name": "Outstanding Fine Notice", "description": "Sent when a fine is assessed on an account."},
        {"id": "reservation_update", "name": "Reservation Status Update", "description": "Sent when book reservation changes state."},
        {"id": "welcome_email", "name": "Welcome Account Email", "description": "Sent to new registered users/students."},
        {"id": "password_reset", "name": "Password Reset OTP", "description": "Sent when password reset is requested."},
        {"id": "custom_admin", "name": "Custom Admin Announcement", "description": "Custom message created by librarian."}
    ]
