"""
seed.py — Initialize database with a default admin account and headquarters branch.
Run this once after setting up the database.

Usage:
    cd backend
    python seed.py
"""
import os
import sys
import uuid
from dotenv import load_dotenv

load_dotenv()

import database as db
import auth


def seed():
    db.init_db()

    # Create headquarters branch if not exists
    hq = db.get_branch_by_code("HQ")
    if not hq:
        hq_id = str(uuid.uuid4())
        hq = db.create_branch(hq_id, "長頸鹿總部", "HQ", is_headquarters=True)
        print(f"✅ 建立總部分校：{hq['name']} (code={hq['code']})")
    else:
        print(f"ℹ️  總部已存在：{hq['name']}")

    # Create default admin if not exists
    admin_email = os.getenv("SEED_ADMIN_EMAIL", "admin@giraffe.local")
    admin_password = os.getenv("SEED_ADMIN_PASSWORD", "admin123456")
    admin_name = os.getenv("SEED_ADMIN_NAME", "總部管理員")

    existing = db.get_user_by_email(admin_email)
    if existing:
        print(f"ℹ️  Admin 已存在：{admin_email}")
    else:
        user_id = str(uuid.uuid4())
        password_hash = auth.hash_password(admin_password)
        db.create_user(
            user_id=user_id,
            email=admin_email,
            password_hash=password_hash,
            name=admin_name,
            role="admin",
            branch_id=hq["id"],
        )
        print(f"✅ 建立 Admin 帳號：")
        print(f"   Email:    {admin_email}")
        print(f"   Password: {admin_password}")
        print(f"   Name:     {admin_name}")
        print()
        print("⚠️  請務必登入後盡快修改預設密碼！")


if __name__ == "__main__":
    seed()