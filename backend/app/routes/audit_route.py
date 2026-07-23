from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional
from datetime import datetime

from ..database import get_db
from ..core.security import get_current_admin

router = APIRouter(prefix="/api/v1/audit-logs", tags=["Audit Logs"])

def _esc(s: str) -> str:
    import re
    return re.escape(s)

@router.get("/")
async def get_audit_logs(
    query: Optional[str] = Query(None, description="Search username, action, resource, details"),
    action: Optional[str] = Query(None, description="LOGIN, ISSUE_BOOK, RETURN_BOOK, CREATE_BOOK, UPDATE_BOOK, DELETE_BOOK, SETTINGS_UPDATE"),
    role: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db=Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    filt: dict = {}

    if query and query.strip():
        q_esc = _esc(query.strip())
        filt["$or"] = [
            {"username": {"$regex": q_esc, "$options": "i"}},
            {"action": {"$regex": q_esc, "$options": "i"}},
            {"resource": {"$regex": q_esc, "$options": "i"}},
            {"details": {"$regex": q_esc, "$options": "i"}},
        ]

    if action:
        filt["action"] = {"$regex": f"^{_esc(action)}$", "$options": "i"}

    if role:
        filt["role"] = {"$regex": f"^{_esc(role)}$", "$options": "i"}

    if date_from or date_to:
        dt_range = {}
        if date_from:
            try: dt_range["$gte"] = datetime.fromisoformat(date_from.replace("Z", "+00:00"))
            except Exception: pass
        if date_to:
            try: dt_range["$lte"] = datetime.fromisoformat(date_to.replace("Z", "+00:00"))
            except Exception: pass
        if dt_range:
            filt["timestamp"] = dt_range

    total = db.audit_logs.count_documents(filt)
    total_pages = max(1, -(-total // page_size))
    skip = (page - 1) * page_size

    cursor = db.audit_logs.find(filt).sort("timestamp", -1).skip(skip).limit(page_size)

    logs = []
    for log in cursor:
        logs.append({
            "id": str(log["_id"]),
            "username": log.get("username", "System"),
            "role": log.get("role", "admin"),
            "action": log.get("action", "ACTION"),
            "resource": log.get("resource", "General"),
            "details": log.get("details", ""),
            "timestamp": log["timestamp"].isoformat() if isinstance(log.get("timestamp"), datetime) else str(log.get("timestamp", ""))
        })

    return {
        "logs": logs,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }

@router.get("/export/csv")
async def export_audit_logs_csv(
    query: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    db=Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    import csv
    import io
    from fastapi.responses import StreamingResponse

    filt: dict = {}
    if query and query.strip():
        q_esc = _esc(query.strip())
        filt["$or"] = [
            {"username": {"$regex": q_esc, "$options": "i"}},
            {"action": {"$regex": q_esc, "$options": "i"}},
            {"resource": {"$regex": q_esc, "$options": "i"}},
            {"details": {"$regex": q_esc, "$options": "i"}},
        ]
    if action: filt["action"] = {"$regex": f"^{_esc(action)}$", "$options": "i"}
    if role: filt["role"] = {"$regex": f"^{_esc(role)}$", "$options": "i"}

    cursor = db.audit_logs.find(filt).sort("timestamp", -1).limit(2000)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Timestamp", "Username", "Role", "Action", "Resource", "Details"])

    for log in cursor:
        ts = log["timestamp"].isoformat() if isinstance(log.get("timestamp"), datetime) else str(log.get("timestamp", ""))
        writer.writerow([
            ts,
            log.get("username", "System"),
            log.get("role", "admin"),
            log.get("action", ""),
            log.get("resource", ""),
            log.get("details", "")
        ])

    output.seek(0)
    filename = f"audit_logs_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
