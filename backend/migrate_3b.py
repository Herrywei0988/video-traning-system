"""
migrate_3b.py — Sprint 3B Phase 1: 把舊資料的 user_id 欄位填上 admin id

跑法：
    cd backend
    python migrate_3b.py
"""
import sqlite3
import os

DB_PATH = "training.db"
ADMIN_EMAIL = os.getenv("SEED_ADMIN_EMAIL", "admin@giraffe.local")


def migrate():
    if not os.path.exists(DB_PATH):
        print(f"❌ 找不到資料庫：{DB_PATH}")
        print("   你是不是不在 backend 資料夾？")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # 找 admin
    c.execute("SELECT id, name FROM users WHERE email = ?", (ADMIN_EMAIL.lower(),))
    row = c.fetchone()
    if not row:
        print(f"❌ 找不到 admin：{ADMIN_EMAIL}")
        print("   先跑 python seed.py 建 admin")
        conn.close()
        return
    admin_id = row["id"]
    admin_name = row["name"]
    print(f"✅ 找到 admin：{admin_name} (id={admin_id[:8]}...)")
    print()

    # 填三張表
    updates = [
        ("videos", "uploader_user_id"),
        ("views",  "viewer_user_id"),
        ("tasks",  "assignee_user_id"),
    ]
    for table, col in updates:
        c.execute(f"SELECT COUNT(*) FROM {table} WHERE {col} IS NULL")
        n = c.fetchone()[0]
        c.execute(f"UPDATE {table} SET {col} = ? WHERE {col} IS NULL", (admin_id,))
        print(f"{table:10s}: {n} 筆 {col} 已填 admin id")

    conn.commit()

    # 驗證
    print()
    print("驗證結果（應該全部都是 0）：")
    all_ok = True
    for table, col in updates:
        c.execute(f"SELECT COUNT(*) FROM {table} WHERE {col} IS NULL")
        remain = c.fetchone()[0]
        mark = "✅" if remain == 0 else "❌"
        if remain != 0:
            all_ok = False
        print(f"  {mark} {table}.{col} 還是 NULL 的：{remain} 筆")

    conn.close()
    print()
    if all_ok:
        print("🎉 Phase 1 完成！回報給 Claude 繼續 Phase 2。")
    else:
        print("⚠️  有欄位沒填到，貼結果給 Claude 看。")


if __name__ == "__main__":
    migrate()