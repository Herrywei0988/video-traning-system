import os
import uuid
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks, Request, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from dotenv import load_dotenv
import re

load_dotenv()

import database as db
import ai_service as ai
import auth

app = FastAPI(title="培訓知識整理系統", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

FRONTEND_DIST = Path("../frontend/dist")

CONTENT_TYPES = {
    '.mp4': 'video/mp4',
    '.mov': 'video/mp4',  # iPhone mov 其實多半是 H.264，用 mp4 mimetype 大部分瀏覽器可以播
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska',
    '.webm': 'video/webm',
    '.flv': 'video/x-flv',
    '.wmv': 'video/x-ms-wmv',
    '.m4v': 'video/x-m4v',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/mp4',
    '.aac': 'audio/aac',
    '.ogg': 'audio/ogg',
    '.flac': 'audio/flac',
    '.opus': 'audio/opus',
    '.wma': 'audio/x-ms-wma',
}

db.init_db()

# ── API: Auth ─────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    token: str
    user: dict

@app.post("/api/auth/login", response_model=LoginResponse)
async def login(body: LoginRequest):
    user = db.get_user_by_email(body.email)
    if not user:
        raise HTTPException(401, "帳號或密碼錯誤")
    if not user.get("is_active"):
        raise HTTPException(403, "此帳號已停用")
    if not auth.verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "帳號或密碼錯誤")
    
    db.update_last_login(user["id"])
    token = auth.create_token(user["id"])
    # Sprint 3D: 記錄登入行為
    db.log_activity(
        user_id=user["id"],
        action="login",
        target_type="user",
        target_id=user["id"],
        metadata={"email": user["email"], "role": user["role"]},
    )
    return {
        "token": token,
        "user": db.public_user(user),
    }

@app.get("/api/auth/me")
async def me(user: dict = Depends(auth.get_current_user)):
    """Return currently logged-in user."""
    return {"user": user}

@app.post("/api/auth/logout")
async def logout(user: dict = Depends(auth.get_current_user)):
    """Logout is client-side (discard token). This endpoint exists for future token blacklisting."""
    return {"success": True, "message": "已登出"}

# ── Background processing ─────────────────────────────────

def process_file_bg(video_id: str, filepath: str, title: str, description: str):
    try:
        db.update_video_status(video_id, "processing")
        file_type, content, analysis, duration, page_count, segments = \
            ai.process_file(filepath, title, description)
        analysis_id = str(uuid.uuid4())
        db.save_analysis(video_id, analysis_id, content, analysis, segments=segments)
        db.update_video_status(video_id, "done", duration=duration, page_count=page_count)
    except Exception as e:
        db.update_video_status(video_id, "error", error_message=str(e))
        print(f"[ERROR] process_file_bg {video_id}: {e}")

# ── API: Upload ───────────────────────────────────────────

ALLOWED_EXTENSIONS = ai.ALL_SUPPORTED
MAX_FILE_SIZE = 500 * 1024 * 1024

@app.post("/api/videos/upload")
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = Form(...),
    description: str = Form(""),
    category: str = Form("未分類"),
    uploader_name: str = Form("管理員"),
    user: dict = Depends(auth.require_admin),
):
    
    suffix = Path(file.filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"不支援的格式：{suffix}")

    video_id = str(uuid.uuid4())
    filename = f"{video_id}{suffix}"
    filepath = UPLOAD_DIR / filename

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(400, "檔案超過 500MB 限制")
    with open(filepath, "wb") as f:
        f.write(content)

    file_type = ai.classify_file(str(filepath))
    video = db.create_video(
        video_id=video_id, title=title, description=description,
        filename=file.filename, filepath=str(filepath),
        filesize=os.path.getsize(filepath), category=category,
        uploader_name=user["name"], file_type=file_type,
        uploader_user_id=user["id"],
    )
    db.log_activity(
        user_id=user["id"], action="upload_video",
        target_type="video", target_id=video_id,
        metadata={"title": title, "file_type": file_type, "filesize": os.path.getsize(filepath)},
    )
    background_tasks.add_task(process_file_bg, video_id, str(filepath), title, description)
    return {"success": True, "video": video}

# ── API: Videos ───────────────────────────────────────────

@app.get("/api/videos")
async def list_videos(
    category: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    file_type: Optional[str] = None,
    user: dict = Depends(auth.get_current_user),
):
    videos = db.list_videos(
        category=category, status=status, search=search, file_type=file_type,
        viewer=user,
    )
    return {"videos": videos}

@app.get("/api/videos/{video_id}")
async def get_video(video_id: str, user: dict = Depends(auth.get_current_user)):
    video = db.get_video(video_id)
    if not video:
        raise HTTPException(404, "找不到資料")
    if not db.can_view_video(user, video):
        raise HTTPException(403, "你沒有權限看這支影片")
    db.log_activity(
        user_id=user["id"], action="view_video_detail",
        target_type="video", target_id=video_id,
        metadata={"title": video.get("title"), "file_type": video.get("file_type")},
    )
    return {"video": video}

class VideoUpdate(BaseModel):
    title: str
    description: str = ""
    category: str = "未分類"
    visibility: Optional[str] = None  # 可選；不傳就不改

@app.put("/api/videos/{video_id}")
async def update_video(
    video_id: str,
    body: VideoUpdate,
    user: dict = Depends(auth.require_admin),  # 只有 admin 能改
):
    video = db.get_video(video_id)
    if not video:
        raise HTTPException(404, "找不到資料")
    # 驗證 visibility 合法值
    if body.visibility is not None and body.visibility not in ("public", "internal", "confidential"):
        raise HTTPException(400, "visibility 必須是 public / internal / confidential")
    # 記錄實際改了哪些欄位（跟舊值比對）
    changes = {}
    if body.title != video.get("title"):
        changes["title"] = {"from": video.get("title"), "to": body.title}
    if body.category != video.get("category"):
        changes["category"] = {"from": video.get("category"), "to": body.category}
    if body.visibility is not None and body.visibility != video.get("visibility"):
        changes["visibility"] = {"from": video.get("visibility"), "to": body.visibility}
    db.update_video(video_id, body.title, body.description, body.category, body.visibility)
    db.log_activity(
        user_id=user["id"], action="edit_video",
        target_type="video", target_id=video_id,
        metadata={"changes": changes} if changes else {"changes": "no-op"},
    )
    return {"success": True, "video": db.get_video(video_id)}

@app.delete("/api/videos/{video_id}")
async def delete_video(
    video_id: str,
    user: dict = Depends(auth.require_admin),  # 補權限：只有 admin 能刪
):
    video = db.get_video(video_id)
    if not video:
        raise HTTPException(404, "找不到資料")
    try:
        if video["filepath"] and os.path.exists(video["filepath"]):
            os.remove(video["filepath"])
    except Exception:
        pass
    db.delete_video(video_id)
    db.log_activity(
        user_id=user["id"], action="delete_video",
        target_type="video", target_id=video_id,
        metadata={"title": video.get("title"), "file_type": video.get("file_type")},
    )
    return {"success": True}

@app.post("/api/videos/{video_id}/reprocess")
async def reprocess(
    video_id: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(auth.require_admin),  # 補權限：只有 admin 能重新分析
):
    video = db.get_video(video_id)
    if not video:
        raise HTTPException(404, "找不到資料")
    if not video["filepath"] or not os.path.exists(video["filepath"]):
        raise HTTPException(400, "找不到原始檔案")
    background_tasks.add_task(
        process_file_bg, video_id,
        video["filepath"], video["title"], video["description"] or ""
    )
    db.log_activity(
        user_id=user["id"], action="reprocess_video",
        target_type="video", target_id=video_id,
        metadata={"title": video.get("title")},
    )
    return {"success": True}

# ── API: File streaming ──────────────────────────────────

@app.get("/api/videos/{video_id}/stream-token")
async def get_stream_token(
    video_id: str,
    user: dict = Depends(auth.get_current_user),
):
    """發一張短期門票讓 <video>/<audio> 能播這支影片。"""
    video = db.get_video(video_id)
    if not video:
        raise HTTPException(404, "找不到資料")
    if not db.can_view_video(user, video):
        raise HTTPException(403, "你沒有權限看這支影片")
    token = auth.create_stream_token(user["id"], video_id)
    return {"stream_token": token, "expires_in": auth.STREAM_TOKEN_EXP_SECONDS}

@app.get("/api/videos/{video_id}/file")
async def stream_file(
    video_id: str, request: Request,
    stream_token: Optional[str] = None,
):
    # 驗門票（不能用 Authorization header，因為 <video>/<audio> 標籤不支援）
    if not stream_token:
        raise HTTPException(401, "缺少 stream_token 參數")
    user_id = auth.verify_stream_token(stream_token, video_id)
    if not user_id:
        raise HTTPException(401, "stream_token 無效或已過期")
    video = db.get_video(video_id)
    if not video or not video["filepath"]:
        raise HTTPException(404, "找不到資料")
    # 雙保險：萬一發票後權限變了
    viewer = db.get_user(user_id)
    if not viewer or not db.can_view_video(viewer, video):
        raise HTTPException(403, "你沒有權限看這支影片")
    
    filepath = video["filepath"]
    if not os.path.exists(filepath):
        raise HTTPException(404, "原始檔案不存在")
    
    ext = Path(filepath).suffix.lower()
    content_type = CONTENT_TYPES.get(ext, 'application/octet-stream')
    file_size = os.path.getsize(filepath)
    
    range_header = request.headers.get('range')
    if range_header:
        match = re.match(r'bytes=(\d+)-(\d*)', range_header)
        if match:
            start = int(match.group(1))
            end = int(match.group(2)) if match.group(2) else file_size - 1
            end = min(end, file_size - 1)
            length = end - start + 1
            
            def iter_chunk():
                with open(filepath, 'rb') as f:
                    f.seek(start)
                    remaining = length
                    while remaining > 0:
                        chunk = f.read(min(64 * 1024, remaining))
                        if not chunk:
                            break
                        remaining -= len(chunk)
                        yield chunk
            
            return StreamingResponse(
                iter_chunk(),
                status_code=206,
                media_type=content_type,
                headers={
                    'Content-Range': f'bytes {start}-{end}/{file_size}',
                    'Accept-Ranges': 'bytes',
                    'Content-Length': str(length),
                }
            )
    
    return FileResponse(filepath, media_type=content_type, headers={'Accept-Ranges': 'bytes'})

@app.get("/api/videos/{video_id}/download")
async def download_file(
    video_id: str,
    user: dict = Depends(auth.require_admin),
):
    """
    下載原檔。僅 admin 可用（Netflix 模式：分校只能線上看不能帶走檔案）。
    跟 /file 不同：這個端點用 Authorization header 驗身份、強制瀏覽器下載。
    """
    video = db.get_video(video_id)
    if not video:
        raise HTTPException(404, "找不到資料")
    if not video["filepath"] or not os.path.exists(video["filepath"]):
        raise HTTPException(404, "原始檔案不存在")

    db.log_activity(
        user_id=user["id"], action="download_video",
        target_type="video", target_id=video_id,
        metadata={"title": video.get("title"), "filesize": video.get("filesize")},
    )

    # 用原始檔名讓下載時檔名正確（不是 uuid.mp4）
    return FileResponse(
        path=video["filepath"],
        filename=video["filename"],
        media_type="application/octet-stream",  # 強制下載而非瀏覽器內開啟
    )

# ── API: Analysis ─────────────────────────────────────────

@app.get("/api/videos/{video_id}/analysis")
async def get_analysis(video_id: str, user: dict = Depends(auth.get_current_user)):
    video = db.get_video(video_id)
    if not video:
        raise HTTPException(404, "找不到資料")
    if not db.can_view_video(user, video):
        raise HTTPException(403, "你沒有權限看這支影片的分析")
    return {"analysis": db.get_analysis(video_id)}

# ── API: Watch Progress（Sprint 3D）────────────────────

class ProgressUpdate(BaseModel):
    last_position_sec: float
    completed: bool = False

@app.get("/api/videos/{video_id}/progress")
async def get_progress(
    video_id: str,
    user: dict = Depends(auth.get_current_user),
):
    """拿當前使用者在這支影片的續看進度。沒看過回 None。"""
    video = db.get_video(video_id)
    if not video:
        raise HTTPException(404, "找不到資料")
    if not db.can_view_video(user, video):
        raise HTTPException(403, "你沒有權限看這支影片")
    progress = db.get_progress(user["id"], video_id)
    return {"progress": progress}

@app.put("/api/videos/{video_id}/progress")
async def update_progress(
    video_id: str,
    body: ProgressUpdate,
    user: dict = Depends(auth.get_current_user),
):
    """更新續看進度（UPSERT）。不記入 activity_log 避免噪音（每 10 秒一次會太多）。"""
    video = db.get_video(video_id)
    if not video:
        raise HTTPException(404, "找不到資料")
    if not db.can_view_video(user, video):
        raise HTTPException(403, "你沒有權限看這支影片")
    # 忽略負值或異常大的值（防呆）
    pos = max(0.0, body.last_position_sec)
    if video.get("duration") and pos > video["duration"] + 5:
        # 超過片長太多可能是 bug，截在片長
        pos = float(video["duration"])
    progress = db.upsert_progress(user["id"], video_id, pos, completed=body.completed)
    return {"success": True, "progress": progress}

@app.get("/api/progress/in-progress")
async def get_in_progress(
    limit: int = 6,
    user: dict = Depends(auth.get_current_user),
):
    """
    當前使用者「還沒看完」的影片清單（Dashboard 繼續觀看用）。
    已自動過濾：completed_at IS NULL + video.status='done'。
    注意：這裡不套 can_view_video 過濾，因為 watch_progress 已經是「曾經能看所以能開始看」的證據；
    如果之後分校訂閱過期，最多就是他看到列表但點進去 403，UX 上可接受。
    """
    limit = max(1, min(limit, 20))  # 防呆
    items = db.list_in_progress(user["id"], limit=limit)
    return {"in_progress": items}

# ── API: Notes（Sprint 3D）─────────────────────────────

class NoteCreate(BaseModel):
    content: str
    timestamp_sec: Optional[float] = None  # None = 整體筆記；有值 = 段落筆記

class NoteUpdate(BaseModel):
    content: str

@app.get("/api/videos/{video_id}/notes")
async def list_notes(
    video_id: str,
    user: dict = Depends(auth.get_current_user),
):
    """列出當前使用者在某影片的所有筆記。"""
    video = db.get_video(video_id)
    if not video:
        raise HTTPException(404, "找不到資料")
    if not db.can_view_video(user, video):
        raise HTTPException(403, "你沒有權限看這支影片")
    notes = db.list_notes(user["id"], video_id)
    return {"notes": notes}

@app.post("/api/videos/{video_id}/notes")
async def create_note(
    video_id: str,
    body: NoteCreate,
    user: dict = Depends(auth.get_current_user),
):
    """新增筆記。"""
    video = db.get_video(video_id)
    if not video:
        raise HTTPException(404, "找不到資料")
    if not db.can_view_video(user, video):
        raise HTTPException(403, "你沒有權限看這支影片")
    content = body.content.strip()
    if not content:
        raise HTTPException(400, "筆記內容不可空白")
    if len(content) > 2000:
        raise HTTPException(400, "筆記內容不可超過 2000 字")
    note = db.create_note(
        user_id=user["id"], video_id=video_id,
        content=content, timestamp_sec=body.timestamp_sec,
    )
    db.log_activity(
        user_id=user["id"], action="create_note",
        target_type="note", target_id=str(note["id"]),
        metadata={"video_id": video_id, "has_timestamp": body.timestamp_sec is not None},
    )
    return {"success": True, "note": note}

@app.put("/api/notes/{note_id}")
async def update_note(
    note_id: int,
    body: NoteUpdate,
    user: dict = Depends(auth.get_current_user),
):
    """更新筆記（只能改自己的）。"""
    note = db.get_note(note_id)
    if not note:
        raise HTTPException(404, "筆記不存在")
    if note["user_id"] != user["id"]:
        raise HTTPException(403, "你不能編輯別人的筆記")
    content = body.content.strip()
    if not content:
        raise HTTPException(400, "筆記內容不可空白")
    if len(content) > 2000:
        raise HTTPException(400, "筆記內容不可超過 2000 字")
    updated = db.update_note(note_id, content)
    db.log_activity(
        user_id=user["id"], action="update_note",
        target_type="note", target_id=str(note_id),
    )
    return {"success": True, "note": updated}

@app.delete("/api/notes/{note_id}")
async def delete_note(
    note_id: int,
    user: dict = Depends(auth.get_current_user),
):
    """刪除筆記（只能刪自己的）。"""
    note = db.get_note(note_id)
    if not note:
        raise HTTPException(404, "筆記不存在")
    if note["user_id"] != user["id"]:
        raise HTTPException(403, "你不能刪除別人的筆記")
    db.delete_note(note_id)
    db.log_activity(
        user_id=user["id"], action="delete_note",
        target_type="note", target_id=str(note_id),
    )
    return {"success": True}

# ── API: Bookmarks（Sprint 3D）─────────────────────────

class BookmarkCreate(BaseModel):
    start_time: float
    note: str = ""

@app.get("/api/videos/{video_id}/bookmarks")
async def list_bookmarks(
    video_id: str,
    user: dict = Depends(auth.get_current_user),
):
    """列出當前使用者在某影片的所有書籤（依時間戳排序）。"""
    video = db.get_video(video_id)
    if not video:
        raise HTTPException(404, "找不到資料")
    if not db.can_view_video(user, video):
        raise HTTPException(403, "你沒有權限看這支影片")
    bookmarks = db.list_bookmarks(user["id"], video_id)
    return {"bookmarks": bookmarks}

@app.post("/api/videos/{video_id}/bookmarks")
async def create_bookmark(
    video_id: str,
    body: BookmarkCreate,
    user: dict = Depends(auth.get_current_user),
):
    """新增書籤。start_time 必填。"""
    video = db.get_video(video_id)
    if not video:
        raise HTTPException(404, "找不到資料")
    if not db.can_view_video(user, video):
        raise HTTPException(403, "你沒有權限看這支影片")
    if body.start_time < 0:
        raise HTTPException(400, "start_time 不能為負")
    note = body.note.strip()
    if len(note) > 500:
        raise HTTPException(400, "書籤備註不可超過 500 字")
    bookmark = db.create_bookmark(
        user_id=user["id"], video_id=video_id,
        start_time=body.start_time, note=note,
    )
    db.log_activity(
        user_id=user["id"], action="create_bookmark",
        target_type="bookmark", target_id=str(bookmark["id"]),
        metadata={"video_id": video_id, "start_time": body.start_time},
    )
    return {"success": True, "bookmark": bookmark}

@app.delete("/api/bookmarks/{bookmark_id}")
async def delete_bookmark(
    bookmark_id: int,
    user: dict = Depends(auth.get_current_user),
):
    """刪除書籤（只能刪自己的）。"""
    bookmark = db.get_bookmark(bookmark_id)
    if not bookmark:
        raise HTTPException(404, "書籤不存在")
    if bookmark["user_id"] != user["id"]:
        raise HTTPException(403, "你不能刪除別人的書籤")
    db.delete_bookmark(bookmark_id)
    db.log_activity(
        user_id=user["id"], action="delete_bookmark",
        target_type="bookmark", target_id=str(bookmark_id),
    )
    return {"success": True}

# ── API: Views ────────────────────────────────────────────

class ViewRecord(BaseModel):
    completed: bool = False

@app.post("/api/videos/{video_id}/views")
async def record_view(
    video_id: str,
    body: ViewRecord,
    user: dict = Depends(auth.get_current_user),
):
    db.record_view(
        video_id,
        viewer_name=user["name"],
        viewer_role=user["role"],
        completed=body.completed,
        viewer_user_id=user["id"],
    )
    db.log_activity(
        user_id=user["id"], action="record_view",
        target_type="video", target_id=video_id,
        metadata={"completed": body.completed},
    )
    return {"success": True}

@app.get("/api/videos/{video_id}/views")
async def get_views(video_id: str):
    return {"views": db.get_video_views(video_id)}

# ── API: Tasks ────────────────────────────────────────────

class TaskCreate(BaseModel):
    task_text: str
    assignee: str = ""
    due_date: str = ""
    assignee_user_id: Optional[str] = None

@app.post("/api/videos/{video_id}/tasks")
async def create_task(
    video_id: str,
    body: TaskCreate,
    user: dict = Depends(auth.get_current_user),
):
    task = db.create_task(
        video_id, body.task_text, body.assignee, body.due_date,
        assignee_user_id=body.assignee_user_id,
    )
    db.log_activity(
        user_id=user["id"], action="create_task",
        target_type="task", target_id=str(task["id"]),
        metadata={"video_id": video_id, "task_text": body.task_text, "assignee": body.assignee},
    )
    return {"success": True, "task": task}

@app.get("/api/videos/{video_id}/tasks")
async def get_tasks(video_id: str):
    return {"tasks": db.get_video_tasks(video_id)}

@app.patch("/api/tasks/{task_id}/toggle")
async def toggle_task(
    task_id: int,
    user: dict = Depends(auth.get_current_user),
):
    task = db.toggle_task(task_id)
    db.log_activity(
        user_id=user["id"], action="toggle_task",
        target_type="task", target_id=str(task_id),
        metadata={"completed": bool(task.get("completed")) if task else None},
    )
    return {"success": True, "task": task}

# ── API: Search & Stats ───────────────────────────────────

@app.get("/api/search")
async def search(
    q: str = "",
    user: dict = Depends(auth.get_current_user),  # 補權限：搜尋需要登入
):
    q = q.strip()
    if not q:
        return {"results": []}
    results = db.search_knowledge_base(q)
    # 同時寫 search_history 跟 activity_log（兩個用途不同）
    db.record_search(user["id"], q, result_count=len(results))
    db.log_activity(
        user_id=user["id"], action="search",
        target_type="query", target_id=None,
        metadata={"query": q, "result_count": len(results)},
    )
    return {"results": results}

@app.get("/api/search/history")
async def search_history(
    limit: int = 10,
    user: dict = Depends(auth.get_current_user),
):
    """取當前使用者最近搜尋（去重後）。"""
    limit = max(1, min(limit, 50))  # 防呆
    history = db.list_user_recent_queries(user["id"], limit=limit)
    return {"history": history}

@app.delete("/api/search/history")
async def clear_search_history(
    user: dict = Depends(auth.get_current_user),
):
    """清空當前使用者的搜尋歷史。"""
    deleted = db.clear_user_search_history(user["id"])
    db.log_activity(
        user_id=user["id"], action="clear_search_history",
        metadata={"deleted_count": deleted},
    )
    return {"success": True, "deleted": deleted}

class DeleteQueryBody(BaseModel):
    query: str

@app.delete("/api/search/history/item")
async def delete_search_history_item(
    body: DeleteQueryBody,
    user: dict = Depends(auth.get_current_user),
):
    """刪除搜尋歷史的單一 query。"""
    q = body.query.strip()
    if not q:
        raise HTTPException(400, "query 不可空白")
    deleted = db.delete_search_query(user["id"], q)
    return {"success": True, "deleted": deleted}

@app.get("/api/stats")
async def get_stats():
    return db.get_stats()

# ── Serve React SPA ───────────────────────────────────────

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        index = FRONTEND_DIST / "index.html"
        if index.exists():
            return FileResponse(str(index))
        raise HTTPException(404, "Frontend not built. Run: cd frontend && npm run build")
else:
    @app.get("/")
    async def no_frontend():
        return {"message": "Frontend not built. Run: cd frontend && npm install && npm run build"}

# ── Run ───────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
