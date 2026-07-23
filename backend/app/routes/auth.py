from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime
from ..database import get_db
from ..models.user_model import user_document, serialize_user
from ..core.security import security
from ..schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse, ForgotPasswordRequest, VerifyOTPRequest, ResetPasswordRequest
from ..utils.jwt_handler import create_tokens

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

# ============================================
# 1. REGISTER - Create New User
# ============================================
@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest, db=Depends(get_db)):
    """
    Register a new user.
    """
    collection = db.users
    
    # Check if email exists
    if collection.find_one({"email": request.email.lower()}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if username exists
    if collection.find_one({"username": request.username.lower()}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Create user
    user_data = request.dict()
    user_data["password"] = security.hash_password(user_data["password"])
    new_user = user_document(user_data)
    
    result = collection.insert_one(new_user)
    created_user = collection.find_one({"_id": result.inserted_id})

    # Auto-create student profile if role is member
    if created_user.get("role") == "member":
        try:
            from ..models.student import student_document
            student_profile = {
                "student_id": created_user["username"],
                "full_name": created_user.get("full_name") or created_user["username"],
                "email": created_user["email"],
            }
            db.students.insert_one(student_document(student_profile))
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to auto-create student record: {e}")

    # Dispatch Welcome Email
    try:
        from ..services.email_service import EmailService
        await EmailService.send_welcome_email(
            recipient_email=created_user["email"],
            user_name=created_user.get("full_name") or created_user["username"],
            username=created_user["username"],
            user_role=created_user.get("role", "member"),
            db=db
        )
    except Exception as email_err:
        import logging
        logging.getLogger(__name__).warning(f"Welcome email trigger warning: {email_err}")

    return {
        "message": "User registered successfully",
        "user": serialize_user(created_user)
    }

# ============================================
# 2. LOGIN - Authenticate User
# ============================================
@router.post("/login", response_model=dict)
async def login(request: LoginRequest, db=Depends(get_db)):
    """
    Login user and return tokens.
    """
    collection = db.users
    
    # Find user by email
    user = collection.find_one({"email": request.email.lower()})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Check if account is locked
    if user.get("locked_until"):
        if user["locked_until"] > datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is temporarily locked"
            )
        else:
            # Lockout period expired - unlock account automatically
            collection.update_one(
                {"_id": user["_id"]},
                {"$set": {"login_attempts": 0, "locked_until": None}}
            )
            # Fetch updated user state to continue validation
            user = collection.find_one({"_id": user["_id"]})
    
    # Verify password
    if not security.verify_password(request.password, user.get("password", "")):
        # Update failed attempts
        attempts = user.get("login_attempts", 0) + 1
        update_data = {"login_attempts": attempts}
        
        # Lock if max attempts exceeded
        from datetime import timedelta
        if attempts >= 5:
            update_data["locked_until"] = datetime.utcnow() + timedelta(minutes=15)
        
        collection.update_one({"_id": user["_id"]}, {"$set": update_data})
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Reset login attempts on success
    collection.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "login_attempts": 0,
            "locked_until": None,
            "last_login": datetime.utcnow()
        }}
    )

    from ..utils.audit import record_audit_log
    record_audit_log(db, user, "LOGIN", "Auth System", f"User logged in from IP")
    
    # Create tokens
    tokens = create_tokens(str(user["_id"]), user["email"])
    
    return {
        **tokens,
        "user": {
            "id": str(user["_id"]),
            "email": user["email"],
            "username": user.get("username"),
            "full_name": user.get("full_name"),
            "role": user.get("role", "member")
        }
    }

from ..schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse, ForgotPasswordRequest, VerifyOTPRequest, ResetPasswordRequest, RefreshTokenRequest

# ============================================
# 3. REFRESH TOKEN - Get New Access Token
# ============================================
@router.post("/refresh", response_model=dict)
async def refresh_token(request: RefreshTokenRequest, db=Depends(get_db)):
    """
    Refresh access token using refresh token.
    """
    try:
        payload = security.decode_token(request.refresh_token)
        
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        
        user_id = payload.get("sub")
        collection = db.users
        from bson import ObjectId
        user = collection.find_one({"_id": ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id})
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        tokens = create_tokens(str(user["_id"]), user["email"])
        return tokens
        
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )

# ============================================
# 4. FORGOT PASSWORD - Generate OTP
# ============================================
@router.post("/forgot-password", response_model=dict)
async def forgot_password(request: ForgotPasswordRequest, db=Depends(get_db)):
    import random
    from datetime import timedelta
    collection = db.users
    user = collection.find_one({"email": request.email.lower()})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User with this email does not exist"
        )
    
    otp = str(random.randint(100000, 999999))
    expiry = datetime.utcnow() + timedelta(minutes=10)
    
    collection.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "reset_otp": otp,
            "otp_expiry": expiry
        }}
    )
    
    # Dispatch Password Reset OTP Email
    try:
        from ..services.email_service import EmailService
        await EmailService.send_password_reset_email(
            recipient_email=user["email"],
            user_name=user.get("full_name") or user.get("username", "User"),
            otp_code=otp,
            db=db
        )
    except Exception as email_err:
        import logging
        logging.getLogger(__name__).warning(f"Password reset email warning: {email_err}")

    print(f"🔑 PASSWORD RESET OTP FOR {request.email.lower()}: {otp}")
    
    return {
        "message": "Verification code sent to your email",
        "otp": otp # Return for simple frontend demo usage
    }

# ============================================
# 5. VERIFY OTP
# ============================================
@router.post("/verify-otp", response_model=dict)
async def verify_otp(request: VerifyOTPRequest, db=Depends(get_db)):
    collection = db.users
    user = collection.find_one({"email": request.email.lower()})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    db_otp = user.get("reset_otp")
    db_expiry = user.get("otp_expiry")
    
    if not db_otp or db_otp != request.otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code"
        )
        
    if db_expiry and db_expiry < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired"
        )
        
    return {
        "message": "Verification code verified successfully"
    }

# ============================================
# 6. RESET PASSWORD
# ============================================
@router.post("/reset-password", response_model=dict)
async def reset_password(request: ResetPasswordRequest, db=Depends(get_db)):
    collection = db.users
    user = collection.find_one({"email": request.email.lower()})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
        
    db_otp = user.get("reset_otp")
    db_expiry = user.get("otp_expiry")
    
    if not db_otp or db_otp != request.otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or missing verification code"
        )
        
    if db_expiry and db_expiry < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired"
        )
        
    # Reset password
    hashed = security.hash_password(request.password)
    collection.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "password": hashed,
            "reset_otp": None,
            "otp_expiry": None,
            "login_attempts": 0,
            "locked_until": None
        }}
    )
    
    return {
        "message": "Password has been reset successfully"
    }