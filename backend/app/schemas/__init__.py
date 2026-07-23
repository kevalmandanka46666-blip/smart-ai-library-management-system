from .book import BookCreate, BookUpdate, BookResponse
from .auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse
from .student import StudentCreate, StudentUpdate, StudentResponse

# Export all schemas
__all__ = [
    "BookCreate",
    "BookUpdate",
    "BookResponse",
    "RegisterRequest",
    "LoginRequest",
    "TokenResponse",
    "UserResponse",
    "StudentCreate",
    "StudentUpdate",
    "StudentResponse"
]