from datetime import datetime

def student_document(data: dict) -> dict:
    """Create MongoDB document from student data"""
    return {
        "student_id": data.get("student_id"),
        "full_name": data.get("full_name"),
        "email": data.get("email", "").lower(),
        "phone": data.get("phone", ""),
        "address": data.get("address", ""),
        "date_of_birth": str(data.get("date_of_birth")) if data.get("date_of_birth") else None,  # ← FIXED: Convert to string
        "gender": data.get("gender", ""),
        "course": data.get("course", ""),
        "semester": data.get("semester", 1),
        "year": data.get("year", 1),
        "department": data.get("department", ""),
        "library_card_id": data.get("library_card_id", ""),
        "is_active": data.get("is_active", True),
        "books_borrowed": data.get("books_borrowed", 0),
        "total_fines": data.get("total_fines", 0.0),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

def serialize_student(student: dict) -> dict:
    """Convert MongoDB document to dict with string id"""
    if student and "_id" in student:
        student["id"] = str(student["_id"])
        del student["_id"]
    return student

def serialize_students(students: list) -> list:
    """Convert list of MongoDB documents"""
    return [serialize_student(student) for student in students]