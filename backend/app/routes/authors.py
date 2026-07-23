from fastapi import APIRouter, Depends, HTTPException, Query, status
from bson import ObjectId
from typing import List, Optional
from datetime import datetime
import re
import logging

from ..database import get_db
from ..models.author import author_document, serialize_author, serialize_authors
from ..schemas.author import AuthorCreate, AuthorUpdate, AuthorResponse
from ..core.security import get_current_user, get_current_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/authors", tags=["Authors"])


# ============================================
# 1. CREATE AUTHOR - Add New Author (Admin Only)
# ============================================
@router.post("/", response_model=AuthorResponse, status_code=status.HTTP_201_CREATED)
async def create_author(
    author: AuthorCreate,
    db=Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    """
    Add a new author to the library.
    - Checks if an author with the same name already exists (case-insensitive)
    - Creates new author entry
    """
    collection = db.authors

    # Check for duplicate name (case-insensitive, excluding soft-deleted)
    existing = collection.find_one({
        "name": {"$regex": f"^{re.escape(author.name)}$", "$options": "i"},
        "is_deleted": {"$ne": True}
    })
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Author with name '{author.name}' already exists"
        )

    # Create new author document
    new_author = author_document(author.dict())

    # Insert into MongoDB
    result = collection.insert_one(new_author)

    # Get inserted author
    inserted = collection.find_one({"_id": result.inserted_id})

    logger.info(f"✅ Author created: {author.name} (ID: {result.inserted_id})")
    return serialize_author(inserted)


# ============================================
# 2. GET ALL AUTHORS - With Pagination & Search
# ============================================
@router.get("/", response_model=List[AuthorResponse])
async def get_all_authors(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None, max_length=200),
    status_filter: Optional[str] = Query(None, alias="status"),
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Get all authors with pagination and optional search/status filter.
    Only returns non-deleted authors.
    """
    collection = db.authors

    # Build query filter — always exclude soft-deleted
    query = {"is_deleted": {"$ne": True}}

    if search and search.strip():
        query["name"] = {"$regex": re.escape(search.strip()), "$options": "i"}

    if status_filter and status_filter in ("active", "inactive"):
        query["status"] = status_filter

    authors = collection.find(query).sort("name", 1).skip(skip).limit(limit)
    total = collection.count_documents(query)

    result = serialize_authors(list(authors))

    return result


# ============================================
# 3. GET AUTHOR STATS
# ============================================
@router.get("/stats/")
async def get_author_stats(
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Get author statistics"""
    collection = db.authors
    base_filter = {"is_deleted": {"$ne": True}}

    total = collection.count_documents(base_filter)
    active = collection.count_documents({**base_filter, "status": "active"})
    inactive = collection.count_documents({**base_filter, "status": "inactive"})

    return {
        "total_authors": total,
        "active_authors": active,
        "inactive_authors": inactive
    }


# ============================================
# 4. GET AUTHOR DETAILS - View Single Author
# ============================================
@router.get("/{author_id}", response_model=AuthorResponse)
async def get_author(
    author_id: str,
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Get detailed information about a specific author.
    """
    collection = db.authors

    # Validate ObjectId
    if not ObjectId.is_valid(author_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid author ID format"
        )

    author = collection.find_one({
        "_id": ObjectId(author_id),
        "is_deleted": {"$ne": True}
    })

    if not author:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Author with ID {author_id} not found"
        )

    return serialize_author(author)


# ============================================
# 5. UPDATE AUTHOR - Update Author Details (Admin Only)
# ============================================
@router.put("/{author_id}", response_model=AuthorResponse)
async def update_author(
    author_id: str,
    author_update: AuthorUpdate,
    db=Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    """
    Update author details.
    """
    collection = db.authors

    # Validate ObjectId
    if not ObjectId.is_valid(author_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid author ID format"
        )

    # Check if author exists and is not soft-deleted
    author = collection.find_one({
        "_id": ObjectId(author_id),
        "is_deleted": {"$ne": True}
    })
    if not author:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Author with ID {author_id} not found"
        )

    # Build update data (exclude unset fields)
    update_data = author_update.dict(exclude_unset=True)

    # Check name uniqueness if name is being updated
    if "name" in update_data and update_data["name"] != author.get("name"):
        existing = collection.find_one({
            "name": {"$regex": f"^{re.escape(update_data['name'])}$", "$options": "i"},
            "is_deleted": {"$ne": True},
            "_id": {"$ne": ObjectId(author_id)}
        })
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Author with name '{update_data['name']}' already exists"
            )

    # Add updated_at timestamp
    update_data["updated_at"] = datetime.utcnow()

    # Update in MongoDB
    result = collection.update_one(
        {"_id": ObjectId(author_id)},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Author with ID {author_id} not found"
        )

    # Get updated author
    updated = collection.find_one({"_id": ObjectId(author_id)})
    logger.info(f"✅ Author updated: {author_id}")
    return serialize_author(updated)


# ============================================
# 6. SOFT DELETE AUTHOR (Admin Only)
# ============================================
@router.delete("/{author_id}")
async def delete_author(
    author_id: str,
    db=Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    """
    Soft delete an author.
    - Checks if any books reference this author_id before deletion.
    - Sets is_deleted=True instead of removing from the database.
    """
    collection = db.authors

    # Validate ObjectId
    if not ObjectId.is_valid(author_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid author ID format"
        )

    # Check if author exists and is not already soft-deleted
    author = collection.find_one({
        "_id": ObjectId(author_id),
        "is_deleted": {"$ne": True}
    })
    if not author:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Author with ID {author_id} not found"
        )

    # Safe delete: check if any books reference this author_id
    books_collection = db.books
    books_with_author = books_collection.count_documents({
        "author_id": author_id
    })
    if books_with_author > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete author '{author.get('name')}'. {books_with_author} book(s) are still associated with this author. Please reassign or remove books first."
        )

    # Soft delete
    collection.update_one(
        {"_id": ObjectId(author_id)},
        {"$set": {
            "is_deleted": True,
            "status": "inactive",
            "updated_at": datetime.utcnow()
        }}
    )

    logger.info(f"🗑️ Author soft-deleted: {author.get('name')} (ID: {author_id})")
    return {
        "message": f"Author '{author.get('name')}' has been deleted successfully",
        "id": author_id
    }
