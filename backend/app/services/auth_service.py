from app.config.database import users_collection
from app.utils.security import verify_password
from app.utils.jwt_handler import create_access_token


async def login_user(email: str, password: str):

    user = await users_collection.find_one({
        "email": email
    })

    if not user:
        return None

    if not verify_password(
        password,
        user["hashed_password"]
    ):
        return None

    token = create_access_token({
        "user_id": str(user["_id"]),
        "email": user["email"],
        "role": user["role"]
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "full_name": user["full_name"],
            "email": user["email"],
            "role": user["role"]
        }
    }