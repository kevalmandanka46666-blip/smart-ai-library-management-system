from datetime import datetime

def book_document(data: dict) -> dict:
    """Create MongoDB document from book data"""
    isbn = data.get("isbn", "")
    barcode_val = data.get("barcode_value")
    if not barcode_val:
        import uuid
        clean_isbn = "".join(filter(str.isalnum, isbn)) if isbn else ""
        suffix = clean_isbn if clean_isbn else uuid.uuid4().hex[:8].upper()
        barcode_val = f"LIB-{suffix}"

    qr_val = data.get("qr_value")
    if not qr_val:
        qr_val = f"QR-{barcode_val}"

    return {
        "title": data.get("title"),
        "author": data.get("author"),
        "isbn": isbn,
        "publisher": data.get("publisher", ""),
        "publication_year": data.get("publication_year"),
        "genre": data.get("genre", ""),
        "description": data.get("description", ""),
        "total_copies": data.get("total_copies", 1),
        "available_copies": data.get("available_copies", 1),
        "location": data.get("location", ""),
        "price": data.get("price", 0.0),
        "cover_image": data.get("cover_image", ""),
        "barcode_value": barcode_val,
        "qr_value": qr_val,
        "is_available": data.get("available_copies", 1) > 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

def serialize_book(book: dict) -> dict:
    """Convert MongoDB document to dict with string id"""
    if book and "_id" in book:
        book["id"] = str(book["_id"])
        del book["_id"]
    return book

def serialize_books(books: list) -> list:
    """Convert list of MongoDB documents"""
    return [serialize_book(book) for book in books]