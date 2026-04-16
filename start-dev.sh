#!/bin/bash
# ── 開發模式 ──────────────────────────────────────────────
# 同時啟動 FastAPI (port 8000) + Vite dev server (port 5173)
# Vite 會自動 proxy /api/* 到 FastAPI

echo "======================================"
echo "  開發模式啟動（Hot Reload）"
echo "  前端: http://localhost:5173"
echo "  後端: http://localhost:8000"
echo "======================================"

# Backend
cd backend
[ ! -d "venv" ] && python3 -m venv venv
source venv/bin/activate
pip install -q -r requirements.txt &
BACKEND_PID=$!
python app.py &
BACKEND_PID=$!

# Frontend
cd ../frontend
npm install --silent
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ 開發伺服器已啟動，請開啟 http://localhost:5173"
echo "   按 Ctrl+C 停止所有服務"
echo ""

# Cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
