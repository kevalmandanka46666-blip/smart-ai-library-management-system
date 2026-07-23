from datetime import datetime
from typing import Optional

def record_audit_log(
    db,
    user: Optional[dict] = None,
    action: str = "ACTION",
    resource: str = "General",
    details: str = "",
    username: str = "System"
):
    """
    Centralized Audit Logger for MongoDB.
    Logs: Action category (LOGIN, CRUD, ISSUE_RETURN, SETTINGS, etc.), user details, resource, and timestamp.
    """
    try:
        user_id = ""
        u_name = username
        role = "system"

        if user:
            user_id = str(user.get("_id") or user.get("id") or user.get("user_id") or "")
            u_name = user.get("username") or user.get("email") or user.get("full_name") or username
            role = user.get("role") or "user"

        db.audit_logs.insert_one({
            "user_id": user_id,
            "username": u_name,
            "role": role,
            "action": action.upper(),
            "resource": resource,
            "details": details,
            "timestamp": datetime.utcnow()
        })
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Failed to record audit log: {e}")
