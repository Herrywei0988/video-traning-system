# 📚 培訓知識整理系統 v3
### Training Knowledge Management Platform — React + FastAPI

把培訓影片、文件、投影片一律轉化成可搜尋、可執行、可追蹤的知識資產。

---

## 技術架構

| 層級 | 技術 |
|------|------|
| 前端 | React 18 + React Router v6 + Vite |
| 後端 | Python FastAPI + SQLite |
| AI   | OpenAI Whisper（語音辨識）+ GPT-4o-mini（分析） |

---

## 支援格式

| 類型 | 格式 |
|------|------|
| 🎬 影片 | MP4, MOV, AVI, MKV, WebM |
| 🎵 音檔 | MP3, WAV, M4A, AAC, OGG |
| 📕 PDF  | .pdf |
| 📝 Word | .docx, .doc |
| 📊 PPT  | .pptx, .ppt |
| 📄 文字 | .txt, .md, .csv |

---

## 安裝需求

- **Python** 3.10+
- **Node.js** 18+（建置 React 前端）
- **OpenAI API Key**
- **ffmpeg**（選填，影片處理建議安裝）

---

## 快速開始

### 1. 設定環境變數
```bash
cp backend/.env.example backend/.env
# 編輯 backend/.env，填入 OPENAI_API_KEY
```

### 2. 啟動（生產模式）

**Mac / Linux：**
```bash
chmod +x start.sh && ./start.sh
```

**Windows：**
```
雙擊 start.bat
```

開啟瀏覽器：**http://localhost:8000**

---

## 開發模式（Hot Reload）

前後端分開啟動，支援即時熱更新：

```bash
chmod +x start-dev.sh && ./start-dev.sh
```

- 前端（Vite）：http://localhost:5173 — 修改 React 檔案即時反映
- 後端（FastAPI）：http://localhost:8000 — API 文件在 /docs
- Vite 自動 proxy `/api/*` 到後端，不需要改任何設定

---

## 手動啟動

```bash
# 1. 建置前端
cd frontend
npm install
npm run build

# 2. 啟動後端（會同時 serve 前端 build）
cd ../backend
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

---

## 目錄結構

```
vts-v3/
├── backend/
│   ├── app.py              # FastAPI + 所有 API
│   ├── database.py         # SQLite 操作
│   ├── ai_service.py       # 多格式擷取 + OpenAI
│   ├── requirements.txt
│   ├── .env.example
│   └── uploads/            # 上傳檔案
├── frontend/
│   ├── package.json
│   ├── vite.config.js      # Vite + API proxy 設定
│   ├── index.html
│   └── src/
│       ├── main.jsx        # 程式進入點
│       ├── App.jsx         # Router 設定
│       ├── index.css       # 全域 CSS 設計系統
│       ├── context/
│       │   └── ToastContext.jsx   # 全域 Toast 通知
│       ├── hooks/
│       │   └── useApi.js          # useApi, usePoll
│       ├── utils/
│       │   ├── api.js             # fetch 封裝
│       │   └── helpers.js        # 格式化工具
│       ├── components/
│       │   ├── Sidebar.jsx
│       │   ├── ToastContainer.jsx
│       │   ├── Modal.jsx
│       │   ├── Badges.jsx         # StatusBadge, CategoryBadge, FileTypePill
│       │   └── VideoCard.jsx
│       └── pages/
│           ├── Dashboard.jsx      # 總覽
│           ├── Upload.jsx         # 上傳
│           ├── VideoDetail.jsx    # 詳情 + 分析
│           └── Search.jsx         # 知識庫搜尋
├── start.sh
├── start-dev.sh
├── start.bat
└── README.md
```

---

## API 文件

啟動後前往 **http://localhost:8000/docs**

---

*長頸鹿培訓系統 v3.0 — React + FastAPI*
