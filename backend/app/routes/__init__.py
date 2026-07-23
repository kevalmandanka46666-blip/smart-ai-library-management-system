from .books import router as books_router
from .auth import router as auth_router
from .students import router as students_router
from .borrows import router as borrows_router
from .authors import router as authors_router
from .categories import router as categories_router
from .reservations import router as reservations_router
from .fines import router as fines_router
from .notifications import router as notifications_router
from .analytics import router as analytics_router
from .search import router as search_router
from .profile_admin import router as profile_admin_router
from .settings_route import router as settings_router
from .audit_route import router as audit_router
from .backup_route import router as backup_router
from .email_route import router as email_router
from .barcodes import router as barcodes_router
from .sms_route import router as sms_router

# Export all routers
__all__ = [
    "books_router",
    "auth_router",
    "students_router",
    "borrows_router",
    "authors_router",
    "categories_router",
    "reservations_router",
    "fines_router",
    "notifications_router",
    "analytics_router",
    "search_router",
    "profile_admin_router",
    "settings_router",
    "audit_router",
    "backup_router",
    "email_router",
    "barcodes_router",
    "sms_router"
]