from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime

# Base Book Schema
class BookBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    author: str = Field(..., min_length=1, max_length=255)
    isbn: str = Field(..., min_length=10, max_length=20)
    publisher: Optional[str] = Field(None, max_length=255)
    publication_year: Optional[int] = Field(None, ge=1000, le=datetime.now().year)
    genre: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    total_copies: int = Field(1, ge=1)
    available_copies: int = Field(1, ge=0)
    location: Optional[str] = Field(None, max_length=100)
    price: float = Field(0.0, ge=0)
    cover_image: Optional[str] = Field(None, max_length=500)
    barcode_value: Optional[str] = Field(None, max_length=100)
    qr_value: Optional[str] = Field(None, max_length=200)

    @validator('available_copies')
    def validate_available_copies(cls, v, values):
        if 'total_copies' in values and v > values['total_copies']:
            raise ValueError('Available copies cannot exceed total copies')
        return v

    @validator('publication_year', pre=True)
    def parse_publication_year(cls, v):
        if v == "":
            return None
        return v

# Create Book Request
class BookCreate(BookBase):
    pass

# Update Book Request
class BookUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    author: Optional[str] = Field(None, min_length=1, max_length=255)
    isbn: Optional[str] = Field(None, min_length=10, max_length=20)
    publisher: Optional[str] = Field(None, max_length=255)
    publication_year: Optional[int] = Field(None, ge=1000, le=datetime.now().year)
    genre: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    total_copies: Optional[int] = Field(None, ge=1)
    available_copies: Optional[int] = Field(None, ge=0)
    location: Optional[str] = Field(None, max_length=100)
    price: Optional[float] = Field(None, ge=0)
    cover_image: Optional[str] = Field(None, max_length=500)
    barcode_value: Optional[str] = Field(None, max_length=100)
    qr_value: Optional[str] = Field(None, max_length=200)
    is_available: Optional[bool] = None

    @validator('publication_year', pre=True)
    def parse_publication_year(cls, v):
        if v == "":
            return None
        return v

# Book Response
class BookResponse(BookBase):
    id: str  # Changed from int to str for MongoDB ObjectId
    barcode_value: Optional[str] = None
    qr_value: Optional[str] = None
    is_available: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True