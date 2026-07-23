from .book import book_document, serialize_book, serialize_books
from .user_model import user_document, serialize_user, serialize_users
from .student import student_document, serialize_student, serialize_students

# Export all models
__all__ = [
    "book_document",
    "serialize_book",
    "serialize_books",
    "user_document",
    "serialize_user",
    "serialize_users",
    "student_document",
    "serialize_student",
    "serialize_students"
]