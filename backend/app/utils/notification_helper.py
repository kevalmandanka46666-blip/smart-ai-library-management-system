from datetime import datetime
import logging

logger = logging.getLogger("app.notifications")

async def create_notification(db, student_id: str, title: str, message: str, n_type: str):
    """
    Helper to create an in-app notification and trigger an email dispatch simulation.
    """
    # 1. Insert in-app notification record
    notif = {
        "student_id": student_id,
        "title": title,
        "message": message,
        "type": n_type,
        "created_at": datetime.utcnow(),
        "read": False
    }
    db.notifications.insert_one(notif)
    logger.info(f"🔔 In-app notification created: [{n_type}] to student {student_id} - '{title}'")
    
    # 2. Lookup recipient email
    email = None
    if student_id == "admin":
        email = "admin@library.com"
    else:
        student = db.students.find_one({"student_id": student_id})
        if student:
            email = student.get("email")
            
    # 3. Simulate email transmission
    if email:
        logger.info(f"📧 [Email Dispatch Simulation] Sending to: {email} | Subject: {title} | Body: {message}")
        print(f"\n[EMAIL SENT] To: {email} | Subject: {title} | Body: {message}\n")
