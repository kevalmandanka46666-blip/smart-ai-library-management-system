from fastapi import APIRouter, Depends, Query
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Optional

from ..database import get_db
from ..core.security import get_current_admin, get_current_user

router = APIRouter(prefix="/api/v1/analytics", tags=["Analytics"])


# ─────────────────────────────────────────────
# Helper
# ─────────────────────────────────────────────
def _date_key(dt, granularity: str) -> str:
    if not dt:
        return "Unknown"
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
        except Exception:
            return "Unknown"
    if granularity == "daily":
        return dt.strftime("%Y-%m-%d")
    elif granularity == "weekly":
        monday = dt - timedelta(days=dt.weekday())
        return monday.strftime("%Y-W%V")
    else:  # monthly
        return dt.strftime("%Y-%m")


# ─────────────────────────────────────────────
# 1. FULL DASHBOARD KPI SUMMARY
# ─────────────────────────────────────────────
@router.get("/dashboard")
async def get_dashboard_analytics(db=Depends(get_db), current_user=Depends(get_current_user)):
    now = datetime.utcnow()
    start_30 = now - timedelta(days=30)
    start_7 = now - timedelta(days=7)

    # ── Books — use estimated_document_count for unfiltered, count_documents for filtered ──
    total_books = db.books.estimated_document_count()
    available_books = db.books.count_documents({"is_available": True})
    issued_books = total_books - available_books

    # Genre breakdown — aggregation pipeline instead of Python loop
    genre_pipeline = [
        {"$group": {"_id": {"$ifNull": ["$genre", "Uncategorized"]}, "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 20}
    ]
    books_by_genre = [
        {"genre": doc["_id"], "count": doc["count"]}
        for doc in db.books.aggregate(genre_pipeline)
    ]

    # ── Borrows — combine count queries into single aggregation ──
    borrow_stats_pipeline = [
        {"$facet": {
            "active": [{"$match": {"status": "issued"}}, {"$count": "n"}],
            "returned": [{"$match": {"status": "returned"}}, {"$count": "n"}],
            "overdue": [{"$match": {"status": "issued", "due_date": {"$lt": now}}}, {"$count": "n"}],
            "new_7d": [{"$match": {"issue_date": {"$gte": start_7}}}, {"$count": "n"}],
        }}
    ]
    borrow_facets = list(db.borrows.aggregate(borrow_stats_pipeline))
    bs = borrow_facets[0] if borrow_facets else {}
    total_issued = bs.get("active", [{}])[0].get("n", 0) if bs.get("active") else 0
    total_returned = bs.get("returned", [{}])[0].get("n", 0) if bs.get("returned") else 0
    overdue_count = bs.get("overdue", [{}])[0].get("n", 0) if bs.get("overdue") else 0
    new_issues_7d = bs.get("new_7d", [{}])[0].get("n", 0) if bs.get("new_7d") else 0

    # ── Students ──
    total_students = db.students.estimated_document_count()
    active_students = db.students.count_documents({"is_active": True})

    # Active borrowers in last 30 days — aggregation with $group instead of distinct
    active_borrowers_pipeline = [
        {"$match": {"issue_date": {"$gte": start_30}}},
        {"$group": {"_id": "$student_id"}},
        {"$count": "n"}
    ]
    ab_result = list(db.borrows.aggregate(active_borrowers_pipeline))
    active_borrowers_30d = ab_result[0]["n"] if ab_result else 0

    # ── Fines — single aggregation for paid/unpaid totals ──
    fine_pipeline = [
        {"$group": {
            "_id": "$paid",
            "total": {"$sum": "$amount"},
            "count": {"$sum": 1}
        }}
    ]
    fine_stats = {doc["_id"]: doc for doc in db.fines.aggregate(fine_pipeline)}
    unpaid = fine_stats.get(False, {})
    paid = fine_stats.get(True, {})
    total_unpaid_fines = round(unpaid.get("total", 0), 2)
    unpaid_fines_count = unpaid.get("count", 0)
    total_collected_fines = round(paid.get("total", 0), 2)

    # ── Popular books — aggregation pipeline (top 10 most borrowed) ──
    popular_pipeline = [
        {"$group": {
            "_id": "$book_id",
            "title": {"$first": "$book_title"},
            "borrow_count": {"$sum": 1}
        }},
        {"$sort": {"borrow_count": -1}},
        {"$limit": 10},
        {"$project": {"_id": 0, "book_id": "$_id", "title": 1, "borrow_count": 1}}
    ]
    popular_books = list(db.borrows.aggregate(popular_pipeline))

    # ── Top students — aggregation pipeline (top 10 borrowers) ──
    top_students_pipeline = [
        {"$group": {
            "_id": "$student_id",
            "name": {"$first": "$student_name"},
            "borrow_count": {"$sum": 1}
        }},
        {"$sort": {"borrow_count": -1}},
        {"$limit": 10},
        {"$project": {"_id": 0, "student_id": "$_id", "name": 1, "borrow_count": 1}}
    ]
    top_students = list(db.borrows.aggregate(top_students_pipeline))

    start_90 = now - timedelta(days=90)

    # ── Borrow trend (last 90 days) — aggregation pipelines ──
    trend_issue_pipeline = [
        {"$match": {"issue_date": {"$gte": start_90}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$issue_date"}},
            "count": {"$sum": 1}
        }}
    ]
    daily_issue = {doc["_id"]: doc["count"] for doc in db.borrows.aggregate(trend_issue_pipeline)}

    trend_return_pipeline = [
        {"$match": {"return_date": {"$gte": start_90, "$ne": None}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$return_date"}},
            "count": {"$sum": 1}
        }}
    ]
    daily_return = {doc["_id"]: doc["count"] for doc in db.borrows.aggregate(trend_return_pipeline)}

    # Build 90 day labels
    trend_labels = []
    trend_issues = []
    trend_returns = []
    for i in range(89, -1, -1):
        day = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        trend_labels.append(day)
        trend_issues.append(daily_issue.get(day, 0))
        trend_returns.append(daily_return.get(day, 0))

    # ── Recent transactions (last 10) — projection ──
    RECENT_PROJ = {
        "student_name": 1, "book_title": 1, "issue_date": 1,
        "due_date": 1, "return_date": 1, "status": 1
    }
    recent_transactions = []
    for borrow in db.borrows.find({}, RECENT_PROJ).sort("issue_date", -1).limit(10):
        recent_transactions.append({
            "student_name": borrow.get("student_name", "Unknown"),
            "book_title": borrow.get("book_title", "Unknown"),
            "issue_date": borrow["issue_date"].isoformat() if borrow.get("issue_date") else None,
            "due_date": borrow["due_date"].isoformat() if borrow.get("due_date") else None,
            "return_date": borrow["return_date"].isoformat() if borrow.get("return_date") else None,
            "status": borrow.get("status", "unknown"),
            "overdue": borrow.get("status") == "issued" and borrow.get("due_date") and borrow["due_date"] < now
        })

    return {
        "books": {
            "total": total_books,
            "available": available_books,
            "issued": issued_books,
            "by_genre": books_by_genre
        },
        "borrows": {
            "total_active": total_issued,
            "total_returned": total_returned,
            "overdue_count": overdue_count,
            "total_transactions": total_issued + total_returned,
            "new_issues_7d": new_issues_7d,
            "clearance_rate": round(
                (total_returned / max(total_issued + total_returned, 1)) * 100, 1
            )
        },
        "students": {
            "total": total_students,
            "active": active_students,
            "active_borrowers_30d": active_borrowers_30d
        },
        "fines": {
            "total_unpaid": total_unpaid_fines,
            "count_unpaid": unpaid_fines_count,
            "total_collected": total_collected_fines
        },
        "popular_books": popular_books,
        "top_students": top_students,
        "trend": {
            "labels": trend_labels,
            "issues": trend_issues,
            "returns": trend_returns
        },
        "recent_transactions": recent_transactions
    }


# ─────────────────────────────────────────────
# 2. FILTERED REPORTS (daily / weekly / monthly)
# ─────────────────────────────────────────────
@router.get("/reports")
async def get_reports(
    granularity: str = Query("monthly", pattern="^(daily|weekly|monthly)$"),
    period: int = Query(12, ge=1, le=365),
    db=Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    now = datetime.utcnow()

    if granularity == "daily":
        start = now - timedelta(days=period)
    elif granularity == "weekly":
        start = now - timedelta(weeks=period)
    else:
        start = now - timedelta(days=period * 30)

    # Date format string for MongoDB $dateToString
    if granularity == "daily":
        date_fmt = "%Y-%m-%d"
    elif granularity == "weekly":
        date_fmt = "%Y-W%V"
    else:
        date_fmt = "%Y-%m"

    # ── Issue trend — aggregation ──
    issue_agg = list(db.borrows.aggregate([
        {"$match": {"issue_date": {"$gte": start}}},
        {"$group": {
            "_id": {"$dateToString": {"format": date_fmt, "date": "$issue_date"}},
            "count": {"$sum": 1}
        }}
    ]))
    issue_buckets = {doc["_id"]: doc["count"] for doc in issue_agg}

    # ── Return trend — aggregation ──
    return_agg = list(db.borrows.aggregate([
        {"$match": {"return_date": {"$gte": start, "$ne": None}}},
        {"$group": {
            "_id": {"$dateToString": {"format": date_fmt, "date": "$return_date"}},
            "count": {"$sum": 1}
        }}
    ]))
    return_buckets = {doc["_id"]: doc["count"] for doc in return_agg}

    # ── Fine trend — aggregation ──
    fine_agg = list(db.fines.aggregate([
        {"$match": {"created_at": {"$gte": start}}},
        {"$group": {
            "_id": {"$dateToString": {"format": date_fmt, "date": "$created_at"}},
            "total": {"$sum": "$amount"}
        }}
    ]))
    fine_buckets = {doc["_id"]: round(doc["total"], 2) for doc in fine_agg}

    all_keys = sorted(set(list(issue_buckets.keys()) + list(return_buckets.keys()) + list(fine_buckets.keys())))

    trend = [
        {
            "period": k,
            "issues": issue_buckets.get(k, 0),
            "returns": return_buckets.get(k, 0),
            "fines": fine_buckets.get(k, 0)
        }
        for k in all_keys
    ]

    # ── Summary stats — combine into $facet ──
    summary_pipeline = [
        {"$facet": {
            "total_issues": [
                {"$match": {"issue_date": {"$gte": start}}},
                {"$count": "n"}
            ],
            "total_returns": [
                {"$match": {"return_date": {"$gte": start, "$ne": None}}},
                {"$count": "n"}
            ],
            "overdue": [
                {"$match": {"status": "issued", "due_date": {"$lt": now, "$gte": start}}},
                {"$count": "n"}
            ]
        }}
    ]
    summary_result = list(db.borrows.aggregate(summary_pipeline))
    sr = summary_result[0] if summary_result else {}
    total_issues_in_range = sr.get("total_issues", [{}])[0].get("n", 0) if sr.get("total_issues") else 0
    total_returns_in_range = sr.get("total_returns", [{}])[0].get("n", 0) if sr.get("total_returns") else 0
    overdue_in_range = sr.get("overdue", [{}])[0].get("n", 0) if sr.get("overdue") else 0

    # Fine totals via aggregation
    fine_summary_pipeline = [
        {"$facet": {
            "generated": [
                {"$match": {"created_at": {"$gte": start}}},
                {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
            ],
            "collected": [
                {"$match": {"paid": True, "paid_at": {"$gte": start}}},
                {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
            ]
        }}
    ]
    fine_summary = list(db.fines.aggregate(fine_summary_pipeline))
    fs = fine_summary[0] if fine_summary else {}
    total_fines_in_range = round(fs.get("generated", [{}])[0].get("total", 0), 2) if fs.get("generated") else 0
    fines_collected_in_range = round(fs.get("collected", [{}])[0].get("total", 0), 2) if fs.get("collected") else 0

    # ── Fine detail list — with projection ──
    FINE_PROJ = {
        "student_id": 1, "student_name": 1, "book_title": 1,
        "amount": 1, "reason": 1, "created_at": 1, "paid": 1
    }
    fine_list = []
    for f in db.fines.find({"created_at": {"$gte": start}}, FINE_PROJ).sort("created_at", -1).limit(100):
        fine_list.append({
            "student_id": f.get("student_id"),
            "student_name": f.get("student_name", "Unknown"),
            "book_title": f.get("book_title", "Unknown"),
            "amount": f.get("amount", 0),
            "reason": f.get("reason", "Late Return"),
            "created_at": f["created_at"].isoformat() if f.get("created_at") else None,
            "paid": f.get("paid", False)
        })

    # ── Issue/Return detail list — with projection ──
    BORROW_PROJ = {
        "student_id": 1, "student_name": 1, "book_title": 1,
        "issue_date": 1, "due_date": 1, "return_date": 1, "status": 1
    }
    issue_return_list = []
    for b in db.borrows.find({"issue_date": {"$gte": start}}, BORROW_PROJ).sort("issue_date", -1).limit(100):
        issue_return_list.append({
            "student_id": b.get("student_id"),
            "student_name": b.get("student_name", "Unknown"),
            "book_title": b.get("book_title", "Unknown"),
            "issue_date": b["issue_date"].isoformat() if b.get("issue_date") else None,
            "due_date": b["due_date"].isoformat() if b.get("due_date") else None,
            "return_date": b["return_date"].isoformat() if b.get("return_date") else None,
            "status": b.get("status", "unknown")
        })

    return {
        "granularity": granularity,
        "period": period,
        "summary": {
            "total_issues": total_issues_in_range,
            "total_returns": total_returns_in_range,
            "overdue": overdue_in_range,
            "total_fines_generated": total_fines_in_range,
            "fines_collected": fines_collected_in_range
        },
        "trend": trend,
        "fine_list": fine_list,
        "issue_return_list": issue_return_list
    }
