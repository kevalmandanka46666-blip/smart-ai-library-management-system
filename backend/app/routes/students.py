from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile
from bson import ObjectId
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..models.student import student_document, serialize_student, serialize_students
from ..schemas.student import StudentCreate, StudentUpdate, StudentResponse
from ..core.security import get_current_user, get_current_admin

router = APIRouter(prefix="/api/v1/students", tags=["Students"])

# ============================================
# 1. CREATE STUDENT - Add New Student (Admin Only)
# ============================================
@router.post("/", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
async def create_student(
    student: StudentCreate, 
    db=Depends(get_db), 
    current_admin=Depends(get_current_admin)
):
    """
    Add a new student to the library system.
    - Checks if student_id or email already exists
    - Creates new student entry
    """
    collection = db.students
    
    # Check if student_id exists
    existing = collection.find_one({"student_id": student.student_id})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Student with ID {student.student_id} already exists"
        )
    
    # Check if email exists
    existing_email = collection.find_one({"email": student.email.lower()})
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Student with email {student.email} already exists"
        )
    
    # Create new student
    new_student = student_document(student.dict())
    result = collection.insert_one(new_student)
    
    inserted_student = collection.find_one({"_id": result.inserted_id})
    return serialize_student(inserted_student)

# ============================================
# 2. GET ALL STUDENTS - View All Students (Admin Only)
# ============================================
@router.get("/", response_model=List[StudentResponse])
async def get_all_students(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db=Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    """
    Get all students with pagination.
    """
    students = db.students.find().skip(skip).limit(limit)
    return serialize_students(list(students))

# ============================================
# 3. GET STUDENT DETAILS - View Single Student (Registered Users)
# ============================================
@router.get("/{student_id}", response_model=StudentResponse)
async def get_student(
    student_id: str, 
    db=Depends(get_db), 
    current_user=Depends(get_current_user)
):
    """
    Get detailed information about a specific student.
    """
    collection = db.students
    
    # Check if student_id is ObjectId or custom student_id
    student = None
    if ObjectId.is_valid(student_id):
        student = collection.find_one({"_id": ObjectId(student_id)})
    else:
        student = collection.find_one({"student_id": student_id})
    
    # Auto-create if not found and is their own username/email
    if not student and (student_id == current_user.get("username") or student_id == current_user.get("email")):
        student_profile = {
            "student_id": current_user["username"],
            "full_name": current_user.get("full_name") or current_user["username"],
            "email": current_user["email"],
        }
        collection.insert_one(student_document(student_profile))
        student = collection.find_one({"student_id": current_user["username"]})
    
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID {student_id} not found"
        )
        
    # Enforce authorization: Non-admins can only view their own student details
    if current_user.get("role") != "admin":
        if student.get("student_id") != current_user.get("username") and student.get("email", "").lower() != current_user.get("email", "").lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You can only view your own profile."
            )
    
    return serialize_student(student)

# ============================================
# 4. UPDATE STUDENT - Update Student Details
# ============================================
@router.put("/{student_id}", response_model=StudentResponse)
async def update_student(
    student_id: str,
    student_update: StudentUpdate,
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Update student details.
    - Partial updates allowed
    - Validates student_id and email uniqueness if changed
    """
    collection = db.students
    
    # Find student
    if ObjectId.is_valid(student_id):
        student = collection.find_one({"_id": ObjectId(student_id)})
    else:
        student = collection.find_one({"student_id": student_id})
    
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID {student_id} not found"
        )
        
    # Enforce authorization: Non-admins can only update their own student details
    if current_user.get("role") != "admin":
        if student.get("student_id") != current_user.get("username") and student.get("email", "").lower() != current_user.get("email", "").lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You can only update your own profile."
            )
    
    update_data = student_update.dict(exclude_unset=True)
    
    # If not admin, restrict fields they can update
    if current_user.get("role") != "admin":
        update_data.pop("is_active", None)
    
    # Check student_id uniqueness if being updated
    if "student_id" in update_data and update_data["student_id"] != student.get("student_id"):
        if current_user.get("role") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can modify student IDs"
            )
        existing = collection.find_one({"student_id": update_data["student_id"]})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Student ID {update_data['student_id']} already exists"
            )
    
    # Check email uniqueness if being updated
    if "email" in update_data and update_data["email"].lower() != student.get("email", "").lower():
        existing = collection.find_one({"email": update_data["email"].lower()})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email {update_data['email']} already exists"
            )
    
    # Add updated_at timestamp
    update_data["updated_at"] = datetime.utcnow()
    
    # Update in MongoDB
    if ObjectId.is_valid(student_id):
        result = collection.update_one(
            {"_id": ObjectId(student_id)},
            {"$set": update_data}
        )
        updated_student = collection.find_one({"_id": ObjectId(student_id)})
    else:
        result = collection.update_one(
            {"student_id": student_id},
            {"$set": update_data}
        )
        updated_student = collection.find_one({"student_id": student_id})
    
    return serialize_student(updated_student)

# ============================================
# 5. DELETE STUDENT - Delete Student (Admin Only)
# ============================================
@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_student(
    student_id: str, 
    db=Depends(get_db), 
    current_admin=Depends(get_current_admin)
):
    """
    Delete a student from the library system.
    """
    collection = db.students
    
    # Find and delete
    if ObjectId.is_valid(student_id):
        result = collection.delete_one({"_id": ObjectId(student_id)})
    else:
        result = collection.delete_one({"student_id": student_id})
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID {student_id} not found"
        )
    
    return None

# ============================================
# 6. SEARCH STUDENTS - Advanced Search (Admin Only)
# ============================================
@router.get("/search/", response_model=List[StudentResponse])
async def search_students(
    query: str = Query(None, min_length=1),
    course: str = Query(None, min_length=1),
    department: str = Query(None, min_length=1),
    semester: int = Query(None, ge=1, le=12),
    is_active: bool = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db=Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    """
    Search students by name, ID, email, course, department, semester.
    """
    collection = db.students
    
    search_filter = {}
    
    if query:
        search_filter["$or"] = [
            {"full_name": {"$regex": query, "$options": "i"}},
            {"student_id": {"$regex": query, "$options": "i"}},
            {"email": {"$regex": query, "$options": "i"}},
            {"phone": {"$regex": query, "$options": "i"}}
        ]
    
    if course:
        search_filter["course"] = {"$regex": course, "$options": "i"}
    
    if department:
        search_filter["department"] = {"$regex": department, "$options": "i"}
    
    if semester is not None:
        search_filter["semester"] = semester
    
    if is_active is not None:
        search_filter["is_active"] = is_active
    
    students = collection.find(search_filter).skip(skip).limit(limit)
    return serialize_students(list(students))

# ============================================
# 7. GET STUDENT STATISTICS (Admin Only)
# ============================================
@router.get("/stats/")
async def get_student_stats(db=Depends(get_db), current_admin=Depends(get_current_admin)):
    """
    Get student statistics.
    """
    # Single aggregation for all stats
    pipeline = [
        {"$facet": {
            "total": [{"$count": "n"}],
            "active": [{"$match": {"is_active": True}}, {"$count": "n"}],
            "by_course": [
                {"$group": {"_id": {"$ifNull": ["$course", "Not Assigned"]}, "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}
            ],
            "by_department": [
                {"$group": {"_id": {"$ifNull": ["$department", "Not Assigned"]}, "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}
            ]
        }}
    ]
    result = list(db.students.aggregate(pipeline))
    r = result[0] if result else {}
    total = r.get("total", [{}])[0].get("n", 0) if r.get("total") else 0
    active = r.get("active", [{}])[0].get("n", 0) if r.get("active") else 0
    
    return {
        "total_students": total,
        "active_students": active,
        "inactive_students": total - active,
        "by_course": [
            {"course": item["_id"], "count": item["count"]}
            for item in r.get("by_course", [])
        ],
        "by_department": [
            {"department": item["_id"], "count": item["count"]}
            for item in r.get("by_department", [])
        ]
    }

# ============================================
# 8. BULK DELETE STUDENTS (Admin Only)
# ============================================
@router.post("/bulk-delete/")
async def bulk_delete_students(
    payload: dict,
    db=Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    """
    Delete multiple students by IDs.
    Expects: { "student_ids": ["id1", "id2", ...] }
    """
    student_ids = payload.get("student_ids", [])
    if not student_ids or not isinstance(student_ids, list):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="student_ids must be a non-empty list"
        )

    object_ids = []
    custom_ids = []
    for sid in student_ids:
        if ObjectId.is_valid(sid):
            object_ids.append(ObjectId(sid))
        else:
            custom_ids.append(sid)

    result = db.students.delete_many({
        "$or": [
            {"_id": {"$in": object_ids}},
            {"student_id": {"$in": custom_ids}}
        ]
    })
    return {
        "message": f"Successfully deleted {result.deleted_count} student(s)",
        "deleted_count": result.deleted_count
    }

# ============================================
# 9. EXPORT STUDENTS CSV (Admin Only)
# ============================================
@router.get("/export/csv")
async def export_students_csv(db=Depends(get_db), current_admin=Depends(get_current_admin)):
    """
    Export all students as CSV download.
    """
    import csv
    import io
    from fastapi.responses import StreamingResponse

    collection = db.students
    students = list(collection.find().sort("full_name", 1))

    output = io.StringIO()
    fieldnames = [
        "student_id", "full_name", "email", "phone", "course",
        "department", "semester", "is_active", "books_borrowed"
    ]
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()

    for s in students:
        row = {k: s.get(k, "") for k in fieldnames}
        writer.writerow(row)

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=library_students_export.csv"}
    )

# ============================================
# 10. IMPORT STUDENTS CSV (Admin Only)
# ============================================
@router.post("/import/csv")
async def import_students_csv(
    file: UploadFile,
    db=Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    """
    Import students from a CSV file.
    """
    import csv
    import io

    if not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are accepted"
        )

    contents = await file.read()
    try:
        decoded = contents.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be UTF-8 encoded"
        )

    reader = csv.DictReader(io.StringIO(decoded))
    collection = db.students

    imported = 0
    skipped = 0
    errors = []

    for i, row in enumerate(reader, start=2):
        student_id = row.get("student_id", "").strip()
        full_name = row.get("full_name", "").strip()
        email = row.get("email", "").strip()

        if not student_id or not full_name or not email:
            skipped += 1
            errors.append(f"Row {i}: Missing required fields (student_id, full_name, email)")
            continue

        if collection.find_one({"student_id": student_id}):
            skipped += 1
            errors.append(f"Row {i}: Student ID {student_id} already exists")
            continue

        if collection.find_one({"email": email.lower()}):
            skipped += 1
            errors.append(f"Row {i}: Email {email} already registered")
            continue

        try:
            semester = int(row.get("semester", 1) or 1)
        except (ValueError, TypeError):
            semester = 1

        try:
            books_borrowed = int(row.get("books_borrowed", 0) or 0)
        except (ValueError, TypeError):
            books_borrowed = 0

        is_active_val = row.get("is_active", "true").lower() in ("true", "1", "yes")

        new_student = student_document({
            "student_id": student_id,
            "full_name": full_name,
            "email": email,
            "phone": row.get("phone", "").strip(),
            "course": row.get("course", "").strip(),
            "department": row.get("department", "").strip(),
            "semester": semester,
            "is_active": is_active_val,
            "books_borrowed": books_borrowed
        })
        collection.insert_one(new_student)
        imported += 1

    return {
        "message": f"Import complete: {imported} added, {skipped} skipped",
        "imported": imported,
        "skipped": skipped,
        "errors": errors[:20]
    }