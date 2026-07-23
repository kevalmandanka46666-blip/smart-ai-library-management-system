from pydantic import BaseModel, Field, EmailStr, validator
from typing import Optional
from datetime import datetime, date

class StudentBase(BaseModel):
    student_id: str = Field(..., min_length=3, max_length=50)
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=15)
    address: Optional[str] = Field(None, max_length=255)
    date_of_birth: Optional[date] = None
    gender: Optional[str] = Field(None, max_length=10)
    course: Optional[str] = Field(None, max_length=100)
    semester: int = Field(1, ge=1, le=12)
    year: int = Field(1, ge=1, le=6)
    department: Optional[str] = Field(None, max_length=100)
    library_card_id: Optional[str] = Field(None, max_length=20)

    @validator('date_of_birth', pre=True)
    def parse_date_of_birth(cls, v):
        if v == "":
            return None
        return v

class StudentCreate(StudentBase):
    pass

class StudentUpdate(BaseModel):
    student_id: Optional[str] = Field(None, min_length=3, max_length=50)
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=15)
    address: Optional[str] = Field(None, max_length=255)
    date_of_birth: Optional[date] = None
    gender: Optional[str] = Field(None, max_length=10)
    course: Optional[str] = Field(None, max_length=100)
    semester: Optional[int] = Field(None, ge=1, le=12)
    year: Optional[int] = Field(None, ge=1, le=6)
    department: Optional[str] = Field(None, max_length=100)
    library_card_id: Optional[str] = Field(None, max_length=20)
    is_active: Optional[bool] = None

    @validator('date_of_birth', pre=True)
    def parse_date_of_birth(cls, v):
        if v == "":
            return None
        return v

class StudentResponse(StudentBase):
    id: str
    is_active: bool
    books_borrowed: int
    total_fines: float
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True