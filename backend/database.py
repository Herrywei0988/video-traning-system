import sqlite3
import json
import os
from datetime import datetime
from typing import Optional, List, Dict, Any

DB_PATH = "training.db"

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_conn()
    c = conn.cursor()

    c.execute("""
        CREATE TABLE IF NOT EXISTS videos (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            filename TEXT,
            filepath TEXT,
            filesize INTEGER,
            duration REAL,
            file_type TEXT DEFAULT 'video',
            page_count INTEGER,
            category TEXT DEFAULT '未分類',
            status TEXT DEFAULT 'pending',
            uploader_name TEXT DEFAULT '管理員',
            uploaded_at TEXT,
            processed_at TEXT,
            error_message TEXT
        )
    """)

    # Migration: add columns for existing DBs
    for col, definition in [
        ("file_type", "TEXT DEFAULT 'video'"),
        ("page_count", "INTEGER"),
    ]:
        try:
            c.execute(f"ALTER TABLE videos ADD COLUMN {col} {definition}")
        except Exception:
            pass
            # Migration: add transcript_segments column to analyses (for timestamped transcripts)
    try:
        c.execute("ALTER TABLE analyses ADD COLUMN transcript_segments TEXT")
    except Exception:
        pass
    
    # Migration: prepare for future user system (stays NULL for now)
    for col, definition in [
        ("uploader_user_id", "TEXT"),
    ]:
        try:
            c.execute(f"ALTER TABLE videos ADD COLUMN {col} {definition}")
        except Exception:
            pass
    try:
        c.execute("ALTER TABLE views ADD COLUMN viewer_user_id TEXT")
    except Exception:
        pass
    # Sprint 3C Phase 1: visibility + subscription
    try:
        c.execute("ALTER TABLE videos ADD COLUMN visibility TEXT DEFAULT 'public'")
    except Exception:
        pass
    try:
        c.execute("ALTER TABLE branches ADD COLUMN subscription_status TEXT DEFAULT 'active'")
    except Exception:
        pass

    c.execute("""
        CREATE TABLE IF NOT EXISTS analyses (
            id TEXT PRIMARY KEY,
            video_id TEXT UNIQUE,
            transcript TEXT,
            summary TEXT,
            key_points TEXT,
            action_items TEXT,
            faq TEXT,
            key_segments TEXT,
            exec_summary TEXT,
            manager_summary TEXT,
            teacher_summary TEXT,
            topics TEXT,
            created_at TEXT,
            FOREIGN KEY (video_id) REFERENCES videos(id)
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS views (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            video_id TEXT,
            viewer_name TEXT,
            viewer_role TEXT,
            viewed_at TEXT,
            completed INTEGER DEFAULT 0,
            FOREIGN KEY (video_id) REFERENCES videos(id)
        )
    """)

    c.execute("""
    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        video_id TEXT,
        task_text TEXT,
        assignee TEXT,
        due_date TEXT,
        completed INTEGER DEFAULT 0,
        created_at TEXT,
        assignee_user_id TEXT,
        FOREIGN KEY (video_id) REFERENCES videos(id),
        FOREIGN KEY (assignee_user_id) REFERENCES users(id)
    )
""")

    c.execute("""
        CREATE TABLE IF NOT EXISTS branches (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            code TEXT UNIQUE NOT NULL,
            is_headquarters INTEGER DEFAULT 0,
            created_at TEXT
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'teacher',
            branch_id TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT,
            last_login_at TEXT,
            FOREIGN KEY (branch_id) REFERENCES branches(id)
        )
    """)

    # ── Sprint 3D: 個人化相關表 ─────────────────────────

    # 筆記：整體筆記（timestamp_sec=NULL）或段落筆記（timestamp_sec 有值）
    c.execute("""
        CREATE TABLE IF NOT EXISTS user_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            video_id TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp_sec REAL,
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (video_id) REFERENCES videos(id)
        )
    """)

    # 書籤：標記影片某一秒為重點
    c.execute("""
        CREATE TABLE IF NOT EXISTS user_bookmarks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            video_id TEXT NOT NULL,
            start_time REAL NOT NULL,
            note TEXT,
            created_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (video_id) REFERENCES videos(id)
        )
    """)

    # 續看進度：一人一影片一筆（composite primary key）
    c.execute("""
        CREATE TABLE IF NOT EXISTS watch_progress (
            user_id TEXT NOT NULL,
            video_id TEXT NOT NULL,
            last_position_sec REAL NOT NULL DEFAULT 0,
            completed_at TEXT,
            updated_at TEXT NOT NULL,
            PRIMARY KEY (user_id, video_id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (video_id) REFERENCES videos(id)
        )
    """)

    # 搜尋歷史：個人 + admin 儀表板用熱門搜尋詞
    c.execute("""
        CREATE TABLE IF NOT EXISTS search_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            query TEXT NOT NULL,
            result_count INTEGER DEFAULT 0,
            searched_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # 行為日誌：審計 + debug + 使用率分析（所有重要事件都寫這裡）
    c.execute("""
        CREATE TABLE IF NOT EXISTS activity_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            action TEXT NOT NULL,
            target_type TEXT,
            target_id TEXT,
            metadata TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # 常用查詢的索引（讓列表查詢快）
    c.execute("CREATE INDEX IF NOT EXISTS idx_user_notes_user_video ON user_notes(user_id, video_id)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user_video ON user_bookmarks(user_id, video_id)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_watch_progress_user ON watch_progress(user_id, updated_at DESC)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id, searched_at DESC)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id, created_at DESC)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action, created_at DESC)")
    
    # ── Schema migrations（處理舊 DB 缺欄位的情況）──
    _ensure_column(c, "tasks", "assignee_user_id", "TEXT")
    # 以後每次新增欄位,就在這裡加一行,新舊 DB 都會自動同步

    conn.commit()
    conn.close()
    
def _ensure_column(cursor, table: str, column: str, col_def: str): 
    cursor.execute(f"PRAGMA table_info({table})")
    existing = [row[1] for row in cursor.fetchall()]
    if column not in existing:
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_def}")


# ── Helpers ──────────────────────────────────────────────

def _attach_user(row_dict: Dict, prefix: str, key_name: str) -> Dict:
    """
    把 SQL join 帶回來的 _xxx_id / _xxx_name 等欄位，
    組成 row_dict[key_name] = {id, name, role, branch_id}，
    然後清掉那些 _xxx 臨時欄位。
    """
    uid = row_dict.pop(f"_{prefix}_id", None)
    uname = row_dict.pop(f"_{prefix}_name", None)
    urole = row_dict.pop(f"_{prefix}_role", None)
    ubranch = row_dict.pop(f"_{prefix}_branch_id", None)
    if uid:
        row_dict[key_name] = {
            "id": uid,
            "name": uname,
            "role": urole,
            "branch_id": ubranch,
        }
    else:
        row_dict[key_name] = None
    return row_dict

# ── Videos ──────────────────────────────────────────────

def create_video(video_id: str, title: str, description: str, filename: str,
                 filepath: str, filesize: int, category: str,
                 uploader_name: str, file_type: str = 'video',
                 uploader_user_id: Optional[str] = None) -> Dict:
    conn = get_conn()
    c = conn.cursor()
    now = datetime.now().isoformat()
    c.execute("""
        INSERT INTO videos (id, title, description, filename, filepath, filesize,
                            category, file_type, status, uploader_name, uploaded_at,
                            uploader_user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
    """, (video_id, title, description, filename, filepath, filesize,
          category, file_type, uploader_name, now, uploader_user_id))
    conn.commit()
    conn.close()
    return get_video(video_id)

def get_video(video_id: str) -> Optional[Dict]:
    conn = get_conn()
    c = conn.cursor()
    c.execute("""
        SELECT v.*,
               u.id        AS _uploader_id,
               u.name      AS _uploader_name,
               u.role      AS _uploader_role,
               u.branch_id AS _uploader_branch_id
        FROM videos v
        LEFT JOIN users u ON v.uploader_user_id = u.id
        WHERE v.id = ?
    """, (video_id,))
    row = c.fetchone()
    conn.close()
    if not row:
        return None
    return _attach_user(dict(row), prefix="uploader", key_name="uploader")

def can_view_video(viewer: Dict, video: Dict) -> bool:
    """
    判斷這個使用者能不能看這支影片。
    admin 看全部；其他人需要分校訂閱 active + 影片 visibility='public'。
    """
    if not viewer:
        return False
    if viewer.get("role") == "admin":
        return True
    # 非 admin：檢查訂閱 + visibility
    branch_id = viewer.get("branch_id")
    if not branch_id:
        return False
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT subscription_status FROM branches WHERE id = ?", (branch_id,))
    br = c.fetchone()
    conn.close()
    if not br or br["subscription_status"] != "active":
        return False
    return video.get("visibility") == "public"


def list_videos(category: str = None, status: str = None,
                search: str = None, file_type: str = None,
                viewer: Optional[Dict] = None) -> List[Dict]:
    """
    viewer: 登入的使用者 dict（含 role, branch_id）。None = 不過濾（內部用，正常 API 會傳進來）
    權限規則：
      - admin: 看全部
      - 其他 role: 只看 visibility='public'，且自己分校 subscription_status='active'
    """
    conn = get_conn()
    c = conn.cursor()
    query = """
        SELECT v.*,
               u.id        AS _uploader_id,
               u.name      AS _uploader_name,
               u.role      AS _uploader_role,
               u.branch_id AS _uploader_branch_id
        FROM videos v
        LEFT JOIN users u ON v.uploader_user_id = u.id
        WHERE 1=1
    """
    params = []

    # ── 權限過濾 ─────────────────────────
    if viewer is not None and viewer.get("role") != "admin":
        # 非 admin：檢查分校訂閱狀態
        c2 = conn.cursor()
        c2.execute("SELECT subscription_status FROM branches WHERE id = ?",
                   (viewer.get("branch_id"),))
        br = c2.fetchone()
        if not br or br["subscription_status"] != "active":
            # 分校過期或找不到 → 回空清單
            conn.close()
            return []
        # 只能看 public
        query += " AND v.visibility = 'public'"
    # admin (or viewer=None): 不加過濾，看全部
    # ─────────────────────────────────────

    if category and category != 'all':
        cats = category.split(',')
        placeholders = ','.join(['?' for _ in cats])
        query += f" AND v.category IN ({placeholders})"
        params.extend(cats)
    if status and status != 'all':
        query += " AND v.status = ?"
        params.append(status)
    if file_type and file_type != 'all':
        query += " AND v.file_type = ?"
        params.append(file_type)
    if search:
        query += " AND (v.title LIKE ? OR v.description LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])
    query += " ORDER BY v.uploaded_at DESC"
    c.execute(query, params)
    rows = c.fetchall()
    conn.close()
    return [_attach_user(dict(r), prefix="uploader", key_name="uploader") for r in rows]

def update_video_status(video_id: str, status: str, error_message: str = None,
                        duration: float = None, page_count: int = None):
    conn = get_conn()
    c = conn.cursor()
    now = datetime.now().isoformat()
    if status == 'done':
        c.execute("""
            UPDATE videos SET status=?, processed_at=?, duration=?,
                              page_count=?, error_message=NULL
            WHERE id=?
        """, (status, now, duration, page_count, video_id))
    elif status == 'error':
        c.execute("UPDATE videos SET status=?, error_message=? WHERE id=?",
                  (status, error_message, video_id))
    else:
        c.execute("UPDATE videos SET status=? WHERE id=?", (status, video_id))
    conn.commit()
    conn.close()

def update_video(video_id: str, title: str, description: str, category: str,
                 visibility: Optional[str] = None):
    conn = get_conn()
    c = conn.cursor()
    if visibility is not None:
        c.execute("UPDATE videos SET title=?, description=?, category=?, visibility=? WHERE id=?",
                  (title, description, category, visibility, video_id))
    else:
        c.execute("UPDATE videos SET title=?, description=?, category=? WHERE id=?",
                  (title, description, category, video_id))
    conn.commit()
    conn.close()

def delete_video(video_id: str):
    conn = get_conn()
    c = conn.cursor()
    c.execute("DELETE FROM analyses WHERE video_id=?", (video_id,))
    c.execute("DELETE FROM views WHERE video_id=?", (video_id,))
    c.execute("DELETE FROM tasks WHERE video_id=?", (video_id,))
    c.execute("DELETE FROM videos WHERE id=?", (video_id,))
    conn.commit()
    conn.close()

# ── Analyses ─────────────────────────────────────────────

def save_analysis(video_id: str, analysis_id: str, transcript: str, data: Dict, segments: list = None):
    conn = get_conn()
    c = conn.cursor()
    now = datetime.now().isoformat()
    c.execute("""
        INSERT OR REPLACE INTO analyses
        (id, video_id, transcript, transcript_segments, summary, key_points, action_items, faq,
         key_segments, exec_summary, manager_summary, teacher_summary, topics, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        analysis_id, video_id, transcript,
        json.dumps(segments, ensure_ascii=False) if segments else None,
        data.get("summary", ""),
        json.dumps(data.get("key_points", []), ensure_ascii=False),
        json.dumps(data.get("action_items", []), ensure_ascii=False),
        json.dumps(data.get("faq", []), ensure_ascii=False),
        json.dumps(data.get("key_segments", []), ensure_ascii=False),
        data.get("exec_summary", ""),
        data.get("manager_summary", ""),
        data.get("teacher_summary", ""),
        json.dumps(data.get("topics", []), ensure_ascii=False),
        now
    ))
    conn.commit()
    conn.close()

def get_analysis(video_id: str) -> Optional[Dict]:
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT * FROM analyses WHERE video_id = ?", (video_id,))
    row = c.fetchone()
    conn.close()
    if not row:
        return None
    d = dict(row)
    for field in ["key_points", "action_items", "faq", "key_segments", "topics", "transcript_segments"]:
        try:
            d[field] = json.loads(d[field]) if d[field] else []
        except Exception:
            d[field] = []
    return d

# ── Views ────────────────────────────────────────────────

def record_view(video_id: str, viewer_name: str, viewer_role: str,
                completed: bool = False, viewer_user_id: Optional[str] = None):
    conn = get_conn()
    c = conn.cursor()
    now = datetime.now().isoformat()
    c.execute("""
        INSERT INTO views (video_id, viewer_name, viewer_role, viewed_at, completed,
                           viewer_user_id)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (video_id, viewer_name, viewer_role, now, 1 if completed else 0, viewer_user_id))
    conn.commit()
    conn.close()

def get_video_views(video_id: str) -> List[Dict]:
    conn = get_conn()
    c = conn.cursor()
    c.execute("""
        SELECT vw.viewer_name, vw.viewer_role, vw.viewed_at, vw.completed,
               u.id        AS _viewer_id,
               u.name      AS _viewer_name,
               u.role      AS _viewer_role,
               u.branch_id AS _viewer_branch_id
        FROM views vw
        LEFT JOIN users u ON vw.viewer_user_id = u.id
        WHERE vw.video_id = ?
        ORDER BY vw.viewed_at DESC
    """, (video_id,))
    rows = c.fetchall()
    conn.close()
    return [_attach_user(dict(r), prefix="viewer", key_name="viewer") for r in rows]

# ── Tasks ────────────────────────────────────────────────

def create_task(video_id: str, task_text: str, assignee: str, due_date: str,
                assignee_user_id: Optional[str] = None) -> Dict:
    conn = get_conn()
    c = conn.cursor()
    now = datetime.now().isoformat()
    c.execute("""
        INSERT INTO tasks (video_id, task_text, assignee, due_date, completed, created_at,
                           assignee_user_id)
        VALUES (?, ?, ?, ?, 0, ?, ?)
    """, (video_id, task_text, assignee, due_date, now, assignee_user_id))
    task_id = c.lastrowid
    conn.commit()
    conn.close()
    return get_task(task_id)

def get_task(task_id: int) -> Optional[Dict]:
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None

def get_video_tasks(video_id: str) -> List[Dict]:
    conn = get_conn()
    c = conn.cursor()
    c.execute("""
        SELECT t.*,
               u.id        AS _assignee_id,
               u.name      AS _assignee_name,
               u.role      AS _assignee_role,
               u.branch_id AS _assignee_branch_id
        FROM tasks t
        LEFT JOIN users u ON t.assignee_user_id = u.id
        WHERE t.video_id = ?
        ORDER BY t.created_at DESC
    """, (video_id,))
    rows = c.fetchall()
    conn.close()
    return [_attach_user(dict(r), prefix="assignee", key_name="assignee_user") for r in rows]

def toggle_task(task_id: int) -> Dict:
    conn = get_conn()
    c = conn.cursor()
    c.execute("UPDATE tasks SET completed = 1 - completed WHERE id = ?", (task_id,))
    conn.commit()
    conn.close()
    return get_task(task_id)

# ── Search ───────────────────────────────────────────────

def search_knowledge_base(query: str) -> List[Dict]:
    conn = get_conn()
    c = conn.cursor()
    like = f"%{query}%"
    c.execute("""
        SELECT v.id, v.title, v.category, v.uploaded_at, v.status, v.file_type,
               a.summary, a.transcript
        FROM videos v
        LEFT JOIN analyses a ON v.id = a.video_id
        WHERE v.status = 'done'
          AND (v.title LIKE ? OR v.description LIKE ?
               OR a.summary LIKE ? OR a.transcript LIKE ?)
        ORDER BY v.uploaded_at DESC
        LIMIT 20
    """, (like, like, like, like))
    rows = c.fetchall()
    conn.close()
    return [dict(r) for r in rows]

# ── Stats ────────────────────────────────────────────────

def get_stats() -> Dict:
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM videos")
    total = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM videos WHERE status='done'")
    done = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM videos WHERE status='pending' OR status='processing'")
    pending = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM views")
    total_views = c.fetchone()[0]
    c.execute("SELECT category, COUNT(*) as cnt FROM videos GROUP BY category ORDER BY cnt DESC")
    cats = c.fetchall()
    c.execute("SELECT file_type, COUNT(*) as cnt FROM videos GROUP BY file_type")
    types = c.fetchall()
    conn.close()
    return {
        "total": total,
        "done": done,
        "pending": pending,
        "total_views": total_views,
        "categories": [dict(r) for r in cats],
        "file_types": [dict(r) for r in types],
    }

# ── Branches ─────────────────────────────────────────────

def create_branch(branch_id: str, name: str, code: str, is_headquarters: bool = False) -> Dict:
    conn = get_conn()
    c = conn.cursor()
    now = datetime.now().isoformat()
    c.execute("""
        INSERT INTO branches (id, name, code, is_headquarters, created_at)
        VALUES (?, ?, ?, ?, ?)
    """, (branch_id, name, code, 1 if is_headquarters else 0, now))
    conn.commit()
    conn.close()
    return get_branch(branch_id)

def get_branch(branch_id: str) -> Optional[Dict]:
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT * FROM branches WHERE id = ?", (branch_id,))
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None

def get_branch_by_code(code: str) -> Optional[Dict]:
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT * FROM branches WHERE code = ?", (code,))
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None

def list_branches() -> List[Dict]:
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT * FROM branches ORDER BY is_headquarters DESC, name ASC")
    rows = c.fetchall()
    conn.close()
    return [dict(r) for r in rows]

# ── Users ────────────────────────────────────────────────

def create_user(user_id: str, email: str, password_hash: str, name: str,
                role: str = 'teacher', branch_id: str = None) -> Dict:
    conn = get_conn()
    c = conn.cursor()
    now = datetime.now().isoformat()
    c.execute("""
        INSERT INTO users (id, email, password_hash, name, role, branch_id, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    """, (user_id, email.lower(), password_hash, name, role, branch_id, now))
    conn.commit()
    conn.close()
    return get_user(user_id)

def get_user(user_id: str) -> Optional[Dict]:
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None

def get_user_by_email(email: str) -> Optional[Dict]:
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE email = ?", (email.lower(),))
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None

def list_users(branch_id: str = None) -> List[Dict]:
    conn = get_conn()
    c = conn.cursor()
    if branch_id:
        c.execute("SELECT * FROM users WHERE branch_id = ? ORDER BY created_at DESC", (branch_id,))
    else:
        c.execute("SELECT * FROM users ORDER BY created_at DESC")
    rows = c.fetchall()
    conn.close()
    # Remove password_hash from returned data
    result = []
    for r in rows:
        d = dict(r)
        d.pop('password_hash', None)
        result.append(d)
    return result

def update_last_login(user_id: str):
    conn = get_conn()
    c = conn.cursor()
    now = datetime.now().isoformat()
    c.execute("UPDATE users SET last_login_at = ? WHERE id = ?", (now, user_id))
    conn.commit()
    conn.close()

def public_user(user: Dict) -> Dict:
    """Return user dict without sensitive fields."""
    if not user:
        return None
    d = dict(user)
    d.pop('password_hash', None)
    return d

# ── Sprint 3D: Activity Log（所有 Phase 的事件都寫這裡） ────

def log_activity(user_id: Optional[str], action: str,
                 target_type: Optional[str] = None,
                 target_id: Optional[str] = None,
                 metadata: Optional[Dict] = None):
    """
    記錄使用者行為。
    - user_id 可以 None（系統操作或未登入情境）
    - metadata 吃 dict，內部轉成 JSON 存
    - 寫失敗不會讓主流程掛掉（log & swallow）；activity_log 不該成為關鍵路徑
    """
    try:
        conn = get_conn()
        c = conn.cursor()
        now = datetime.now().isoformat()
        c.execute("""
            INSERT INTO activity_log (user_id, action, target_type, target_id, metadata, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            user_id,
            action,
            target_type,
            target_id,
            json.dumps(metadata, ensure_ascii=False) if metadata else None,
            now,
        ))
        conn.commit()
        conn.close()
    except Exception as e:
        # 不 raise，避免拖垮主流程；但印出來方便 debug
        print(f"[WARN] log_activity failed: action={action} user={user_id} err={e}")


def list_activities(user_id: Optional[str] = None, action: Optional[str] = None,
                    limit: int = 100) -> List[Dict]:
    """
    列出 activity_log 記錄，用於 debug / 未來的 admin 儀表板。
    - user_id 指定 → 只看這個人的
    - action 指定 → 只看這個動作
    - 兩者都 None → 看全部最近的
    """
    conn = get_conn()
    c = conn.cursor()
    query = "SELECT * FROM activity_log WHERE 1=1"
    params = []
    if user_id:
        query += " AND user_id = ?"
        params.append(user_id)
    if action:
        query += " AND action = ?"
        params.append(action)
    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)
    c.execute(query, params)
    rows = c.fetchall()
    conn.close()
    # parse metadata JSON 回來
    results = []
    for r in rows:
        d = dict(r)
        if d.get("metadata"):
            try:
                d["metadata"] = json.loads(d["metadata"])
            except Exception:
                pass  # 保留原字串，debug 看
        results.append(d)
    return results

# ── Sprint 3D: User Notes ──────────────────────────────

def create_note(user_id: str, video_id: str, content: str,
                timestamp_sec: Optional[float] = None) -> Dict:
    """建立筆記。timestamp_sec=None 表示整體筆記；有值表示綁定影片某秒。"""
    conn = get_conn()
    c = conn.cursor()
    now = datetime.now().isoformat()
    c.execute("""
        INSERT INTO user_notes (user_id, video_id, content, timestamp_sec, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (user_id, video_id, content, timestamp_sec, now, now))
    note_id = c.lastrowid
    conn.commit()
    conn.close()
    return get_note(note_id)

def get_note(note_id: int) -> Optional[Dict]:
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT * FROM user_notes WHERE id = ?", (note_id,))
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None

def list_notes(user_id: str, video_id: str) -> List[Dict]:
    """列出某人在某影片的所有筆記，時間戳筆記先按時間排，整體筆記放後面依新到舊。"""
    conn = get_conn()
    c = conn.cursor()
    c.execute("""
        SELECT * FROM user_notes
        WHERE user_id = ? AND video_id = ?
        ORDER BY 
            CASE WHEN timestamp_sec IS NULL THEN 1 ELSE 0 END,
            timestamp_sec ASC,
            created_at DESC
    """, (user_id, video_id))
    rows = c.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def update_note(note_id: int, content: str) -> Optional[Dict]:
    conn = get_conn()
    c = conn.cursor()
    now = datetime.now().isoformat()
    c.execute("UPDATE user_notes SET content = ?, updated_at = ? WHERE id = ?",
              (content, now, note_id))
    conn.commit()
    conn.close()
    return get_note(note_id)

def delete_note(note_id: int):
    conn = get_conn()
    c = conn.cursor()
    c.execute("DELETE FROM user_notes WHERE id = ?", (note_id,))
    conn.commit()
    conn.close()

# ── Sprint 3D: User Bookmarks ──────────────────────────

def create_bookmark(user_id: str, video_id: str, start_time: float,
                    note: str = "") -> Dict:
    conn = get_conn()
    c = conn.cursor()
    now = datetime.now().isoformat()
    c.execute("""
        INSERT INTO user_bookmarks (user_id, video_id, start_time, note, created_at)
        VALUES (?, ?, ?, ?, ?)
    """, (user_id, video_id, start_time, note, now))
    bookmark_id = c.lastrowid
    conn.commit()
    conn.close()
    return get_bookmark(bookmark_id)

def get_bookmark(bookmark_id: int) -> Optional[Dict]:
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT * FROM user_bookmarks WHERE id = ?", (bookmark_id,))
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None

def list_bookmarks(user_id: str, video_id: str) -> List[Dict]:
    """列出某人在某影片的所有書籤，依時間戳順序。"""
    conn = get_conn()
    c = conn.cursor()
    c.execute("""
        SELECT * FROM user_bookmarks
        WHERE user_id = ? AND video_id = ?
        ORDER BY start_time ASC
    """, (user_id, video_id))
    rows = c.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def delete_bookmark(bookmark_id: int):
    conn = get_conn()
    c = conn.cursor()
    c.execute("DELETE FROM user_bookmarks WHERE id = ?", (bookmark_id,))
    conn.commit()
    conn.close()

# ── Sprint 3D: Watch Progress ──────────────────────────

def upsert_progress(user_id: str, video_id: str, last_position_sec: float,
                    completed: bool = False) -> Dict:
    """
    更新續看進度。UPSERT 模式：沒記錄就插入、有就更新。
    completed=True 時同時設 completed_at。
    """
    conn = get_conn()
    c = conn.cursor()
    now = datetime.now().isoformat()
    # 檢查是否已存在
    c.execute("SELECT user_id FROM watch_progress WHERE user_id = ? AND video_id = ?",
              (user_id, video_id))
    exists = c.fetchone()
    if exists:
        if completed:
            c.execute("""
                UPDATE watch_progress 
                SET last_position_sec = ?, completed_at = COALESCE(completed_at, ?), updated_at = ?
                WHERE user_id = ? AND video_id = ?
            """, (last_position_sec, now, now, user_id, video_id))
        else:
            c.execute("""
                UPDATE watch_progress SET last_position_sec = ?, updated_at = ?
                WHERE user_id = ? AND video_id = ?
            """, (last_position_sec, now, user_id, video_id))
    else:
        completed_at = now if completed else None
        c.execute("""
            INSERT INTO watch_progress 
            (user_id, video_id, last_position_sec, completed_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
        """, (user_id, video_id, last_position_sec, completed_at, now))
    conn.commit()
    conn.close()
    return get_progress(user_id, video_id)

def get_progress(user_id: str, video_id: str) -> Optional[Dict]:
    conn = get_conn()
    c = conn.cursor()
    c.execute("""
        SELECT * FROM watch_progress WHERE user_id = ? AND video_id = ?
    """, (user_id, video_id))
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None

def list_in_progress(user_id: str, limit: int = 10) -> List[Dict]:
    """
    列出使用者還沒看完的影片（completed_at IS NULL），依最近觀看排序。
    Dashboard 的「繼續觀看」區塊會用這個。
    LEFT JOIN videos 確保被刪除的影片不會出現。
    """
    conn = get_conn()
    c = conn.cursor()
    c.execute("""
        SELECT wp.*, v.title, v.file_type, v.duration, v.category, v.status
        FROM watch_progress wp
        INNER JOIN videos v ON wp.video_id = v.id
        WHERE wp.user_id = ? 
          AND wp.completed_at IS NULL
          AND v.status = 'done'
        ORDER BY wp.updated_at DESC
        LIMIT ?
    """, (user_id, limit))
    rows = c.fetchall()
    conn.close()
    return [dict(r) for r in rows]

# ── Sprint 3D: Search History ──────────────────────────

def record_search(user_id: str, query: str, result_count: int = 0):
    """記錄一次搜尋。"""
    conn = get_conn()
    c = conn.cursor()
    now = datetime.now().isoformat()
    c.execute("""
        INSERT INTO search_history (user_id, query, result_count, searched_at)
        VALUES (?, ?, ?, ?)
    """, (user_id, query, result_count, now))
    conn.commit()
    conn.close()

def list_user_searches(user_id: str, limit: int = 50) -> List[Dict]:
    """某人的搜尋歷史（最近的）。"""
    conn = get_conn()
    c = conn.cursor()
    c.execute("""
        SELECT * FROM search_history WHERE user_id = ?
        ORDER BY searched_at DESC LIMIT ?
    """, (user_id, limit))
    rows = c.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def top_queries(days: int = 30, limit: int = 20) -> List[Dict]:
    """
    熱門搜尋詞（admin 儀表板用）。
    回傳：[{query, cnt, last_searched_at}, ...]
    """
    conn = get_conn()
    c = conn.cursor()
    # SQLite 的日期比較：searched_at 是 ISO 字串，直接字典序比較 OK
    cutoff = (datetime.now().timestamp() - days * 86400)
    from datetime import datetime as _dt
    cutoff_iso = _dt.fromtimestamp(cutoff).isoformat()
    c.execute("""
        SELECT query, COUNT(*) as cnt, MAX(searched_at) as last_searched_at
        FROM search_history
        WHERE searched_at >= ?
        GROUP BY query
        ORDER BY cnt DESC, last_searched_at DESC
        LIMIT ?
    """, (cutoff_iso, limit))
    rows = c.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def list_user_recent_queries(user_id: str, limit: int = 10) -> List[Dict]:
    """
    個人最近搜尋（去重後的最新 N 個）。
    回傳：[{query, result_count, searched_at}, ...]
    用 MAX(id) 取每個獨特 query 的最新那筆 → 避免「hic/hick/hicko/hickory」四個變形都佔位。
    """
    conn = get_conn()
    c = conn.cursor()
    c.execute("""
        SELECT query, result_count, searched_at
        FROM search_history
        WHERE id IN (
            SELECT MAX(id) FROM search_history
            WHERE user_id = ?
            GROUP BY query
        )
        ORDER BY searched_at DESC
        LIMIT ?
    """, (user_id, limit))
    rows = c.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def clear_user_search_history(user_id: str) -> int:
    """清空某使用者的搜尋歷史，回傳刪除筆數。"""
    conn = get_conn()
    c = conn.cursor()
    c.execute("DELETE FROM search_history WHERE user_id = ?", (user_id,))
    deleted = c.rowcount
    conn.commit()
    conn.close()
    return deleted

def delete_search_query(user_id: str, query: str) -> int:
    """
    刪除某使用者的某個特定 query 的所有紀錄。
    （同個 query 歷史上可能搜過多次，這裡一次全刪；因為前端是 chip 去重顯示，
    刪一個 chip 對應的是「這個 query 不要在最近搜尋列表看到」的語意）
    回傳刪除筆數。
    """
    conn = get_conn()
    c = conn.cursor()
    c.execute("DELETE FROM search_history WHERE user_id = ? AND query = ?",
              (user_id, query))
    deleted = c.rowcount
    conn.commit()
    conn.close()
    return deleted