from datetime import datetime


def category_document(data: dict) -> dict:
    """Create MongoDB document from category data"""
    return {
        "name": data.get("name"),
        "description": data.get("description", ""),
        "status": data.get("status", "active"),
        "is_deleted": False,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }


def serialize_category(category: dict) -> dict:
    """Convert MongoDB document to dict with string id"""
    if category and "_id" in category:
        category["id"] = str(category["_id"])
        del category["_id"]
    return category


def serialize_categories(categories: list) -> list:
    """Convert list of MongoDB documents"""
    return [serialize_category(category) for category in categories]
