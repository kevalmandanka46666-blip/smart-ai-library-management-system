from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime


# Base Category Schema
class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)
    status: Optional[str] = Field("active", pattern="^(active|inactive)$")

    @validator('name')
    def validate_name(cls, v):
        if v and v.strip() == "":
            raise ValueError('Category name cannot be empty or whitespace')
        return v.strip()

    @validator('status', pre=True)
    def validate_status(cls, v):
        if v is None or v == "":
            return "active"
        if v not in ("active", "inactive"):
            raise ValueError('Status must be "active" or "inactive"')
        return v


# Create Category Request
class CategoryCreate(CategoryBase):
    pass


# Update Category Request
class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)
    status: Optional[str] = Field(None, pattern="^(active|inactive)$")

    @validator('name')
    def validate_name(cls, v):
        if v is not None and v.strip() == "":
            raise ValueError('Category name cannot be empty or whitespace')
        return v.strip() if v else v

    @validator('status', pre=True)
    def validate_status(cls, v):
        if v is not None and v not in ("active", "inactive"):
            raise ValueError('Status must be "active" or "inactive"')
        return v


# Category Response
class CategoryResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    status: str = "active"
    is_deleted: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
