from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class FineResponse(BaseModel):
    id: str
    borrow_id: str
    student_id: str
    student_name: str
    book_title: str
    amount: float
    reason: str
    created_at: datetime
    paid: bool
    paid_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class FinePayRequest(BaseModel):
    fine_id: str
