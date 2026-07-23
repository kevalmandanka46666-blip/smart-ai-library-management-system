from fastapi import APIRouter, Depends, HTTPException, Query, status
from datetime import datetime, timedelta
from bson import ObjectId
from typing import List, Optional

from ..database import get_db
from ..schemas.borrow import BorrowIssueRequest, BorrowReturnRequest, BorrowResponse
from ..core.security import get_current_user, get_current_admin

router = APIRouter(prefix="/api/v1/borrows", tags=["Borrow Transactions"])

def serialize_borrow(borrow) -> dict:
    return {
        "id": str(borrow["_id"]),
        "student_id": borrow["student_id"],
        "student_name": borrow.get("student_name", "Unknown Student"),
        "book_id": borrow["book_id"],
        "book_title": borrow.get("book_title", "Unknown Book"),
        "issue_date": borrow["issue_date"],
        "due_date": borrow["due_date"],
        "return_date": borrow.get("return_date"),
        "status": borrow["status"]
    }

def serialize_borrows(borrows) -> list:
    return [serialize_borrow(b) for b in borrows]

# ============================================
# 1. ISSUE BOOK (Admin Only)
# ============================================
@router.post("/issue", response_model=dict)
async def issue_book(request: BorrowIssueRequest, db=Depends(get_db), current_admin=Depends(get_current_admin)):
    """
    Issue a book to a student.
    """
    # 1. Verify student exists
    student = db.students.find_one({"student_id": request.student_id})
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID '{request.student_id}' not found"
        )

    # 2. Verify book exists
    book_filter = {}
    if ObjectId.is_valid(request.book_id):
        book_filter["_id"] = ObjectId(request.book_id)
    else:
        book_filter["$or"] = [
            {"isbn": request.book_id},
            {"title": {"$regex": f"^{request.book_id}$", "$options": "i"}}
        ]
        
    book = db.books.find_one(book_filter)
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book matching '{request.book_id}' not found"
        )

    # 3. Check reservations and available copies
    available_copies = book.get("available_copies", 0)
    
    # Check if this student has a 'ready' reservation
    ready_res = db.reservations.find_one({
        "book_id": str(book["_id"]),
        "student_id": request.student_id,
        "status": "ready"
    })
    
    # Check if there are other 'ready' reservations
    other_ready_res = db.reservations.find_one({
        "book_id": str(book["_id"]),
        "status": "ready",
        "student_id": {"$ne": request.student_id}
    })

    if other_ready_res and available_copies <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This book is held for another student's pending reservation."
        )

    if not ready_res and available_copies <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This book has no copies available for issue."
        )

    # 4. Check if student already has this book issued
    existing_issue = db.borrows.find_one({
        "student_id": request.student_id,
        "book_id": str(book["_id"]),
        "status": "issued"
    })
    if existing_issue:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This book is already issued to this student"
        )

    # 5. Insert transaction record (Use atomic transactional update in production)
    new_borrow = {
        "student_id": request.student_id,
        "student_name": student["full_name"],
        "book_id": str(book["_id"]),
        "book_title": book["title"],
        "issue_date": datetime.utcnow(),
        "due_date": datetime.utcnow() + timedelta(days=14),
        "return_date": None,
        "status": "issued"
    }
    
    db.borrows.insert_one(new_borrow)

    # 6. Update book availability counter and fulfill reservation if applicable
    if ready_res:
        # Fulfill reservation
        db.reservations.update_one(
            {"_id": ready_res["_id"]},
            {"$set": {"status": "completed"}}
        )
        # Since the copy was already held (not incremented on return), we don't decrement here.
    else:
        # Decrement available copies normally
        db.books.update_one(
            {"_id": book["_id"]},
            {
                "$set": {
                    "available_copies": available_copies - 1,
                    "is_available": (available_copies - 1) > 0
                }
            }
        )

    # 7. Trigger notification & email
    from ..utils.notification_helper import create_notification
    from ..services.email_service import EmailService
    import asyncio

    asyncio.create_task(create_notification(
        db,
        student_id=request.student_id,
        title="Book Issued Successfully",
        message=f"You have borrowed '{book['title']}'. Due date is {new_borrow['due_date'].strftime('%Y-%m-%d')}.",
        n_type="issue_success"
    ))

    if student.get("email"):
        asyncio.create_task(EmailService.send_issue_confirmation(
            recipient_email=student["email"],
            student_name=student.get("full_name", request.student_id),
            book_title=book["title"],
            issue_date=new_borrow["issue_date"].strftime("%Y-%m-%d"),
            due_date=new_borrow["due_date"].strftime("%Y-%m-%d"),
            db=db
        ))

    return {"message": f"Book '{book['title']}' successfully issued to '{student['full_name']}'"}

# ============================================
# 2. RETURN BOOK (Admin Only)
# ============================================
@router.post("/return", response_model=dict)
async def return_book(request: BorrowReturnRequest, db=Depends(get_db), current_admin=Depends(get_current_admin)):
    """
    Return an issued book. Calculates fines and processes reservations.
    """
    # 1. Match active issue record
    book_filter = {}
    if ObjectId.is_valid(request.book_id):
        book_filter["_id"] = ObjectId(request.book_id)
    else:
        book_filter["$or"] = [
            {"isbn": request.book_id},
            {"title": {"$regex": f"^{request.book_id}$", "$options": "i"}}
        ]
        
    book = db.books.find_one(book_filter)
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )

    borrow = db.borrows.find_one({
        "student_id": request.student_id,
        "book_id": str(book["_id"]),
        "status": "issued"
    })
    
    if not borrow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active borrow record found for this student and book"
        )

    # 2. Calculate late fine ($10 per day overdue)
    now = datetime.utcnow()
    fine_amount = 0.0
    due_date = borrow["due_date"]
    if now > due_date:
        overdue_days = (now - due_date).days
        if overdue_days == 0 and (now - due_date).total_seconds() > 0:
            overdue_days = 1
        if overdue_days > 0:
            fine_amount = overdue_days * 10.0
            
    # 3. Update status to returned
    db.borrows.update_one(
        {"_id": borrow["_id"]},
        {
            "$set": {
                "status": "returned",
                "return_date": now
            }
        }
    )

    # 4. Save fine record if applicable
    if fine_amount > 0:
        db.fines.insert_one({
            "borrow_id": str(borrow["_id"]),
            "student_id": borrow["student_id"],
            "student_name": borrow.get("student_name", "Unknown Student"),
            "book_title": borrow.get("book_title", "Unknown Book"),
            "amount": fine_amount,
            "reason": f"Overdue return ({overdue_days} day(s) late)",
            "created_at": now,
            "paid": False,
            "paid_at": None
        })

    # 5. Check reservation queue
    oldest_res = db.reservations.find_one(
        {"book_id": str(book["_id"]), "status": "pending"},
        sort=[("reserved_at", 1)]
    )
    
    from ..utils.notification_helper import create_notification
    import asyncio

    if oldest_res:
        # Assign copy directly to the reserver (status -> ready, do not increment available_copies)
        db.reservations.update_one(
            {"_id": oldest_res["_id"]},
            {"$set": {"status": "ready"}}
        )
        msg = f"Book '{book['title']}' returned. Held for reserver '{oldest_res['student_name']}'."
        # Notify the reserver
        asyncio.create_task(create_notification(
            db,
            student_id=oldest_res["student_id"],
            title="Reserved Book Ready for Pickup",
            message=f"The book '{book['title']}' you reserved is now ready for pickup.",
            n_type="reservation_update"
        ))
    else:
        # Increment book availability normally
        db.books.update_one(
            {"_id": book["_id"]},
            {
                "$set": {
                    "available_copies": book.get("available_copies", 0) + 1,
                    "is_available": True
                }
            }
        )
        msg = f"Book '{book['title']}' successfully returned."

    # Notify borrower of return success & send return confirmation email
    asyncio.create_task(create_notification(
        db,
        student_id=request.student_id,
        title="Book Returned Successfully",
        message=f"Book '{book['title']}' has been returned.",
        n_type="return_success"
    ))

    student = db.students.find_one({"student_id": request.student_id})
    if student and student.get("email"):
        asyncio.create_task(EmailService.send_return_confirmation(
            recipient_email=student["email"],
            student_name=student.get("full_name", request.student_id),
            book_title=book["title"],
            return_date=now.strftime("%Y-%m-%d %H:%M"),
            db=db
        ))
        if fine_amount > 0:
            asyncio.create_task(EmailService.send_fine_reminder(
                recipient_email=student["email"],
                student_name=student.get("full_name", request.student_id),
                book_title=book["title"],
                amount=fine_amount,
                reason="Late Book Return",
                db=db
            ))

    # Notify borrower of late fine if generated
    if fine_amount > 0:
        msg += f" Late return fine of {fine_amount} units generated."
        asyncio.create_task(create_notification(
            db,
            student_id=request.student_id,
            title="Overdue Fine Generated",
            message=f"A late fee of ${fine_amount:.2f} has been generated for returning '{book['title']}' late.",
            n_type="fine_reminder"
        ))

    return {"message": msg}

# ============================================
# 3. LIST ALL TRANSACTIONS (Admin Only - Filtered, Sorted, Paginated)
# ============================================
@router.get("/transactions", response_model=dict)
async def get_transactions(
    query: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    overdue: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db=Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    search_filter = {}
    if status:
        search_filter["status"] = status

    if overdue:
        search_filter["status"] = "issued"
        search_filter["due_date"] = {"$lt": datetime.utcnow()}

    if query and query.strip():
        q = query.strip()
        search_filter["$or"] = [
            {"student_id": {"$regex": q, "$options": "i"}},
            {"student_name": {"$regex": q, "$options": "i"}},
            {"book_title": {"$regex": q, "$options": "i"}},
            {"book_id": {"$regex": q, "$options": "i"}}
        ]

    total = db.borrows.count_documents(search_filter)
    total_pages = max(1, -(-total // page_size))
    skip = (page - 1) * page_size

    cursor = db.borrows.find(search_filter).sort("issue_date", -1).skip(skip).limit(page_size)
    return {
        "transactions": serialize_borrows(list(cursor)),
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }

# ============================================
# 3b. BULK RETURN BOOKS (Admin Only)
# ============================================
@router.post("/bulk-return", response_model=dict)
async def bulk_return_books(
    payload: dict,
    db=Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    """
    Process returns for multiple active borrowing records.
    Payload format: { "transaction_ids": ["tx_id1", "tx_id2", ...] }
    """
    tx_ids = payload.get("transaction_ids", [])
    if not tx_ids or not isinstance(tx_ids, list):
        raise HTTPException(
            status_code=400,
            detail="transaction_ids must be a non-empty list"
        )

    processed_count = 0
    for tx_id in tx_ids:
        if not ObjectId.is_valid(tx_id):
            continue
        borrow = db.borrows.find_one({"_id": ObjectId(tx_id), "status": "issued"})
        if not borrow:
            continue

        # 1. Update status
        db.borrows.update_one(
            {"_id": borrow["_id"]},
            {"$set": {"status": "returned", "return_date": datetime.utcnow()}}
        )

        # 2. Increment book copies
        db.books.update_one(
            {"_id": ObjectId(borrow["book_id"])},
            {"$inc": {"available_copies": 1}, "$set": {"is_available": True}}
        )
        processed_count += 1

    return {"message": f"Successfully processed returns for {processed_count} transaction(s)"}

# ============================================
# 4. LIST BY STUDENT (Registered Users)
# ============================================
STUDENT_BORROW_PROJ = {
    "student_id": 1, "student_name": 1, "book_id": 1,
    "book_title": 1, "issue_date": 1, "due_date": 1,
    "return_date": 1, "status": 1
}

@router.get("/student/{student_id}", response_model=List[dict])
async def get_student_borrows(
    student_id: str, 
    db=Depends(get_db), 
    current_user=Depends(get_current_user)
):
    borrows = db.borrows.find(
        {"student_id": student_id}, STUDENT_BORROW_PROJ
    ).sort("issue_date", -1).limit(200)
    return serialize_borrows(list(borrows))

# ============================================
# 5. GET STATS/REPORTS (Admin Only)
# ============================================
@router.get("/reports")
async def get_reports_stats(db=Depends(get_db), current_admin=Depends(get_current_admin)):
    # Single aggregation instead of 3 separate count_documents calls
    pipeline = [
        {"$facet": {
            "issued": [{"$match": {"status": "issued"}}, {"$count": "n"}],
            "returned": [{"$match": {"status": "returned"}}, {"$count": "n"}],
            "overdue": [{"$match": {"status": "issued", "due_date": {"$lt": datetime.utcnow()}}}, {"$count": "n"}]
        }}
    ]
    result = list(db.borrows.aggregate(pipeline))
    r = result[0] if result else {}
    total_issued = r.get("issued", [{}])[0].get("n", 0) if r.get("issued") else 0
    total_returned = r.get("returned", [{}])[0].get("n", 0) if r.get("returned") else 0
    overdue_count = r.get("overdue", [{}])[0].get("n", 0) if r.get("overdue") else 0
    
    return {
        "total_issued": total_issued,
        "total_returned": total_returned,
        "overdue_count": overdue_count,
        "total_transactions": total_issued + total_returned
    }
