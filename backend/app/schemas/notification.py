from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class NotificationResponse(BaseModel):
    id: str
    student_id: str
    title: str
    message: str
    type: str
    created_at: datetime
    read: bool

    class Config:
        from_attributes = True
