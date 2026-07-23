from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime


# Base Author Schema
class AuthorBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    biography: Optional[str] = Field(None, max_length=2000)
    birth_date: Optional[str] = Field(None, max_length=50)
    nationality: Optional[str] = Field(None, max_length=100)
    status: Optional[str] = Field("active", pattern="^(active|inactive)$")

    @validator('name')
    def validate_name(cls, v):
        if v and v.strip() == "":
            raise ValueError('Author name cannot be empty or whitespace')
        return v.strip()

    @validator('status', pre=True)
    def validate_status(cls, v):
        if v is None or v == "":
            return "active"
        if v not in ("active", "inactive"):
            raise ValueError('Status must be "active" or "inactive"')
        return v


# Create Author Request
class AuthorCreate(AuthorBase):
    pass


# Update Author Request
class AuthorUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    biography: Optional[str] = Field(None, max_length=2000)
    birth_date: Optional[str] = Field(None, max_length=50)
    nationality: Optional[str] = Field(None, max_length=100)
    status: Optional[str] = Field(None, pattern="^(active|inactive)$")

    @validator('name')
    def validate_name(cls, v):
        if v is not None and v.strip() == "":
            raise ValueError('Author name cannot be empty or whitespace')
        return v.strip() if v else v

    @validator('status', pre=True)
    def validate_status(cls, v):
        if v is not None and v not in ("active", "inactive"):
            raise ValueError('Status must be "active" or "inactive"')
        return v


# Author Response
class AuthorResponse(BaseModel):
    id: str
    name: str
    biography: Optional[str] = None
    birth_date: Optional[str] = None
    nationality: Optional[str] = None
    status: str = "active"
    is_deleted: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
