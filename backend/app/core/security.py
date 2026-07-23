from datetime import datetime, timedelta
from typing import Optional, Dict
import bcrypt
import jwt
import re
import logging
from fastapi import HTTPException, status, Header, Depends, Request

from ..config import settings

# Structured Audit Logger
logging.basicConfig(level=logging.INFO)
audit_logger = logging.getLogger("security_audit")

class Security:
    """Centralized security utilities"""

    @staticmethod
    def hash_password(password: str) -> str:
        """Hash password using bcrypt"""
        salt = bcrypt.gensalt(rounds=settings.BCRYPT_ROUNDS)
        return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify plain password against hashed password"""
        return bcrypt.checkpw(
            plain_password.encode("utf-8"), hashed_password.encode("utf-8")
        )

    @staticmethod
    def create_access_token(
        data: Dict, expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + (
            expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        to_encode.update({"exp": expire, "type": "access"})
        return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    @staticmethod
    def create_refresh_token(data: Dict) -> str:
        """Create JWT refresh token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode.update({"exp": expire, "type": "refresh"})
        return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    @staticmethod
    def decode_token(token: str) -> Dict:
        """Decode and verify JWT token securely"""
        try:
            payload = jwt.decode(
                token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
            )
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token signature has expired"
            )
        except jwt.PyJWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authorization token payload"
            )

    @staticmethod
    def validate_password_strength(password: str) -> bool:
        """
        Validate password against strong security policy:
        - At least 8 characters
        - Contains at least 1 uppercase letter
        - Contains at least 1 lowercase letter
        - Contains at least 1 digit
        - Contains at least 1 special character (@$!%*?&_#-)
        """
        if len(password) < 8:
            return False
        if not re.search(r"[A-Z]", password):
            return False
        if not re.search(r"[a-z]", password):
            return False
        if not re.search(r"[0-9]", password):
            return False
        if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>/?]", password):
            return False
        return True

    @staticmethod
    def validate_email_format(email: str) -> bool:
        """Strict email validation regex pattern matching"""
        pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        return bool(re.match(pattern, email))

    @staticmethod
    def validate_isbn_format(isbn: str) -> bool:
        """Validate ISBN standard format length (10 or 13 chars)"""
        clean_isbn = re.sub(r'[-\s]', '', isbn)
        return len(clean_isbn) in (10, 13)

    @staticmethod
    def audit_log(action: str, status_msg: str, user_identifier: str, client_ip: str):
        """Standardized security activity logger"""
        audit_logger.info(
            f"[AUDIT LOG] Timestamp: {datetime.utcnow().isoformat()} | "
            f"Action: {action} | Status: {status_msg} | User: {user_identifier} | IP: {client_ip}"
        )


security = Security()

async def get_current_user(request: Request, authorization: Optional[str] = Header(None)):
    from ..database import get_db
    from bson import ObjectId
    
    client_ip = request.client.host if request.client else "unknown"

    if not authorization or not authorization.startswith("Bearer "):
        Security.audit_log("USER_AUTHENTICATION", "MISSING_HEADER", "anonymous", client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authentication token"
        )
    
    token = authorization.split(" ")[1]
    payload = security.decode_token(token)
    user_id = payload.get("sub")
    
    if not user_id:
        Security.audit_log("USER_AUTHENTICATION", "INVALID_SUB", "anonymous", client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token payload"
        )
    
    db = get_db()
    collection = db.users
    # Projection: only fetch fields needed by route handlers
    user_proj = {
        "_id": 1, "username": 1, "email": 1, "role": 1,
        "full_name": 1, "is_active": 1, "permissions": 1
    }
    user = None
    if ObjectId.is_valid(user_id):
        user = collection.find_one({"_id": ObjectId(user_id)}, user_proj)
    if not user:
        email = payload.get("email")
        if email:
            user = collection.find_one({"email": email}, user_proj)
            
    if not user:
        Security.audit_log("USER_AUTHENTICATION", "USER_NOT_FOUND", str(user_id), client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found in data store"
        )
        
    return user

async def get_current_admin(request: Request, user = Depends(get_current_user)):
    client_ip = request.client.host if request.client else "unknown"
    user_id = str(user.get("_id", "unknown"))
    
    if user.get("role") != "admin":
        Security.audit_log("ADMIN_AUTHORIZATION", "ACCESS_DENIED", user_id, client_ip)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions. Admin privileges required."
        )
        
    Security.audit_log("ADMIN_AUTHORIZATION", "ACCESS_GRANTED", user_id, client_ip)
    return user
