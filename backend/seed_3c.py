"""
seed_3c.py — Sprint 3C Phase 2: 建測試用的客戶分校 + teacher 帳號，並把一支影片標為 confidential

跑法：
    cd backend
    python seed_3c.py

冪等：跑兩次沒事（第二次會顯示「已存在」）
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

    # 1. 建「台北分校」客戶
    existing = db.get_branch_by_code("TPE")
    if existing:
        tpe = existing
        print(f"ℹ️  台北分校已存在：{tpe['name']}")
    else:
        tpe_id = str(uuid.uuid4())
        tpe = db.create_branch(tpe_id, "台北分校", "TPE", is_headquarters=False)
        print(f"✅ 建立客戶分校：{tpe['name']} (code={tpe['code']})")

    # 2. 建客戶 teacher 帳號
    teacher_email = "teacher@taipei.test"
    teacher_password = "teacher123456"
    existing = db.get_user_by_email(teacher_email)
    if existing:
        print(f"ℹ️  Teacher 已存在：{teacher_email}")
    else:
        user_id = str(uuid.uuid4())
        password_hash = auth.hash_password(teacher_password)
        db.create_user(
            user_id=user_id,
            email=teacher_email,
            password_hash=password_hash,
            name="台北王老師",
            role="teacher",
            branch_id=tpe["id"],
        )
        print(f"✅ 建立 Teacher 帳號：")
        print(f"   Email:    {teacher_email}")
        print(f"   Password: {teacher_password}")
        print(f"   Branch:   {tpe['name']}")

    # 3. 把最舊的一支影片改成 confidential（模擬「內部才能看」）
    import sqlite3
    conn = sqlite3.connect("training.db")
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT id, title, visibility FROM videos ORDER BY uploaded_at ASC LIMIT 1")
    row = c.fetchone()
    if row:
        if row["visibility"] == "confidential":
            print(f"ℹ️  「{row['title']}」已經是 confidential")
        else:
            c.execute("UPDATE videos SET visibility = 'confidential' WHERE id = ?", (row["id"],))
            conn.commit()
            print(f"✅ 把影片「{row['title']}」標為 confidential（模擬內部限定）")
    else:
        print("⚠️  資料庫裡沒有影片，跳過這步")
    conn.close()

    # 4. 總結
    print()
    print("=" * 50)
    print("測試帳號：")
    print(f"  Admin:   admin@giraffe.local / admin123456")
    print(f"  Teacher: {teacher_email} / {teacher_password}")
    print()
    print("目前影片 visibility 分布：")
    conn = sqlite3.connect("training.db")
    c = conn.cursor()
    c.execute("SELECT visibility, COUNT(*) FROM videos GROUP BY visibility")
    for vis, count in c.fetchall():
        print(f"  {vis}: {count} 支")
    conn.close()
    print()
    print("🎉 Phase 2 完成！Phase 3 做完之後，用 teacher 帳號登入就會看到擋牆生效。")


if __name__ == "__main__":
    seed()