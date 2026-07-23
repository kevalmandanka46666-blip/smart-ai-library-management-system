from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime
from bson import ObjectId
from typing import List

from ..database import get_db
from ..schemas.reservation import ReservationRequest, ReservationResponse
from ..core.security import get_current_user, get_current_admin

router = APIRouter(prefix="/api/v1/reservations", tags=["Reservations"])

def serialize_reservation(res) -> dict:
    return {
        "id": str(res["_id"]),
        "student_id": res["student_id"],
        "student_name": res.get("student_name", "Unknown Student"),
        "book_id": res["book_id"],
        "book_title": res.get("book_title", "Unknown Book"),
        "reserved_at": res["reserved_at"],
        "status": res["status"]
    }

# ============================================
# 1. RESERVE A BOOK
# ============================================
@router.post("/reserve", response_model=dict)
async def reserve_book(request: ReservationRequest, db=Depends(get_db), current_user=Depends(get_current_user)):
    # 1. Check permissions / resolve student_id
    is_admin = current_user.get("role") == "admin"
    student_id = request.student_id if (is_admin and request.student_id) else current_user.get("username")
    
    # 2. Get student details
    student = db.students.find_one({"student_id": student_id})
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student record '{student_id}' not found"
        )
        
    # 3. Find book
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

    # 4. If copies are available, do not allow reservation
    if book.get("available_copies", 0) > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Book copies are currently available. Please borrow/issue it directly."
        )

    # 5. Check if already reserved/issued by same student
    existing_borrow = db.borrows.find_one({
        "student_id": student_id,
        "book_id": str(book["_id"]),
        "status": "issued"
    })
    if existing_borrow:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You currently have this book issued. Cannot reserve."
        )

    existing_res = db.reservations.find_one({
        "student_id": student_id,
        "book_id": str(book["_id"]),
        "status": {"$in": ["pending", "ready"]}
    })
    if existing_res:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an active reservation for this book."
        )

    # 6. Create reservation document
    new_res = {
        "student_id": student_id,
        "student_name": student["full_name"],
        "book_id": str(book["_id"]),
        "book_title": book["title"],
        "reserved_at": datetime.utcnow(),
        "status": "pending"
    }
    db.reservations.insert_one(new_res)
    
    # 7. Trigger notification
    from ..utils.notification_helper import create_notification
    import asyncio
    asyncio.create_task(create_notification(
        db,
        student_id=student_id,
        title="Book Reservation Placed",
        message=f"You have reserved '{book['title']}'. You will be notified when it becomes available.",
        n_type="reservation_update"
    ))
    
    return {"message": f"Book '{book['title']}' successfully reserved."}

# ============================================
# 2. GET ACTIVE RESERVATIONS
# ============================================
@router.get("/active", response_model=List[dict])
async def get_active_reservations(db=Depends(get_db), current_user=Depends(get_current_user)):
    is_admin = current_user.get("role") == "admin"
    query = {"status": {"$in": ["pending", "ready"]}}
    
    if not is_admin:
        query["student_id"] = current_user.get("username")
        
    res_list = db.reservations.find(query).sort("reserved_at", -1)
    return [serialize_reservation(r) for r in res_list]

# ============================================
# 3. CANCEL RESERVATION
# ============================================
@router.post("/cancel/{id}", response_model=dict)
async def cancel_reservation(id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid reservation ID")
        
    res = db.reservations.find_one({"_id": ObjectId(id)})
    if not res:
        raise HTTPException(status_code=404, detail="Reservation not found")
        
    is_admin = current_user.get("role") == "admin"
    if not is_admin and res["student_id"] != current_user.get("username"):
        raise HTTPException(status_code=403, detail="Not authorized to cancel this reservation")

    db.reservations.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"status": "cancelled"}}
    )
    return {"message": "Reservation successfully cancelled."}
