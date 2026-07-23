from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile
from bson import ObjectId
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..models.book import book_document, serialize_book, serialize_books
from ..schemas.book import BookCreate, BookUpdate, BookResponse
from ..core.security import get_current_user, get_current_admin

router = APIRouter(prefix="/api/v1/books", tags=["Books"])

# ============================================
# 1. CREATE BOOK - Add New Book (Admin Only)
# ============================================
@router.post("/", response_model=BookResponse, status_code=status.HTTP_201_CREATED)
async def create_book(book: BookCreate, db=Depends(get_db), current_admin=Depends(get_current_admin)):
    """
    Add a new book to the library.
    - Checks if ISBN already exists
    - Creates new book entry
    """
    collection = db.books
    
    # Check if book with same ISBN exists
    existing_book = collection.find_one({"isbn": book.isbn})
    if existing_book:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Book with ISBN {book.isbn} already exists"
        )
    
    # Create new book document
    new_book = book_document(book.dict())
    
    # Insert into MongoDB
    result = collection.insert_one(new_book)
    
    # Get inserted book
    inserted_book = collection.find_one({"_id": result.inserted_id})
    
    return serialize_book(inserted_book)

# ============================================
# 2. GET ALL BOOKS - View All Books (Registered Users)
# ============================================
@router.get("/", response_model=List[BookResponse])
async def get_all_books(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Get all books with pagination.
    """
    collection = db.books
    
    books = collection.find().skip(skip).limit(limit)
    
    return serialize_books(list(books))

# ============================================
# 3. GET BOOK DETAILS - View Single Book (Registered Users)
# ============================================
@router.get("/{book_id}", response_model=BookResponse)
async def get_book(book_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    """
    Get detailed information about a specific book.
    """
    collection = db.books
    
    # Validate ObjectId
    if not ObjectId.is_valid(book_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid book ID format"
        )
    
    book = collection.find_one({"_id": ObjectId(book_id)})
    
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with ID {book_id} not found"
        )
    
    return serialize_book(book)

# ============================================
# 4. UPDATE BOOK - Update Book Details (Admin Only)
# ============================================
@router.put("/{book_id}", response_model=BookResponse)
async def update_book(
    book_id: str,
    book_update: BookUpdate,
    db=Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    """
    Update book details.
    """
    collection = db.books
    
    # Validate ObjectId
    if not ObjectId.is_valid(book_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid book ID format"
        )
    
    # Check if book exists
    book = collection.find_one({"_id": ObjectId(book_id)})
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with ID {book_id} not found"
        )
    
    # Check ISBN uniqueness if being updated
    update_data = book_update.dict(exclude_unset=True)
    
    if "isbn" in update_data and update_data["isbn"] != book.get("isbn"):
        existing_book = collection.find_one({"isbn": update_data["isbn"]})
        if existing_book:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Book with ISBN {update_data['isbn']} already exists"
            )
    
    # Update available status
    if "available_copies" in update_data:
        update_data["is_available"] = update_data["available_copies"] > 0
    
    # Add updated_at timestamp
    update_data["updated_at"] = datetime.utcnow()
    
    # Update in MongoDB
    result = collection.update_one(
        {"_id": ObjectId(book_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with ID {book_id} not found"
        )
    
    # Get updated book
    updated_book = collection.find_one({"_id": ObjectId(book_id)})
    
    return serialize_book(updated_book)

# ============================================
# 5. DELETE BOOK - Delete Book (Admin Only)
# ============================================
@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_book(book_id: str, db=Depends(get_db), current_admin=Depends(get_current_admin)):
    """
    Delete a book from the library.
    """
    collection = db.books
    
    # Validate ObjectId
    if not ObjectId.is_valid(book_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid book ID format"
        )
    
    result = collection.delete_one({"_id": ObjectId(book_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with ID {book_id} not found"
        )
    
    return None

# ============================================
# 6. SEARCH BOOKS - Advanced Search (Registered Users)
# ============================================
@router.get("/search/", response_model=List[BookResponse])
async def search_books(
    query: Optional[str] = Query(None, min_length=1),
    author: Optional[str] = Query(None, min_length=1),
    genre: Optional[str] = Query(None, min_length=1),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Search books by title, author, genre, ISBN.
    """
    collection = db.books
    
    # Build search filter
    search_filter = {}
    
    if query:
        search_filter["$or"] = [
            {"title": {"$regex": query, "$options": "i"}},
            {"author": {"$regex": query, "$options": "i"}},
            {"isbn": {"$regex": query, "$options": "i"}},
            {"publisher": {"$regex": query, "$options": "i"}}
        ]
    
    if author:
        search_filter["author"] = {"$regex": author, "$options": "i"}
    
    if genre:
        search_filter["genre"] = {"$regex": genre, "$options": "i"}
    
    # Execute search
    books = collection.find(search_filter).skip(skip).limit(limit)
    
    return serialize_books(list(books))

# ============================================
# 7. FILTER BY AVAILABILITY (Registered Users)
# ============================================
@router.get("/filter/available/", response_model=List[BookResponse])
async def filter_available_books(
    is_available: bool = Query(True),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Filter books by availability.
    """
    collection = db.books
    
    books = collection.find(
        {"is_available": is_available}
    ).skip(skip).limit(limit)
    
    return serialize_books(list(books))

# ============================================
# 8. GET BOOK STATISTICS (Admin Only)
# ============================================
@router.get("/stats/")
async def get_book_stats(db=Depends(get_db), current_admin=Depends(get_current_admin)):
    """
    Get library statistics.
    """
    collection = db.books
    
    # Single aggregation for all stats
    pipeline = [
        {"$facet": {
            "total": [{"$count": "n"}],
            "available": [{"$match": {"is_available": True}}, {"$count": "n"}],
            "by_genre": [
                {"$group": {"_id": {"$ifNull": ["$genre", "Uncategorized"]}, "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}
            ]
        }}
    ]
    result = list(collection.aggregate(pipeline))
    r = result[0] if result else {}
    total_books = r.get("total", [{}])[0].get("n", 0) if r.get("total") else 0
    available_books = r.get("available", [{}])[0].get("n", 0) if r.get("available") else 0
    
    return {
        "total_books": total_books,
        "available_books": available_books,
        "unavailable_books": total_books - available_books,
        "books_by_genre": [
            {"genre": item["_id"], "count": item["count"]}
            for item in r.get("by_genre", [])
        ]
    }

# ============================================
# 9. GET UNIQUE GENRES (Registered Users)
# ============================================
@router.get("/genres/")
async def get_genres(db=Depends(get_db), current_user=Depends(get_current_user)):
    """
    Return distinct genre values for filter dropdowns.
    """
    collection = db.books
    genres = collection.distinct("genre")
    return [g for g in genres if g]

# ============================================
# 10. BROWSE BOOKS - Unified search/filter/sort/paginate (Registered Users)
# ============================================
@router.get("/browse/")
async def browse_books(
    query: Optional[str] = Query(None),
    genre: Optional[str] = Query(None),
    author: Optional[str] = Query(None),
    isbn: Optional[str] = Query(None),
    publisher: Optional[str] = Query(None),
    is_available: Optional[bool] = Query(None),
    year_from: Optional[int] = Query(None, ge=1000),
    year_to: Optional[int] = Query(None, le=datetime.now().year + 1),
    sort_by: str = Query("created_at", pattern="^(title|author|publication_year|price|created_at|isbn)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Production browsing endpoint with combined search, filters, sorting and pagination.
    Returns an envelope with books list, total count and page metadata.
    """
    collection = db.books
    search_filter = {}

    # Full-text search across title, author, isbn, publisher
    if query and query.strip():
        q = query.strip()
        search_filter["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"author": {"$regex": q, "$options": "i"}},
            {"isbn": {"$regex": q, "$options": "i"}},
            {"publisher": {"$regex": q, "$options": "i"}}
        ]

    if genre:
        search_filter["genre"] = {"$regex": f"^{genre}$", "$options": "i"}

    if author:
        search_filter["author"] = {"$regex": author, "$options": "i"}

    if isbn:
        search_filter["isbn"] = {"$regex": isbn, "$options": "i"}

    if publisher:
        search_filter["publisher"] = {"$regex": publisher, "$options": "i"}

    if is_available is not None:
        search_filter["is_available"] = is_available

    if year_from is not None:
        search_filter.setdefault("publication_year", {})["$gte"] = year_from
    if year_to is not None:
        search_filter.setdefault("publication_year", {})["$lte"] = year_to

    # Total count (before pagination)
    total = collection.count_documents(search_filter)

    # Sort direction
    sort_dir = 1 if sort_order == "asc" else -1

    # Pagination math
    skip = (page - 1) * page_size
    total_pages = max(1, -(-total // page_size))  # ceil division

    # Execute query
    cursor = collection.find(search_filter).sort(sort_by, sort_dir).skip(skip).limit(page_size)
    books = serialize_books(list(cursor))

    return {
        "books": books,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }

# ============================================
# 11. BULK DELETE BOOKS (Admin Only)
# ============================================
@router.post("/bulk-delete/")
async def bulk_delete_books(
    payload: dict,
    db=Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    """
    Delete multiple books by IDs.
    Expects: { "book_ids": ["id1", "id2", ...] }
    """
    book_ids = payload.get("book_ids", [])
    if not book_ids or not isinstance(book_ids, list):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="book_ids must be a non-empty list"
        )

    if len(book_ids) > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete more than 100 books at once"
        )

    object_ids = []
    for bid in book_ids:
        if not ObjectId.is_valid(bid):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid book ID: {bid}"
            )
        object_ids.append(ObjectId(bid))

    result = db.books.delete_many({"_id": {"$in": object_ids}})
    return {
        "message": f"Successfully deleted {result.deleted_count} book(s)",
        "deleted_count": result.deleted_count
    }

# ============================================
# 12. EXPORT BOOKS CSV (Admin Only)
# ============================================
@router.get("/export/csv")
async def export_books_csv(db=Depends(get_db), current_admin=Depends(get_current_admin)):
    """
    Export all books as CSV download.
    """
    import csv
    import io
    from fastapi.responses import StreamingResponse

    collection = db.books
    books = list(collection.find().sort("title", 1))

    output = io.StringIO()
    fieldnames = [
        "title", "author", "isbn", "publisher", "publication_year",
        "genre", "description", "total_copies", "available_copies",
        "location", "price", "cover_image", "is_available"
    ]
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()

    for book in books:
        row = {k: book.get(k, "") for k in fieldnames}
        writer.writerow(row)

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=library_books_export.csv"}
    )

# ============================================
# 13. IMPORT BOOKS CSV (Admin Only)
# ============================================
@router.post("/import/csv")
async def import_books_csv(
    file: UploadFile,
    db=Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    """
    Import books from a CSV file.
    Skips rows with duplicate ISBNs. Returns summary of imported/skipped.
    """
    import csv
    import io

    if not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are accepted"
        )

    # Read and decode file
    contents = await file.read()
    try:
        decoded = contents.decode("utf-8-sig")  # handles BOM
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be UTF-8 encoded"
        )

    reader = csv.DictReader(io.StringIO(decoded))
    collection = db.books

    imported = 0
    skipped = 0
    errors = []

    for i, row in enumerate(reader, start=2):  # start=2 (header is row 1)
        title = row.get("title", "").strip()
        author = row.get("author", "").strip()
        isbn = row.get("isbn", "").strip()

        if not title or not author or not isbn:
            skipped += 1
            errors.append(f"Row {i}: Missing required fields (title, author, isbn)")
            continue

        if len(isbn) < 10:
            skipped += 1
            errors.append(f"Row {i}: ISBN too short (min 10 chars)")
            continue

        # Duplicate check
        if collection.find_one({"isbn": isbn}):
            skipped += 1
            errors.append(f"Row {i}: ISBN {isbn} already exists")
            continue

        # Parse numeric fields safely
        try:
            total_copies = int(row.get("total_copies", 1) or 1)
        except (ValueError, TypeError):
            total_copies = 1

        try:
            available_copies = int(row.get("available_copies", total_copies) or total_copies)
        except (ValueError, TypeError):
            available_copies = total_copies

        try:
            price = float(row.get("price", 0) or 0)
        except (ValueError, TypeError):
            price = 0.0

        try:
            pub_year = int(row.get("publication_year", 0) or 0) or None
        except (ValueError, TypeError):
            pub_year = None

        new_book = book_document({
            "title": title,
            "author": author,
            "isbn": isbn,
            "publisher": row.get("publisher", "").strip(),
            "publication_year": pub_year,
            "genre": row.get("genre", "").strip(),
            "description": row.get("description", "").strip(),
            "total_copies": max(1, total_copies),
            "available_copies": min(max(0, available_copies), max(1, total_copies)),
            "location": row.get("location", "").strip(),
            "price": max(0, price),
            "cover_image": row.get("cover_image", "").strip()
        })
        collection.insert_one(new_book)
        imported += 1

    return {
        "message": f"Import complete: {imported} added, {skipped} skipped",
        "imported": imported,
        "skipped": skipped,
        "errors": errors[:20]  # cap error messages
    }