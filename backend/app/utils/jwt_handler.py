from ..core.security import security

def create_tokens(user_id: str, email: str):
    """Create access and refresh tokens for user"""
    data = {"sub": user_id, "email": email}
    return {
        "access_token": security.create_access_token(data.copy()),
        "refresh_token": security.create_refresh_token(data.copy()),
        "token_type": "bearer"
    }

def verify_token(token: str):
    """Verify and decode JWT token"""
    return security.decode_token(token)

def get_user_id_from_token(token: str) -> str:
    """Extract user ID from token"""
    payload = security.decode_token(token)
    return payload.get("sub")