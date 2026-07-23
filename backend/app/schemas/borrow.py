from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class BorrowIssueRequest(BaseModel):
    student_id: str
    book_id: str

class BorrowReturnRequest(BaseModel):
    student_id: str
    book_id: str

class BorrowResponse(BaseModel):
    id: str
    student_id: str
    student_name: str
    book_id: str
    book_title: str
    issue_date: datetime
    due_date: datetime
    return_date: Optional[datetime] = None
    status: str

    class Config:
        from_attributes = True
