from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any, List
from datetime import datetime
import base64
import json

from ..database import get_db
from ..core.security import get_current_admin

router = APIRouter(prefix="/api/v1/settings", tags=["System Settings"])

DEFAULT_SETTINGS = {
    "general": {
        "system_name": "Smart AI Library Management System",
        "tagline": "Modern Academic Library Portal",
        "contact_email": "admin@library.com",
        "contact_phone": "+1 (800) 555-0199",
        "timezone": "UTC",
        "date_format": "YYYY-MM-DD",
        "currency_symbol": "₹"
    },
    "library": {
        "operating_hours": "08:00 AM - 08:00 PM",
        "max_books_per_student": 5,
        "max_reservation_days": 7,
        "allow_renewals": True,
        "max_renew_count": 2
    },
    "borrow": {
        "default_borrow_days": 14,
        "grace_period_days": 2,
        "auto_remind_days_before": 3,
        "block_borrow_on_unpaid_fine": True,
        "max_fine_limit_for_borrow": 20.0
    },
    "fine": {
        "daily_fine_rate": 1.50,
        "max_fine_per_book": 50.00,
        "auto_generate_fines": True,
        "currency": "INR"
    },
    "email": {
        "enable_email_notifications": True,
        "smtp_host": "smtp.gmail.com",
        "smtp_port": 587,
        "smtp_user": "notifications@library.org",
        "sender_name": "Smart Library System"
    },
    "branding": {
        "logo": "",
        "favicon": ""
    }
}

class SystemSettingsSchema(BaseModel):
    general: Optional[Dict[str, Any]] = None
    library: Optional[Dict[str, Any]] = None
    borrow: Optional[Dict[str, Any]] = None
    fine: Optional[Dict[str, Any]] = None
    email: Optional[Dict[str, Any]] = None
    branding: Optional[Dict[str, Any]] = None

@router.get("/")
async def get_system_settings(db=Depends(get_db)):
    record = db.settings.find_one({"_id": "global_config"})
    if not record:
        db.settings.insert_one({"_id": "global_config", **DEFAULT_SETTINGS})
        return DEFAULT_SETTINGS
    
    # Merge with defaults in case of missing keys
    merged = {**DEFAULT_SETTINGS}
    for category in DEFAULT_SETTINGS:
        if category in record and isinstance(record[category], dict):
            merged[category] = {**DEFAULT_SETTINGS[category], **record[category]}
    return merged

@router.put("/")
async def update_system_settings(
    payload: SystemSettingsSchema,
    db=Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    existing = db.settings.find_one({"_id": "global_config"}) or {"_id": "global_config", **DEFAULT_SETTINGS}
    
    update_data = {}
    if payload.general:
        update_data["general"] = {**(existing.get("general") or {}), **payload.general}
    if payload.library:
        update_data["library"] = {**(existing.get("library") or {}), **payload.library}
    if payload.borrow:
        update_data["borrow"] = {**(existing.get("borrow") or {}), **payload.borrow}
    if payload.fine:
        update_data["fine"] = {**(existing.get("fine") or {}), **payload.fine}
    if payload.email:
        update_data["email"] = {**(existing.get("email") or {}), **payload.email}
    if payload.branding:
        update_data["branding"] = {**(existing.get("branding") or {}), **payload.branding}

    update_data["updated_at"] = datetime.utcnow()
    update_data["updated_by"] = current_admin.get("username", "admin")

    db.settings.update_one(
        {"_id": "global_config"},
        {"$set": update_data},
        upsert=True
    )
    return {"message": "System settings saved successfully"}

@router.post("/logo")
async def upload_logo(
    file: UploadFile = File(...),
    db=Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    contents = await file.read()
    if len(contents) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image size cannot exceed 2MB")

    base64_img = f"data:{file.content_type};base64," + base64.b64encode(contents).decode("utf-8")
    db.settings.update_one(
        {"_id": "global_config"},
        {"$set": {"branding.logo": base64_img}},
        upsert=True
    )
    return {"message": "Logo uploaded successfully", "logo": base64_img}

@router.post("/favicon")
async def upload_favicon(
    file: UploadFile = File(...),
    db=Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    contents = await file.read()
    if len(contents) > 512 * 1024: # 512KB limit
        raise HTTPException(status_code=400, detail="Favicon size cannot exceed 512KB")

    base64_img = f"data:{file.content_type};base64," + base64.b64encode(contents).decode("utf-8")
    db.settings.update_one(
        {"_id": "global_config"},
        {"$set": {"branding.favicon": base64_img}},
        upsert=True
    )
    return {"message": "Favicon uploaded successfully", "favicon": base64_img}

# Backup Export Endpoint
@router.get("/backup/export")
async def export_database_backup(
    db=Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    from fastapi.responses import StreamingResponse
    import io

    backup_data = {
        "version": "1.0",
        "exported_at": datetime.utcnow().isoformat(),
        "exported_by": current_admin.get("username", "admin"),
        "books": list(db.books.find({}, {"_id": 0})),
        "students": list(db.students.find({}, {"_id": 0})),
        "authors": list(db.authors.find({}, {"_id": 0})),
        "categories": list(db.categories.find({}, {"_id": 0})),
        "borrows": list(db.borrows.find({}, {"_id": 0})),
        "fines": list(db.fines.find({}, {"_id": 0})),
        "reservations": list(db.reservations.find({}, {"_id": 0}))
    }

    json_str = json.dumps(backup_data, indent=2, default=str)
    buffer = io.BytesIO(json_str.encode("utf-8"))

    filename = f"smart_library_backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
    return StreamingResponse(
        buffer,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# Backup Restore Endpoint
@router.post("/backup/restore")
async def restore_database_backup(
    file: UploadFile = File(...),
    db=Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    if not file.filename.endswith(".json"):
        raise HTTPException(status_code=400, detail="Only JSON backup files are accepted")

    contents = await file.read()
    try:
        data = json.loads(contents.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON backup file format")

    restored_summary = {}
    collections = ["books", "students", "authors", "categories", "borrows", "fines", "reservations"]
    
    for col in collections:
        items = data.get(col)
        if isinstance(items, list) and len(items) > 0:
            count = 0
            for item in items:
                # Upsert records by key identifiers
                if col == "books" and item.get("isbn"):
                    db.books.replace_one({"isbn": item["isbn"]}, item, upsert=True)
                    count += 1
                elif col == "students" and item.get("student_id"):
                    db.students.replace_one({"student_id": item["student_id"]}, item, upsert=True)
                    count += 1
                elif col == "authors" and item.get("name"):
                    db.authors.replace_one({"name": item["name"]}, item, upsert=True)
                    count += 1
                elif col == "categories" and item.get("name"):
                    db.categories.replace_one({"name": item["name"]}, item, upsert=True)
                    count += 1
                else:
                    db[col].insert_one(item)
                    count += 1
            restored_summary[col] = count

    return {
        "message": "Database backup restored successfully",
        "restored": restored_summary
    }
