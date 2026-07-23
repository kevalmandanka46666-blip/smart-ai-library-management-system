"""
Seed script: Create the default admin user in MongoDB.
Uses the same sync pymongo driver and bcrypt hashing as the running application.
"""
from pymongo import MongoClient
from app.config import settings
from app.core.security import security
from datetime import datetime

def create_admin():
    client = MongoClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    collection = db.users

    existing = collection.find_one({"email": "admin@library.com"})
    if existing:
        needs_fix = False
        # Fix legacy 'hashed_password' field
        if "hashed_password" in existing and "password" not in existing:
            collection.update_one(
                {"_id": existing["_id"]},
                {"$set": {"password": existing["hashed_password"]},
                 "$unset": {"hashed_password": ""}}
            )
            print("[FIXED] Admin had wrong field name - migrated hashed_password to password")
            needs_fix = True

        # Ensure required fields exist
        update_fields = {}
        if "username" not in existing or not existing["username"]:
            update_fields["username"] = "admin"
        if "role" not in existing or existing["role"] != "admin":
            update_fields["role"] = "admin"
        if "login_attempts" not in existing:
            update_fields["login_attempts"] = 0
        if "locked_until" not in existing:
            update_fields["locked_until"] = None

        if update_fields:
            collection.update_one({"_id": existing["_id"]}, {"$set": update_fields})
            print(f"[FIXED] Added missing fields: {list(update_fields.keys())}")
            needs_fix = True

        # Verify stored password hash actually matches 'Admin@123'
        admin = collection.find_one({"email": "admin@library.com"})
        stored_pw = admin.get("password", "")
        if not stored_pw or not security.verify_password("Admin@123", stored_pw):
            new_hash = security.hash_password("Admin@123")
            collection.update_one(
                {"_id": admin["_id"]},
                {"$set": {"password": new_hash, "login_attempts": 0, "locked_until": None}}
            )
            print("[FIXED] Password hash was invalid/corrupted - rehashed Admin@123")
            needs_fix = True
        else:
            # Reset lockout if account is locked
            if admin.get("login_attempts", 0) > 0 or admin.get("locked_until"):
                collection.update_one(
                    {"_id": admin["_id"]},
                    {"$set": {"login_attempts": 0, "locked_until": None}}
                )
                print("[FIXED] Reset login lockout counters")
                needs_fix = True

        if not needs_fix:
            print("[OK] Admin user already exists and is correctly configured")

        # Debug: show stored fields
        admin = collection.find_one({"email": "admin@library.com"})
        print(f"  Fields: {list(admin.keys())}")
        pw_ok = security.verify_password("Admin@123", admin.get("password", ""))
        print(f"  Password verify: {pw_ok}")
        print(f"  Role: {admin.get('role')}")
        print(f"  Username: {admin.get('username')}")
        client.close()
        return

    admin_data = {
        "email": "admin@library.com",
        "username": "admin",
        "password": security.hash_password("Admin@123"),
        "full_name": "Super Admin",
        "role": "admin",
        "is_active": True,
        "login_attempts": 0,
        "locked_until": None,
        "last_login": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    collection.insert_one(admin_data)
    print("[OK] Admin user created successfully")
    print("  Email:    admin@library.com")
    print("  Password: Admin@123")
    client.close()

if __name__ == "__main__":
    create_admin()