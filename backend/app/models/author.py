from datetime import datetime


def author_document(data: dict) -> dict:
    """Create MongoDB document from author data"""
    return {
        "name": data.get("name"),
        "biography": data.get("biography", ""),
        "birth_date": data.get("birth_date", ""),
        "nationality": data.get("nationality", ""),
        "status": data.get("status", "active"),
        "is_deleted": False,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }


def serialize_author(author: dict) -> dict:
    """Convert MongoDB document to dict with string id"""
    if author and "_id" in author:
        author["id"] = str(author["_id"])
        del author["_id"]
    return author


def serialize_authors(authors: list) -> list:
    """Convert list of MongoDB documents"""
    return [serialize_author(author) for author in authors]
