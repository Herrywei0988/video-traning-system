"""
auth.py — Password hashing and JWT handling
"""
import os
import jwt
import uuid
import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict
from fastapi import HTTPException, Depends, Header

import database as db

JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-production-please")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "24"))

if JWT_SECRET == "change-me-in-production-please" or len(JWT_SECRET) < 32:
    print("[WARNING] JWT_SECRET is weak or default. Set a strong secret in .env")


# ── Password hashing ─────────────────────────────────────

def hash_password(password: str) -> str:
    """Hash a plaintext password with bcrypt."""
    if not password or len(password) < 6:
        raise ValueError("密碼至少需要 6 個字元")
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(password: str, password_hash: str) -> bool:
    """Verify a plaintext password against a stored hash."""
    try:
        return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
    except Exception:
        return False


# ── JWT ──────────────────────────────────────────────────

def create_token(user_id: str) -> str:
    """Create a JWT for the given user_id."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "iat": now,
        "exp": now + timedelta(hours=JWT_EXPIRE_HOURS),
        "jti": str(uuid.uuid4()),  # unique token id
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> Optional[Dict]:
    """Decode and validate a JWT. Returns payload or None if invalid/expired."""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


# ── FastAPI dependencies ─────────────────────────────────

async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict:
    """
    FastAPI dependency. Extracts user from Authorization: Bearer <token> header.
    Raises 401 if no token, invalid token, or user not found.
    """
    if not authorization:
        raise HTTPException(401, "未登入")
    
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(401, "Authorization header 格式錯誤")
    
    token = parts[1]
    payload = decode_token(token)
    if not payload:
        raise HTTPException(401, "Token 無效或已過期")
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(401, "Token 格式錯誤")
    
    user = db.get_user(user_id)
    if not user or not user.get("is_active"):
        raise HTTPException(401, "使用者不存在或已停用")
    
    return db.public_user(user)


async def require_admin(user: Dict = Depends(get_current_user)) -> Dict:
    """Dependency that requires admin role."""
    if user.get("role") != "admin":
        raise HTTPException(403, "需要管理員權限")
    return user

# ── Stream token（短期、單支影片專用）─────────────

STREAM_TOKEN_EXP_SECONDS = 7200  # 2 小時


def create_stream_token(user_id: str, video_id: str) -> str:
    """
    發一張「只能播這支影片、5 分鐘有效」的門票。
    跟 login token 用同一把 secret key，但 payload 不同。
    """
    import time
    payload = {
        "kind": "stream",
        "user_id": user_id,
        "video_id": video_id,
        "iat": int(time.time()),
        "exp": int(time.time()) + STREAM_TOKEN_EXP_SECONDS,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_stream_token(token: str, expected_video_id: str) -> Optional[str]:
    """
    驗票。成功回傳 user_id，失敗回 None。
    - 過期 → 失敗
    - 影片 ID 不符 → 失敗（防止用 A 影片的票偷看 B 影片）
    - 不是 stream token → 失敗
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception:
        return None
    if payload.get("kind") != "stream":
        return None
    if payload.get("video_id") != expected_video_id:
        return None
    return payload.get("user_id")