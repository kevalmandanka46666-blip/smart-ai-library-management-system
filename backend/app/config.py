import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    """Centralized settings for the application"""
    
    # ===== App Settings =====
    APP_NAME: str = os.getenv("APP_NAME", "Smart AI Library Management System")
    APP_VERSION: str = os.getenv("APP_VERSION", "1.0.0")
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"
    
    # ===== MongoDB Settings =====
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "library_db")
    
    # ===== JWT Settings =====
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-super-secret-key-change-this")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # ===== CORS Settings =====
    CORS_ORIGINS: list = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
    
    # ===== Security =====
    BCRYPT_ROUNDS: int = 12
    MAX_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_DURATION_MINUTES: int = 15

    # ===== SMTP Email Settings =====
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "noreply@smartlibrary.com")
    SMTP_FROM_NAME: str = os.getenv("SMTP_FROM_NAME", "Smart AI Library")
    SMTP_TLS: bool = os.getenv("SMTP_TLS", "True").lower() == "true"

    # ===== SMS Settings =====
    SMS_PROVIDER: str = os.getenv("SMS_PROVIDER", "")
    SMS_API_KEY: str = os.getenv("SMS_API_KEY", "")
    SMS_API_SECRET: str = os.getenv("SMS_API_SECRET", "")
    SMS_SENDER_ID: str = os.getenv("SMS_SENDER_ID", "SMARTLIB")

settings = Settings()