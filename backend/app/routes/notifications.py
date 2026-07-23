from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from typing import List, Optional
from pydantic import BaseModel, Field

from ..database import get_db
from ..core.security import get_current_user

router = APIRouter(prefix="/api/v1/notifications", tags=["Notifications"])

def serialize_notification(n) -> dict:
    return {
        "id": str(n["_id"]),
        "student_id": n["student_id"],
        "title": n["title"],
        "message": n["message"],
        "type": n["type"],
        "created_at": n["created_at"],
        "read": n["read"]
    }

# ============================================
# 1. LIST NOTIFICATIONS
# ============================================
@router.get("/", response_model=List[dict])
async def get_notifications(db=Depends(get_db), current_user=Depends(get_current_user)):
    is_admin = current_user.get("role") == "admin"
    query = {}
    
    if not is_admin:
        query["student_id"] = current_user.get("username")
        
    notifications = db.notifications.find(query).sort("created_at", -1)
    return [serialize_notification(n) for n in notifications]

# ============================================
# 2. MARK NOTIFICATION AS READ
# ============================================
@router.post("/read/{id}", response_model=dict)
async def mark_as_read(id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid notification ID")
        
    n = db.notifications.find_one({"_id": ObjectId(id)})
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    is_admin = current_user.get("role") == "admin"
    if not is_admin and n["student_id"] != current_user.get("username"):
        raise HTTPException(status_code=403, detail="Unauthorized")

    db.notifications.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"read": True}}
    )
    return {"message": "Notification marked as read."}

# ============================================
# 3. MARK ALL AS READ
# ============================================
@router.post("/read-all", response_model=dict)
async def mark_all_read(db=Depends(get_db), current_user=Depends(get_current_user)):
    is_admin = current_user.get("role") == "admin"
    query = {}
    if not is_admin:
        query["student_id"] = current_user.get("username")
        
    db.notifications.update_many(query, {"$set": {"read": True}})
    return {"message": "All notifications marked as read."}

# ============================================
# 4. DELETE NOTIFICATION
# ============================================
@router.delete("/{id}", response_model=dict)
async def delete_notification(id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid notification ID")
        
    n = db.notifications.find_one({"_id": ObjectId(id)})
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    is_admin = current_user.get("role") == "admin"
    if not is_admin and n["student_id"] != current_user.get("username"):
        raise HTTPException(status_code=403, detail="Unauthorized")

    db.notifications.delete_one({"_id": ObjectId(id)})
    return {"message": "Notification successfully deleted."}

# ============================================
# 5. GET NOTIFICATION PREFERENCES
# ============================================
@router.get("/settings", response_model=dict)
async def get_notification_settings(db=Depends(get_db), current_user=Depends(get_current_user)):
    """Retrieve user notification channel settings."""
    username = current_user.get("username")
    doc = db.notification_settings.find_one({"username": username})
    if not doc:
        # Default fallback
        return {
            "browser_enabled": True,
            "email_enabled": True,
            "sms_enabled": False,
            "types": {
                "due_reminders": True,
                "issue_alerts": True,
                "fine_alerts": True,
                "reservations": True
            }
        }
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc

# ============================================
# 6. UPDATE NOTIFICATION PREFERENCES
# ============================================
class NotificationSettingsPayload(BaseModel):
    browser_enabled: bool = True
    email_enabled: bool = True
    sms_enabled: bool = False
    types: dict = {
        "due_reminders": True,
        "issue_alerts": True,
        "fine_alerts": True,
        "reservations": True
    }

@router.post("/settings", response_model=dict)
async def update_notification_settings(
    payload: NotificationSettingsPayload,
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Save user notification channel preferences."""
    username = current_user.get("username")
    data = payload.dict()
    data["username"] = username
    db.notification_settings.update_one(
        {"username": username},
        {"$set": data},
        upsert=True
    )
    return {"message": "Notification settings updated successfully."}

# ============================================
# 7. CREATE SYSTEM NOTIFICATION (Admin Only)
# ============================================
class SystemNotificationPayload(BaseModel):
    title: str
    message: str
    target_student_id: Optional[str] = None  # None for broadcasting to all

@router.post("/create-system", response_model=dict)
async def create_system_notification(
    payload: SystemNotificationPayload,
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Publish a system-wide or user-targeted notification alert."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized admin action")
    
    from datetime import datetime
    
    if payload.target_student_id:
        # Target specific student
        new_notif = {
            "student_id": payload.target_student_id,
            "title": payload.title,
            "message": payload.message,
            "type": "system_broadcast",
            "created_at": datetime.utcnow(),
            "read": False
        }
        db.notifications.insert_one(new_notif)
    else:
        # Broadcast: Find all student user profiles
        students = list(db.students.find({}, {"student_id": 1}))
        new_notifs = []
        for s in students:
            sid = s.get("student_id")
            if sid:
                new_notifs.append({
                    "student_id": sid,
                    "title": payload.title,
                    "message": payload.message,
                    "type": "system_broadcast",
                    "created_at": datetime.utcnow(),
                    "read": False
                })
        if new_notifs:
            db.notifications.insert_many(new_notifs)

    return {"message": "Notification dispatched successfully."}

