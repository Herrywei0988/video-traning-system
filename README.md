# 📚 培訓知識整理系統 v3
### Training Knowledge Management Platform — React + FastAPI

> **不是影音倉庫，是組織知識整理系統。**
> 把培訓影片、文件、投影片轉化成**可搜尋、可執行、可追蹤**的組織知識資產——並為未來「總部→分校」的 SaaS 商業化打基礎。

---

## 🎯 這個系統解決什麼問題

傳統培訓流程：「總部上傳影片 → 分校員工看完 → 不知道誰看了、看懂了沒、有沒有做」。

這個系統提供四層價值：

1. **看完到執行完的閉環** — 每支影片最後強制顯示「你要做的三件事」
2. **同一支影片、三種角色、三種版本** — 主管版聚焦決策、班主任版聚焦執行、老師版聚焦教學
3. **培訓內容變組織資產** — 時間戳逐字稿、關鍵段落、AI 分類自動累積成可搜尋的知識庫
4. **可量化的管理** — 觀看紀錄、任務追蹤、未來的儀表板，讓總部第一次能「管」而不是「等回報」

---

## 💼 商業模型

**Netflix 模式，不是 iTunes 模式**：

- 分校**可以看** AI 分析、**播放**影片、**下載 PDF 報告**
- 分校**不能下載原檔**、**不能上傳**
- 只有總部（admin）能上傳、能下載原檔

分校買的是「**內容使用權 + AI 整理服務**」，不是「檔案所有權」。

---

## ✨ 核心功能

### 已完成
- 🎬 **多格式 AI 分析**：影片、音檔、PDF、Word、PPT、純文字一律結構化
- 🕐 **時間戳段落跳轉**：AI 抓出關鍵段落 → 點擊 ▶ 跳到影片對應秒數
- 👥 **角色版本切換**：同一份分析，主管/班主任/老師看到不同摘要
- ✅ **本片行動清單**：看完影片固定顯示「你要做的三件事」，依角色過濾
- 📄 **分角色 PDF 匯出**：當前角色版 / 完整版雙選項
- 🔒 **原檔保護**：串流播放但不開放下載
- 📊 **AI 自動分類**：內建六大主題（招生/續約/教學/家長溝通/培訓/品質管理）
- 🔐 **使用者系統**：JWT 登入、角色權限、Admin 專屬功能

### 規劃中
- 🏫 分校隔離 + 內容敏感度分層（Sprint 3C）
- 🔍 語意搜尋 + 段落級命中（Week 4）
- 📈 Admin 儀表板（Week 5）
- 🔔 推送通知 + 版本管理（Week 6）

---

## 🏗 技術架構

| 層級 | 技術 |
|------|------|
| 前端 | React 18 + React Router v6 + Vite |
| 後端 | Python FastAPI + SQLite |
| 認證 | JWT (PyJWT) + bcrypt |
| 語音辨識 | OpenAI Whisper（verbose_json，含時間戳） |
| AI 分析 | OpenAI GPT-4o |
| 檔案儲存 | 本機 `uploads/` 目錄（串流播放，支援 HTTP Range） |

---

## 📂 支援格式

| 類型 | 格式 | AI 處理方式 |
|------|------|-----------|
| 🎬 影片 | MP4, MOV, AVI, MKV, WebM | ffmpeg 抽音軌 → Whisper → GPT 結構化 |
| 🎵 音檔 | MP3, WAV, M4A, AAC, OGG | Whisper → GPT 結構化 |
| 📕 PDF  | .pdf | pdfplumber 抽文字 → GPT 結構化 |
| 📝 Word | .docx, .doc | python-docx 抽段落與表格 → GPT |
| 📊 PPT  | .pptx, .ppt | python-pptx 抽逐頁內容與備註 → GPT |
| 📄 文字 | .txt, .md, .csv | 直接讀取 → GPT |

---

## 📋 安裝需求

- **Python** 3.10+
- **Node.js** 18+（建置 React 前端）
- **OpenAI API Key**
- **ffmpeg**（影片處理**必裝**，不然 .mov/.mp4 無法處理）

### 安裝 ffmpeg

```bash
# Ubuntu / WSL
sudo apt install ffmpeg

# macOS
brew install ffmpeg

# Windows
# https://ffmpeg.org/download.html 下載後加入 PATH
```

---

## 🚀 快速開始

### 1. 設定環境變數
```bash
cp backend/.env.example backend/.env
# 編輯 backend/.env，填入 OPENAI_API_KEY
# 並確認 OPENAI_MODEL=gpt-4o
# 設定 JWT_SECRET（用隨機長字串，可跑以下指令產生）
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

### 2. 初始化資料庫 + 建立管理員帳號
```bash
cd backend
pip install -r requirements.txt
python seed.py
```

預設會建立：
- 總部分校（code: HQ）
- 管理員帳號：`admin@giraffe.local` / `admin123456`

⚠️ **首次登入後請盡速更改密碼**

### 3. 啟動（生產模式）

**Mac / Linux：**
```bash
chmod +x start.sh && ./start.sh
```

**Windows：**
```
雙擊 start.bat
```

開啟瀏覽器：**http://localhost:8000** → 會自動導到登入頁

---

## 🛠 開發模式（Hot Reload）

前後端分開啟動，支援即時熱更新：

```bash
chmod +x start-dev.sh && ./start-dev.sh
```

- 前端（Vite）：http://localhost:5173
- 後端（FastAPI）：http://localhost:8000 — API 文件在 `/docs`
- Vite 自動 proxy `/api/*` 到後端

---

## 🔧 手動啟動

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
python seed.py              # 首次啟動要跑 seed
python app.py
```

---

## 📁 目錄結構

```
vts-v3/
├── backend/
│   ├── app.py              # FastAPI + 所有 API + 串流 endpoint + auth 保護
│   ├── database.py         # SQLite 操作（videos/analyses/views/tasks/users/branches）
│   ├── ai_service.py       # 多格式擷取 + Whisper + GPT-4o
│   ├── auth.py             # Password hash + JWT + dependencies
│   ├── seed.py             # 初始化資料庫 + admin 帳號
│   ├── requirements.txt
│   ├── .env.example
│   └── uploads/            # 上傳檔案
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx         # Router + Protected Routes
│       ├── index.css
│       ├── context/
│       │   ├── ToastContext.jsx    # 全域 Toast 通知
│       │   └── AuthContext.jsx     # 登入狀態管理
│       ├── hooks/
│       │   └── useApi.js
│       ├── utils/
│       │   ├── api.js              # fetch 封裝（自動帶 JWT）
│       │   └── helpers.jsx
│       ├── components/
│       │   ├── Sidebar.jsx         # 左側選單 + 使用者資訊
│       │   ├── ToastContainer.jsx
│       │   ├── Modal.jsx
│       │   ├── Badges.jsx
│       │   └── VideoCard.jsx
│       └── pages/
│           ├── Login.jsx           # 登入頁
│           ├── Dashboard.jsx       # 總覽
│           ├── Upload.jsx          # 上傳（僅 admin）
│           ├── VideoDetail.jsx     # 詳情 + 分析 + 播放器 + 段落跳轉
│           └── Search.jsx          # 知識庫搜尋
├── docs/
│   ├── progress.md         # 專案完整進度規格
│   └── handoff.md          # 新對話交接精簡版
├── start.sh
├── start-dev.sh
├── start.bat
└── README.md
```

---

## 🗺 開發路線圖

| 階段 | 狀態 | 內容 |
|------|------|------|
| **Week 1** | ✅ 完成 | AI 底層升級（gpt-4o、Whisper verbose_json、時間戳） |
| **Week 2** | ✅ 完成 | VideoDetail 改造（播放器、段落跳轉、行動清單、分角色 PDF） |
| **Sprint 3A** | ✅ 完成 | 使用者系統後端 + 前端登入（JWT、bcrypt、保護路由） |
| **Sprint 3B** | 🚧 進行中 | 資料 FK 化（uploader/viewer/assignee） |
| **Sprint 3C** | ⏳ 規劃中 | 觀看自動化 + 分校隔離 + 角色擋權限 |
| **Week 4** | ⏳ 規劃中 | 搜尋升級（embeddings 語意搜尋、段落級命中） |
| **Week 5** | ⏳ 規劃中 | Admin 儀表板（觀看率矩陣、任務追蹤、異常提示） |
| **Week 6** | ⏳ 規劃中 | 版本管理 + 推送通知 |
| **Week 7** | ⏳ 規劃中 | PPT 預覽 + Admin 下載權限 |
| **Week 8** | ⏳ 規劃中 | 安全性 + 打包部署 |

詳細進度請參考 `docs/progress.md`。

---

## 👥 角色與權限

| 角色 | role 值 | 主要能做 |
|------|--------|---------|
| 總部管理員 | `admin` | 全部權限：上傳、看所有內容、下載原檔、管理使用者 |
| 分校主任 | `principal` | 看分校可見內容（public + internal）、匯出 PDF、建任務 |
| 分校老師 | `teacher` | 看分校公開內容（public）、匯出 PDF、看指派給自己的任務 |
| 分校行政 | `staff` | 同 teacher |

**內容敏感度（visibility）**（Sprint 3C 實作）：
- `public` — 所有分校可見
- `internal` — 主任級可見
- `confidential` — 總部 only

---

## 📖 API 文件

啟動後前往 **http://localhost:8000/docs**

### 主要 endpoints

**Auth**：
- `POST /api/auth/login` — 登入（回傳 JWT）
- `GET /api/auth/me` — 取得當前使用者
- `POST /api/auth/logout` — 登出

**Videos**：
- `POST /api/videos/upload` — 上傳檔案（僅 admin）
- `GET /api/videos/{id}/file` — 串流播放（支援 HTTP Range）
- `GET /api/videos/{id}/analysis` — 取得 AI 分析結果
- `POST /api/videos/{id}/tasks` — 建立追蹤任務
- `POST /api/videos/{id}/views` — 記錄觀看
- `GET /api/search?q=...` — 知識庫搜尋

所有 endpoint（除 `/login`）都需要 `Authorization: Bearer <token>` header。

---

## 📐 設計原則

1. **原檔不開放下載（Netflix 模式）** — 保護總部 know-how，使用者只能在系統內消化內容
2. **AI 輸出結構化而非純文字** — 每支影片都產出摘要、重點、待辦、FAQ、關鍵段落（含時間戳）
3. **資料庫預留使用者欄位** — FK 化已在進行中
4. **分類 AI 自動、主題固定** — 六大主題內建，確保各分校標籤一致
5. **只有總部能上傳** — 分校是內容消費者，確保內容品質 + 品牌一致

---

## 🤝 貢獻

這是長頸鹿 AI 校園六大模組之一。其他模組包括：錄音作業系統、教務教學輔導系統、看課系統、班務軟體、學習歷程系統。

---

*長頸鹿培訓知識整理系統 v3.0 — React + FastAPI + JWT*