import io
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from bson import ObjectId

import barcode
from barcode.writer import ImageWriter
import qrcode

from ..database import get_db
from ..models.book import serialize_book, serialize_books
from ..core.security import get_current_user, get_current_admin

router = APIRouter(prefix="/api/v1/barcodes", tags=["Barcodes & QR"])

class CodeValidationRequest(BaseModel):
    code_type: str = Field(..., description="'barcode' or 'qr'")
    value: str = Field(..., min_length=1)
    exclude_book_id: Optional[str] = None

class BulkGenerateRequest(BaseModel):
    force_regenerate: bool = False

class ScanIssueReturnRequest(BaseModel):
    scanned_code: str = Field(..., min_length=1)
    student_id: str = Field(..., min_length=1)
    due_days: Optional[int] = Field(14, ge=1, le=90)

class ScanReturnRequest(BaseModel):
    scanned_code: str = Field(..., min_length=1)

# ============================================
# 1. RENDER BARCODE PNG
# ============================================
@router.get("/render/barcode/{code_value}")
async def render_barcode(code_value: str):
    """
    Renders Code128 / Code39 Barcode as a PNG image stream.
    """
    try:
        CODE128 = barcode.get_barcode_class('code128')
        rv = io.BytesIO()
        code_obj = CODE128(code_value, writer=ImageWriter())
        code_obj.write(rv, options={"module_height": 15.0, "font_size": 10, "text_distance": 5.0, "quiet_zone": 3.0})
        rv.seek(0)
        return StreamingResponse(rv, media_type="image/png")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to generate barcode image: {str(e)}"
        )

# ============================================
# 2. RENDER QR CODE PNG
# ============================================
@router.get("/render/qr/{code_value}")
async def render_qr(code_value: str):
    """
    Renders QR Code as a PNG image stream.
    """
    try:
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=3,
        )
        qr.add_data(code_value)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        rv = io.BytesIO()
        img.save(rv, format="PNG")
        rv.seek(0)
        return StreamingResponse(rv, media_type="image/png")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to generate QR code image: {str(e)}"
        )

# ============================================
# 3. SEARCH BOOK BY BARCODE OR QR
# ============================================
@router.get("/search")
async def search_book_by_code(
    code: str = Query(..., min_length=1),
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Find book by exact barcode_value or qr_value or ISBN fallback.
    """
    collection = db.books
    book = collection.find_one({
        "$or": [
            {"barcode_value": code},
            {"qr_value": code},
            {"isbn": code}
        ]
    })
    
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No book found matching scanned code: '{code}'"
        )
        
    return serialize_book(book)

# ============================================
# 4. VALIDATE DUPLICATE CODES
# ============================================
@router.post("/validate-code")
async def validate_code(
    payload: CodeValidationRequest,
    db=Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    """
    Check if a barcode_value or qr_value is unique across MongoDB.
    """
    collection = db.books
    field_name = "barcode_value" if payload.code_type == "barcode" else "qr_value"
    
    query = {field_name: payload.value}
    if payload.exclude_book_id and ObjectId.is_valid(payload.exclude_book_id):
        query["_id"] = {"$ne": ObjectId(payload.exclude_book_id)}
        
    existing = collection.find_one(query)
    if existing:
        return {
            "valid": False,
            "message": f"{payload.code_type.capitalize()} '{payload.value}' is already assigned to book '{existing.get('title')}'",
            "existing_book_id": str(existing["_id"])
        }
    
    return {"valid": True, "message": "Code is unique and available"}

# ============================================
# 5. BULK BARCODE & QR GENERATION
# ============================================
@router.post("/bulk-generate")
async def bulk_generate(
    payload: BulkGenerateRequest,
    db=Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    """
    Generates missing Barcode & QR codes for all books in the database.
    """
    import uuid
    collection = db.books
    query = {} if payload.force_regenerate else {
        "$or": [
            {"barcode_value": {"$exists": False}},
            {"barcode_value": None},
            {"barcode_value": ""},
            {"qr_value": {"$exists": False}},
            {"qr_value": None},
            {"qr_value": ""}
        ]
    }
    
    books = list(collection.find(query))
    updated_count = 0
    
    for book in books:
        isbn = book.get("isbn", "")
        clean_isbn = "".join(filter(str.isalnum, isbn)) if isbn else ""
        
        barcode_val = book.get("barcode_value")
        if not barcode_val or payload.force_regenerate:
            suffix = clean_isbn if clean_isbn else uuid.uuid4().hex[:8].upper()
            barcode_val = f"LIB-{suffix}"
            
        qr_val = book.get("qr_value")
        if not qr_val or payload.force_regenerate:
            qr_val = f"QR-{barcode_val}"
            
        collection.update_one(
            {"_id": book["_id"]},
            {"$set": {
                "barcode_value": barcode_val,
                "qr_value": qr_val,
                "updated_at": datetime.utcnow()
            }}
        )
        updated_count += 1
        
    return {
        "success": True,
        "processed_books": len(books),
        "updated_books": updated_count,
        "message": f"Successfully generated codes for {updated_count} books."
    }

# ============================================
# 6. ISSUE BOOK USING SCAN
# ============================================
@router.post("/scan-issue")
async def scan_issue_book(
    payload: ScanIssueReturnRequest,
    db=Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    """
    Issue a book directly using scanned Barcode/QR code and student ID.
    """
    books_col = db.books
    students_col = db.students
    borrows_col = db.borrows

    book = books_col.find_one({
        "$or": [
            {"barcode_value": payload.scanned_code},
            {"qr_value": payload.scanned_code},
            {"isbn": payload.scanned_code}
        ]
    })
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book not found for code: {payload.scanned_code}"
        )

    if book.get("available_copies", 0) <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No copies available for book '{book.get('title')}'"
        )

    student = students_col.find_one({
        "$or": [
            {"student_id": payload.student_id},
            {"email": payload.student_id}
        ]
    })
    if not student and ObjectId.is_valid(payload.student_id):
        student = students_col.find_one({"_id": ObjectId(payload.student_id)})
            
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student not found with ID/Email: {payload.student_id}"
        )

    from datetime import datetime, timedelta
    issue_date = datetime.utcnow()
    due_date = issue_date + timedelta(days=payload.due_days)

    borrow_doc = {
        "book_id": str(book["_id"]),
        "book_title": book.get("title"),
        "student_id": student.get("student_id"),
        "student_name": student.get("full_name"),
        "issue_date": issue_date,
        "due_date": due_date,
        "status": "issued",
        "fine_amount": 0.0,
        "created_at": issue_date,
        "updated_at": issue_date
    }

    result = borrows_col.insert_one(borrow_doc)

    new_avail = book.get("available_copies", 1) - 1
    books_col.update_one(
        {"_id": book["_id"]},
        {"$set": {
            "available_copies": new_avail,
            "is_available": new_avail > 0,
            "updated_at": datetime.utcnow()
        }}
    )

    return {
        "success": True,
        "message": f"Successfully issued '{book.get('title')}' to {student.get('full_name')}",
        "borrow_id": str(result.inserted_id),
        "due_date": due_date.strftime("%Y-%m-%d")
    }

# ============================================
# 7. RETURN BOOK USING SCAN
# ============================================
@router.post("/scan-return")
async def scan_return_book(
    payload: ScanReturnRequest,
    db=Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    """
    Return an issued book directly using scanned Barcode/QR code.
    """
    books_col = db.books
    borrows_col = db.borrows

    book = books_col.find_one({
        "$or": [
            {"barcode_value": payload.scanned_code},
            {"qr_value": payload.scanned_code},
            {"isbn": payload.scanned_code}
        ]
    })
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book not found for code: {payload.scanned_code}"
        )

    active_borrow = borrows_col.find_one({
        "book_id": str(book["_id"]),
        "status": "issued"
    })

    if not active_borrow:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No active issue/borrow record found for book '{book.get('title')}'"
        )

    return_date = datetime.utcnow()
    borrows_col.update_one(
        {"_id": active_borrow["_id"]},
        {"$set": {
            "status": "returned",
            "return_date": return_date,
            "updated_at": return_date
        }}
    )

    new_avail = book.get("available_copies", 0) + 1
    books_col.update_one(
        {"_id": book["_id"]},
        {"$set": {
            "available_copies": new_avail,
            "is_available": True,
            "updated_at": return_date
        }}
    )

    return {
        "success": True,
        "message": f"Book '{book.get('title')}' successfully returned.",
        "student_name": active_borrow.get("student_name"),
        "return_date": return_date.strftime("%Y-%m-%d %H:%M:%S")
    }
