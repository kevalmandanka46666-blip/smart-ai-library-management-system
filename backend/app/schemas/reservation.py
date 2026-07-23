from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ReservationRequest(BaseModel):
    book_id: str
    student_id: Optional[str] = None # Optional for user request (default to current user)

class ReservationResponse(BaseModel):
    id: str
    student_id: str
    student_name: str
    book_id: str
    book_title: str
    reserved_at: datetime
    status: str

    class Config:
        from_attributes = True
