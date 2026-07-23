"""
Universal Advanced Search endpoint.
Supports: books (title, isbn, author, genre, publisher, availability) + students (name, id, email, course, department).
Returns paginated results with field-level match metadata for frontend highlighting.
"""
from fastapi import APIRouter, Depends, Query
from typing import Optional
from datetime import datetime

from ..database import get_db
from ..core.security import get_current_user, get_current_admin

router = APIRouter(prefix="/api/v1/search", tags=["Advanced Search"])


def _esc(s: str) -> str:
    """Escape regex special characters for literal matching."""
    import re
    return re.escape(s)


def _highlight_fields(doc: dict, term: str, fields: list) -> dict:
    """Return a dict of {field: matched_portion} for client-side highlight."""
    import re
    if not term:
        return {}
    pattern = re.compile(re.escape(term), re.IGNORECASE)
    matches = {}
    for f in fields:
        val = str(doc.get(f, ""))
        if pattern.search(val):
            matches[f] = val
    return matches


# ─────────────────────────────────────────────
# BOOK SEARCH
# ─────────────────────────────────────────────
@router.get("/books")
async def search_books_advanced(
    q: Optional[str] = Query(None, description="Free-text: title, author, ISBN, publisher"),
    title: Optional[str] = Query(None),
    isbn: Optional[str] = Query(None),
    author: Optional[str] = Query(None),
    genre: Optional[str] = Query(None),
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
    filt: dict = {}

    # Free-text across key fields
    if q and q.strip():
        filt["$or"] = [
            {"title": {"$regex": _esc(q.strip()), "$options": "i"}},
            {"author": {"$regex": _esc(q.strip()), "$options": "i"}},
            {"isbn": {"$regex": _esc(q.strip()), "$options": "i"}},
            {"publisher": {"$regex": _esc(q.strip()), "$options": "i"}},
            {"genre": {"$regex": _esc(q.strip()), "$options": "i"}},
        ]

    if title:
        filt["title"] = {"$regex": _esc(title), "$options": "i"}
    if isbn:
        filt["isbn"] = {"$regex": _esc(isbn), "$options": "i"}
    if author:
        filt["author"] = {"$regex": _esc(author), "$options": "i"}
    if genre:
        filt["genre"] = {"$regex": f"^{_esc(genre)}$", "$options": "i"}
    if publisher:
        filt["publisher"] = {"$regex": _esc(publisher), "$options": "i"}
    if is_available is not None:
        filt["is_available"] = is_available
    if year_from is not None:
        filt.setdefault("publication_year", {})["$gte"] = year_from
    if year_to is not None:
        filt.setdefault("publication_year", {})["$lte"] = year_to

    total = db.books.count_documents(filt)
    total_pages = max(1, -(-total // page_size))
    skip = (page - 1) * page_size
    sort_dir = 1 if sort_order == "asc" else -1

    cursor = db.books.find(filt).sort(sort_by, sort_dir).skip(skip).limit(page_size)

    highlight_term = q or title or isbn or author or genre or publisher or ""
    book_fields = ["title", "author", "isbn", "publisher", "genre"]

    results = []
    for doc in cursor:
        results.append({
            "id": str(doc["_id"]),
            "title": doc.get("title", ""),
            "author": doc.get("author", ""),
            "isbn": doc.get("isbn", ""),
            "publisher": doc.get("publisher", ""),
            "genre": doc.get("genre", ""),
            "publication_year": doc.get("publication_year"),
            "available_copies": doc.get("available_copies", 0),
            "total_copies": doc.get("total_copies", 0),
            "is_available": doc.get("is_available", False),
            "price": doc.get("price", 0),
            "location": doc.get("location", ""),
            "cover_image": doc.get("cover_image", ""),
            "_highlights": _highlight_fields(doc, highlight_term, book_fields)
        })

    return {
        "entity": "books",
        "results": results,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "query": highlight_term,
        "filters": {
            "q": q, "title": title, "isbn": isbn, "author": author,
            "genre": genre, "publisher": publisher, "is_available": is_available,
            "year_from": year_from, "year_to": year_to
        }
    }


# ─────────────────────────────────────────────
# STUDENT SEARCH  (admin only)
# ─────────────────────────────────────────────
@router.get("/students")
async def search_students_advanced(
    q: Optional[str] = Query(None, description="Free-text: name, ID, email, course, department"),
    student_id: Optional[str] = Query(None),
    course: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    sort_by: str = Query("full_name", pattern="^(full_name|student_id|email|course|department|created_at)$"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    db=Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    filt: dict = {}

    if q and q.strip():
        filt["$or"] = [
            {"full_name": {"$regex": _esc(q.strip()), "$options": "i"}},
            {"student_id": {"$regex": _esc(q.strip()), "$options": "i"}},
            {"email": {"$regex": _esc(q.strip()), "$options": "i"}},
            {"course": {"$regex": _esc(q.strip()), "$options": "i"}},
            {"department": {"$regex": _esc(q.strip()), "$options": "i"}},
        ]

    if student_id:
        filt["student_id"] = {"$regex": _esc(student_id), "$options": "i"}
    if course:
        filt["course"] = {"$regex": _esc(course), "$options": "i"}
    if department:
        filt["department"] = {"$regex": _esc(department), "$options": "i"}
    if is_active is not None:
        filt["is_active"] = is_active

    total = db.students.count_documents(filt)
    total_pages = max(1, -(-total // page_size))
    skip = (page - 1) * page_size
    sort_dir = 1 if sort_order == "asc" else -1

    cursor = db.students.find(filt).sort(sort_by, sort_dir).skip(skip).limit(page_size)

    highlight_term = q or student_id or course or department or ""
    student_fields = ["full_name", "student_id", "email", "course", "department"]

    results = []
    for doc in cursor:
        results.append({
            "id": str(doc["_id"]),
            "student_id": doc.get("student_id", ""),
            "full_name": doc.get("full_name", ""),
            "email": doc.get("email", ""),
            "course": doc.get("course", ""),
            "department": doc.get("department", ""),
            "semester": doc.get("semester"),
            "is_active": doc.get("is_active", True),
            "_highlights": _highlight_fields(doc, highlight_term, student_fields)
        })

    return {
        "entity": "students",
        "results": results,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "query": highlight_term
    }


# ─────────────────────────────────────────────
# UNIFIED GLOBAL SEARCH  (returns top N from each entity)
# ─────────────────────────────────────────────
@router.get("/global")
async def global_search(
    q: str = Query(..., min_length=1),
    limit: int = Query(5, ge=1, le=20),
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    is_admin = current_user.get("role") == "admin"

    book_filt = {
        "$or": [
            {"title": {"$regex": _esc(q), "$options": "i"}},
            {"author": {"$regex": _esc(q), "$options": "i"}},
            {"isbn": {"$regex": _esc(q), "$options": "i"}},
            {"publisher": {"$regex": _esc(q), "$options": "i"}},
        ]
    }
    book_proj = {"title": 1, "author": 1, "is_available": 1}
    book_docs = list(db.books.find(book_filt, book_proj).limit(limit))
    books = [{
        "id": str(d["_id"]),
        "entity": "book",
        "title": d.get("title", ""),
        "subtitle": d.get("author", ""),
        "badge": "Available" if d.get("is_available") else "Unavailable",
        "badge_ok": d.get("is_available", False),
        "url": f"/books/{d['_id']}"
    } for d in book_docs]

    students = []
    if is_admin:
        st_filt = {
            "$or": [
                {"full_name": {"$regex": _esc(q), "$options": "i"}},
                {"student_id": {"$regex": _esc(q), "$options": "i"}},
                {"email": {"$regex": _esc(q), "$options": "i"}},
            ]
        }
        st_proj = {"full_name": 1, "student_id": 1, "is_active": 1}
        st_docs = list(db.students.find(st_filt, st_proj).limit(limit))
        students = [{
            "id": str(d["_id"]),
            "entity": "student",
            "title": d.get("full_name", ""),
            "subtitle": d.get("student_id", ""),
            "badge": "Active" if d.get("is_active") else "Inactive",
            "badge_ok": d.get("is_active", True),
            "url": "/students"
        } for d in st_docs]

    return {
        "q": q,
        "books": books,
        "students": students,
        "total": len(books) + len(students)
    }
