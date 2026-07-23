from datetime import datetime
from ..core.security import security

def user_document(data: dict) -> dict:
    """Create MongoDB document from user data"""
    return {
        "email": data.get("email", "").lower(),
        "username": data.get("username", "").lower(),
        "password": data.get("password", ""),
        "full_name": data.get("full_name", ""),
        "role": data.get("role", "member"),
        "is_active": True,
        "login_attempts": 0,
        "locked_until": None,
        "last_login": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

def serialize_user(user: dict) -> dict:
    """Convert MongoDB document to dict with string id"""
    if user and "_id" in user:
        user["id"] = str(user["_id"])
        del user["_id"]
    # Remove password from response
    if "password" in user:
        del user["password"]
    return user

def serialize_users(users: list) -> list:
    """Convert list of MongoDB documents"""
    return [serialize_user(user) for user in users]