from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from ..core.security import security

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    username: str = Field(..., min_length=3, max_length=50)
    full_name: Optional[str] = None
    role: str = "member"

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not security.validate_password_strength(v):
            raise ValueError(
                "Password must be at least 8 characters long and contain at least one uppercase letter, "
                "one lowercase letter, one number, and one special character."
            )
        return v

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    full_name: Optional[str]
    role: str
    is_active: bool
    
    class Config:
        from_attributes = True

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    password: str = Field(..., min_length=8)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not security.validate_password_strength(v):
            raise ValueError(
                "Password must be at least 8 characters long and contain at least one uppercase letter, "
                "one lowercase letter, one number, and one special character."
            )
        return v