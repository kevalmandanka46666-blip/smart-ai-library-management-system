from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from fastapi.responses import StreamingResponse
from typing import Optional
from datetime import datetime
from bson import ObjectId
import json
import io

from ..database import get_db
from ..core.security import get_current_admin
from ..utils.audit import record_audit_log

router = APIRouter(prefix="/api/v1/backups", tags=["Backup & Restore"])

def _serialize_backup(b: dict) -> dict:
    return {
        "id": str(b["_id"]),
        "filename": b.get("filename", ""),
        "file_size": b.get("file_size", 0),
        "record_counts": b.get("record_counts", {}),
        "total_records": b.get("total_records", 0),
        "created_at": b["created_at"].isoformat() if isinstance(b.get("created_at"), datetime) else str(b.get("created_at", "")),
        "created_by": b.get("created_by", "admin"),
        "status": b.get("status", "completed")
    }

# ─────────────────────────────────────────────
# 1. CREATE MANUAL BACKUP
# ─────────────────────────────────────────────
@router.post("/create", status_code=status.HTTP_201_CREATED)
async def create_manual_backup(
    db=Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    now = datetime.utcnow()
    filename = f"smart_library_backup_{now.strftime('%Y%m%d_%H%M%S')}.json"

    books = list(db.books.find({}, {"_id": 0}))
    students = list(db.students.find({}, {"_id": 0}))
    authors = list(db.authors.find({}, {"_id": 0}))
    categories = list(db.categories.find({}, {"_id": 0}))
    borrows = list(db.borrows.find({}, {"_id": 0}))
    fines = list(db.fines.find({}, {"_id": 0}))
    reservations = list(db.reservations.find({}, {"_id": 0}))

    record_counts = {
        "books": len(books),
        "students": len(students),
        "authors": len(authors),
        "categories": len(categories),
        "borrows": len(borrows),
        "fines": len(fines),
        "reservations": len(reservations)
    }
    total_records = sum(record_counts.values())

    backup_payload = {
        "version": "1.0",
        "exported_at": now.isoformat(),
        "exported_by": current_admin.get("username", "admin"),
        "record_counts": record_counts,
        "books": books,
        "students": students,
        "authors": authors,
        "categories": categories,
        "borrows": borrows,
        "fines": fines,
        "reservations": reservations
    }

    json_str = json.dumps(backup_payload, indent=2, default=str)
    file_size = len(json_str.encode("utf-8"))

    # Store entry in MongoDB backup_history
    doc = {
        "filename": filename,
        "file_size": file_size,
        "record_counts": record_counts,
        "total_records": total_records,
        "payload": json_str,
        "created_at": now,
        "created_by": current_admin.get("username", "admin"),
        "status": "completed"
    }
    res = db.backup_history.insert_one(doc)

    record_audit_log(
        db, current_admin, "BACKUP_CREATE", "System Backup",
        f"Created manual backup {filename} ({total_records} records, {file_size} bytes)"
    )

    return {
        "message": "Manual backup created successfully",
        "backup": {
            "id": str(res.inserted_id),
            "filename": filename,
            "file_size": file_size,
            "record_counts": record_counts,
            "total_records": total_records,
            "created_at": now.isoformat()
        }
    }

# ─────────────────────────────────────────────
# 2. BACKUP HISTORY LIST
# ─────────────────────────────────────────────
@router.get("/history")
async def get_backup_history(
    db=Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    cursor = db.backup_history.find().sort("created_at", -1)
    history = [_serialize_backup(b) for b in cursor]
    return history

# ─────────────────────────────────────────────
# 3. DOWNLOAD BACKUP BY ID
# ─────────────────────────────────────────────
@router.get("/{backup_id}/download")
async def download_backup_by_id(
    backup_id: str,
    db=Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    if not ObjectId.is_valid(backup_id):
        raise HTTPException(status_code=400, detail="Invalid Backup ID format")

    doc = db.backup_history.find_one({"_id": ObjectId(backup_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Backup record not found")

    payload_str = doc.get("payload", "{}")
    buffer = io.BytesIO(payload_str.encode("utf-8"))

    record_audit_log(
        db, current_admin, "BACKUP_DOWNLOAD", "System Backup",
        f"Downloaded backup {doc.get('filename')}"
    )

    return StreamingResponse(
        buffer,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={doc.get('filename', 'backup.json')}"}
    )

# ─────────────────────────────────────────────
# 4. RESTORE FROM BACKUP (FILE OR BACKUP ID)
# ─────────────────────────────────────────────
@router.post("/restore")
async def restore_backup(
    file: Optional[UploadFile] = File(None),
    backup_id: Optional[str] = Query(None),
    db=Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    data = None

    if file:
        if not file.filename.endswith(".json"):
            raise HTTPException(status_code=400, detail="Only JSON backup files are accepted")
        contents = await file.read()
        try:
            data = json.loads(contents.decode("utf-8"))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid JSON backup file format")
    elif backup_id:
        if not ObjectId.is_valid(backup_id):
            raise HTTPException(status_code=400, detail="Invalid Backup ID format")
        doc = db.backup_history.find_one({"_id": ObjectId(backup_id)})
        if not doc:
            raise HTTPException(status_code=404, detail="Backup record not found")
        data = json.loads(doc.get("payload", "{}"))
    else:
        raise HTTPException(status_code=400, detail="Please provide either a backup file or a backup_id")

    restored_summary = {}
    collections = ["books", "students", "authors", "categories", "borrows", "fines", "reservations"]

    for col in collections:
        items = data.get(col)
        if isinstance(items, list) and len(items) > 0:
            count = 0
            for item in items:
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

    record_audit_log(
        db, current_admin, "BACKUP_RESTORE", "System Disaster Recovery",
        f"Restored database records from backup: {restored_summary}"
    )

    return {
        "message": "Database restored successfully",
        "restored": restored_summary
    }

# ─────────────────────────────────────────────
# 5. DELETE BACKUP HISTORY ENTRY
# ─────────────────────────────────────────────
@router.delete("/{backup_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_backup(
    backup_id: str,
    db=Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    if not ObjectId.is_valid(backup_id):
        raise HTTPException(status_code=400, detail="Invalid Backup ID format")

    res = db.backup_history.delete_one({"_id": ObjectId(backup_id)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Backup record not found")

    record_audit_log(
        db, current_admin, "BACKUP_DELETE", "System Backup",
        f"Deleted backup record {backup_id}"
    )
    return None
