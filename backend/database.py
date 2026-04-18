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
    try:
        c.execute("ALTER TABLE tasks ADD COLUMN assignee_user_id TEXT")
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
            FOREIGN KEY (video_id) REFERENCES videos(id)
        )
    """)

    conn.commit()
    conn.close()

# ── Videos ──────────────────────────────────────────────

def create_video(video_id: str, title: str, description: str, filename: str,
                 filepath: str, filesize: int, category: str,
                 uploader_name: str, file_type: str = 'video') -> Dict:
    conn = get_conn()
    c = conn.cursor()
    now = datetime.now().isoformat()
    c.execute("""
        INSERT INTO videos (id, title, description, filename, filepath, filesize,
                            category, file_type, status, uploader_name, uploaded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    """, (video_id, title, description, filename, filepath, filesize,
          category, file_type, uploader_name, now))
    conn.commit()
    conn.close()
    return get_video(video_id)

def get_video(video_id: str) -> Optional[Dict]:
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT * FROM videos WHERE id = ?", (video_id,))
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None

def list_videos(category: str = None, status: str = None,
                search: str = None, file_type: str = None) -> List[Dict]:
    conn = get_conn()
    c = conn.cursor()
    query = "SELECT * FROM videos WHERE 1=1"
    params = []
    if category and category != 'all':
        cats = category.split(',')
        placeholders = ','.join(['?' for _ in cats])
        query += f" AND category IN ({placeholders})"
        params.extend(cats)
    if status and status != 'all':
        query += " AND status = ?"
        params.append(status)
    if file_type and file_type != 'all':
        query += " AND file_type = ?"
        params.append(file_type)
    if search:
        query += " AND (title LIKE ? OR description LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])
    query += " ORDER BY uploaded_at DESC"
    c.execute(query, params)
    rows = c.fetchall()
    conn.close()
    return [dict(r) for r in rows]

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

def update_video(video_id: str, title: str, description: str, category: str):
    conn = get_conn()
    c = conn.cursor()
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

def record_view(video_id: str, viewer_name: str, viewer_role: str, completed: bool = False):
    conn = get_conn()
    c = conn.cursor()
    now = datetime.now().isoformat()
    c.execute("""
        INSERT INTO views (video_id, viewer_name, viewer_role, viewed_at, completed)
        VALUES (?, ?, ?, ?, ?)
    """, (video_id, viewer_name, viewer_role, now, 1 if completed else 0))
    conn.commit()
    conn.close()

def get_video_views(video_id: str) -> List[Dict]:
    conn = get_conn()
    c = conn.cursor()
    c.execute("""
        SELECT viewer_name, viewer_role, viewed_at, completed
        FROM views WHERE video_id = ?
        ORDER BY viewed_at DESC
    """, (video_id,))
    rows = c.fetchall()
    conn.close()
    return [dict(r) for r in rows]

# ── Tasks ────────────────────────────────────────────────

def create_task(video_id: str, task_text: str, assignee: str, due_date: str) -> Dict:
    conn = get_conn()
    c = conn.cursor()
    now = datetime.now().isoformat()
    c.execute("""
        INSERT INTO tasks (video_id, task_text, assignee, due_date, completed, created_at)
        VALUES (?, ?, ?, ?, 0, ?)
    """, (video_id, task_text, assignee, due_date, now))
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
    c.execute("SELECT * FROM tasks WHERE video_id = ? ORDER BY created_at DESC", (video_id,))
    rows = c.fetchall()
    conn.close()
    return [dict(r) for r in rows]

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
