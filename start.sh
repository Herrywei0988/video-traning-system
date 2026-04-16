#!/bin/bash
set -e

echo "======================================"
echo "  培訓知識整理系統 v3 — 啟動中"
echo "======================================"

# ── Check tools ───────────────────────────────────────────
if ! command -v python3 &>/dev/null; then
  echo "❌ 找不到 Python3，請先安裝 Python 3.10+"
  exit 1
fi
if ! command -v node &>/dev/null; then
  echo "❌ 找不到 Node.js，請先安裝 Node.js 18+"
  echo "   前往 https://nodejs.org 下載"
  exit 1
fi

# ── Check .env ────────────────────────────────────────────
if [ ! -f "backend/.env" ]; then
  echo "⚠️  找不到 backend/.env"
  cp backend/.env.example backend/.env
  echo "✅ 已建立 backend/.env，請填入 OPENAI_API_KEY 後重新執行"
  exit 0
fi

# ── Build React frontend ──────────────────────────────────
echo ""
echo "📦 安裝前端套件並建置 React..."
cd frontend
npm install --silent
npm run build
cd ..
echo "✅ 前端建置完成"

# ── Install Python deps ───────────────────────────────────
echo ""
echo "📦 安裝後端套件..."
cd backend
if [ ! -d "venv" ]; then
  python3 -m venv venv
fi
source venv/bin/activate
pip install -q -r requirements.txt

# ── Check ffmpeg ──────────────────────────────────────────
if command -v ffmpeg &>/dev/null; then
  echo "✅ ffmpeg 已安裝"
else
  echo "⚠️  未找到 ffmpeg（建議安裝以支援影片格式轉換）"
  echo "   Mac:   brew install ffmpeg"
  echo "   Linux: sudo apt install ffmpeg"
fi

mkdir -p uploads

echo ""
echo "======================================"
echo "  ✅ 啟動成功！"
echo "  🌐 http://localhost:8000"
echo "======================================"
echo ""

python app.py
