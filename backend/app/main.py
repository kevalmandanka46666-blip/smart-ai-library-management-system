from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import db
from .config import settings
from .routes import (
    books_router,
    auth_router,
    students_router,
    borrows_router,
    authors_router,
    categories_router,
    reservations_router,
    fines_router,
    notifications_router,
    analytics_router,
    search_router,
    profile_admin_router,
    settings_router,
    audit_router,
    backup_router,
    email_router,
    barcodes_router,
    sms_router
)
from .core.security_middleware import SecurityHeadersMiddleware, RateLimiterMiddleware
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize MongoDB (indexes are created inside Database._create_indexes)
    logger.info("🚀 Starting application via lifespan...")
    try:
        db.connect()
        logger.info(f"✅ Connected to database: {settings.DATABASE_NAME}")
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
    
    yield
    
    # Shutdown: Close resources
    logger.info("🛑 Shutting down application via lifespan...")
    db.close()

# Create FastAPI instance
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None
)

# Security Middlewares
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimiterMiddleware, auth_limit=10, general_limit=120, window_seconds=60)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import Request

@app.middleware("http")
async def add_trailing_slash_internally(request: Request, call_next):
    path = request.url.path
    if path in (
        "/api/v1/books",
        "/api/v1/students",
        "/api/v1/authors",
        "/api/v1/categories",
        "/api/v1/reservations",
        "/api/v1/fines",
        "/api/v1/notifications",
        "/api/v1/analytics",
        "/api/v1/search",
        "/api/v1/barcodes",
        "/api/v1/sms"
    ):
        request.scope["path"] = path + "/"
    response = await call_next(request)
    return response

from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"🚨 Unhandled exception: {exc}", exc_info=True)
    if settings.DEBUG:
        return JSONResponse(
            status_code=500,
            content={"detail": str(exc), "type": type(exc).__name__}
        )
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please contact the administrator."}
    )

# ===== Register Routes =====
app.include_router(books_router)
app.include_router(auth_router)
app.include_router(students_router)
app.include_router(borrows_router)
app.include_router(authors_router)
app.include_router(categories_router)
app.include_router(reservations_router)
app.include_router(fines_router)
app.include_router(notifications_router)
app.include_router(analytics_router)
app.include_router(search_router)
app.include_router(profile_admin_router)
app.include_router(settings_router)
app.include_router(audit_router)
app.include_router(backup_router)
app.include_router(email_router)
app.include_router(barcodes_router)
app.include_router(sms_router)

# ===== Root Endpoint =====
@app.get("/")
async def root():
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "version": settings.APP_VERSION,
        "status": "running",
        "database": "MongoDB"
    }

# ===== Health Check =====
@app.get("/health")
async def health_check():
    try:
        db.connect()
        return {
            "status": "healthy",
            "database": "connected",
            "message": "All systems operational"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )