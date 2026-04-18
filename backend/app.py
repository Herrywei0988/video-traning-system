import os
import uuid
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import re

load_dotenv()

import database as db
import ai_service as ai

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
        uploader_name=uploader_name, file_type=file_type,
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
):
    videos = db.list_videos(category=category, status=status, search=search, file_type=file_type)
    return {"videos": videos}

@app.get("/api/videos/{video_id}")
async def get_video(video_id: str):
    video = db.get_video(video_id)
    if not video:
        raise HTTPException(404, "找不到資料")
    return {"video": video}

class VideoUpdate(BaseModel):
    title: str
    description: str = ""
    category: str = "未分類"

@app.put("/api/videos/{video_id}")
async def update_video(video_id: str, body: VideoUpdate):
    video = db.get_video(video_id)
    if not video:
        raise HTTPException(404, "找不到資料")
    db.update_video(video_id, body.title, body.description, body.category)
    return {"success": True, "video": db.get_video(video_id)}

@app.delete("/api/videos/{video_id}")
async def delete_video(video_id: str):
    video = db.get_video(video_id)
    if not video:
        raise HTTPException(404, "找不到資料")
    try:
        if video["filepath"] and os.path.exists(video["filepath"]):
            os.remove(video["filepath"])
    except Exception:
        pass
    db.delete_video(video_id)
    return {"success": True}

@app.post("/api/videos/{video_id}/reprocess")
async def reprocess(video_id: str, background_tasks: BackgroundTasks):
    video = db.get_video(video_id)
    if not video:
        raise HTTPException(404, "找不到資料")
    if not video["filepath"] or not os.path.exists(video["filepath"]):
        raise HTTPException(400, "找不到原始檔案")
    background_tasks.add_task(
        process_file_bg, video_id,
        video["filepath"], video["title"], video["description"] or ""
    )
    return {"success": True}

# ── API: File streaming ──────────────────────────────────

@app.get("/api/videos/{video_id}/file")
async def stream_file(video_id: str, request: Request):
    video = db.get_video(video_id)
    if not video or not video["filepath"]:
        raise HTTPException(404, "找不到資料")
    
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

# ── API: Analysis ─────────────────────────────────────────

@app.get("/api/videos/{video_id}/analysis")
async def get_analysis(video_id: str):
    video = db.get_video(video_id)
    if not video:
        raise HTTPException(404, "找不到資料")
    return {"analysis": db.get_analysis(video_id)}

# ── API: Views ────────────────────────────────────────────

class ViewRecord(BaseModel):
    viewer_name: str = "匿名"
    viewer_role: str = "老師"
    completed: bool = False

@app.post("/api/videos/{video_id}/views")
async def record_view(video_id: str, body: ViewRecord):
    db.record_view(video_id, body.viewer_name, body.viewer_role, body.completed)
    return {"success": True}

@app.get("/api/videos/{video_id}/views")
async def get_views(video_id: str):
    return {"views": db.get_video_views(video_id)}

# ── API: Tasks ────────────────────────────────────────────

class TaskCreate(BaseModel):
    task_text: str
    assignee: str = ""
    due_date: str = ""

@app.post("/api/videos/{video_id}/tasks")
async def create_task(video_id: str, body: TaskCreate):
    task = db.create_task(video_id, body.task_text, body.assignee, body.due_date)
    return {"success": True, "task": task}

@app.get("/api/videos/{video_id}/tasks")
async def get_tasks(video_id: str):
    return {"tasks": db.get_video_tasks(video_id)}

@app.patch("/api/tasks/{task_id}/toggle")
async def toggle_task(task_id: int):
    task = db.toggle_task(task_id)
    return {"success": True, "task": task}

# ── API: Search & Stats ───────────────────────────────────

@app.get("/api/search")
async def search(q: str = ""):
    if not q.strip():
        return {"results": []}
    return {"results": db.search_knowledge_base(q.strip())}

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
