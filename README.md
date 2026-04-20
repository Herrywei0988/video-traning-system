# 🦒 長頸鹿 AI 校園 · 影片培訓整理系統

把培訓影片從「看完就算」變成可追蹤、可搜尋、可累積、可收費的組織知識系統。

## 這是什麼

總部 → 分校的**訂閱制 SaaS** 培訓知識庫：

1. **總部上傳** 培訓影片 / 音檔 / 投影片 / 文件
2. **AI 自動整理**：語音轉文字、結構化分析、產出三種角色版本（主管/班主任/老師）
3. **分校訂閱觀看**：線上播放 + 看 AI 整理的摘要、重點、FAQ、待辦清單
4. **個人化知識庫**：使用者可寫筆記、加書籤、自動續看進度、查搜尋歷史
5. **AI 小測驗驗收**（規劃中）：讓「看完影片」升級成「證明學會了」
6. **可匯出 PDF** 給不同角色使用,原檔由總部保留（Netflix 模式）

## 核心差異化

vs 分校自己用 GPT：

- ✅ **從「看完」到「執行完」的閉環** — 每支影片配套行動清單 + 測驗驗收
- ✅ **同一支影片、三種角色、三種版本** — 主管/班主任/老師看到不同重點
- ✅ **可累積的知識庫** — 不是閱後即焚,是 org-wide 搜尋資產
- ✅ **個人化層** — 筆記、書籤、續看進度,讓每個使用者有「自己的知識庫」
- ✅ **總部即時控制分校看到什麼** — admin 設 visibility,分校立刻反應
- ✅ **Netflix 模式** — 付費看,不能帶走檔案

---

## 技術棧

| 層 | 技術 |
|------|------|
| 前端 | React + Vite + React Router + JWT Auth |
| 後端 | FastAPI + SQLite + bcrypt + PyJWT |
| AI | OpenAI Whisper + GPT-4o |
| 檔案播放 | HTTP Range streaming + JWT stream tokens |
| 部署 | WSL / Linux（Week 8 遷移 PostgreSQL + Docker） |

---

## Roadmap

| 階段 | 狀態 | 內容 |
|------|------|------|
| Week 1 | ✅ 完成 | AI 底層升級（gpt-4o、時間戳、segments） |
| Week 2 | ✅ 完成 | VideoDetail 改造（嵌入播放器、段落跳轉、分角色 PDF） |
| Week 3 Sprint 3A | ✅ 完成 | 使用者系統後端 + 前端登入 |
| 插隊任務 | ✅ 完成 | 品牌橘色改版 + 視角切換器 |
| Week 3 Sprint 3B | ✅ 完成 | 資料 FK 化（user_id 接上外鍵） |
| Week 3 Sprint 3C Phase 1-3 | ✅ 完成 | 權限擋牆 + visibility + 訂閱狀態過濾 + stream token |
| Week 3 Sprint 3C Phase 4 | ✅ 完成 | stream/download 分流(admin 能下載原檔) |
| Week 3 Sprint 3D | ✅ 完成 | 個人化 Schema(筆記/書籤/續看進度/搜尋歷史) |
| Week 3 Sprint 3E | 🚧 **下一步** | AI 小測驗系統（商業價值最高） |
| Week 4 | ⏳ 規劃中 | 搜尋升級（向量搜尋、段落級結果） |
| Week 5 | ⏳ 規劃中 | Admin 儀表板（管分校訂閱、看整體成效） |
| Week 6 | ⏳ 規劃中 | 版本管理 + 推送通知 |
| Week 7 | ⏳ 規劃中 | PPT/文件預覽 |
| Week 8 | ⏳ 規劃中 | 上線基建（Postgres 遷移、備份、部署） |

詳細進度請看 [`docs/progress.md`](./docs/progress.md)。

---

## 目前已實現的功能

### 身份與權限
- 🔐 **完整登入系統**:JWT 認證、24 小時 token 效期、自動過期重登
- 👥 **多角色架構**:admin / principal / teacher / staff 四種角色
- 🎭 **視角切換器**:admin 可預覽各角色看到的畫面,不用登出登入
- 🏢 **多分校支援**:分校屬於獨立組織,有訂閱狀態(active / expired / trial)
- 🛡️ **Netflix 式權限**:admin 可即時切換影片可見度(public / internal / confidential),分校端立刻反應

### 影片播放與下載
- 🎬 **影片串流播放**:HTTP Range + JWT stream token,支援 seek、拖拉進度條
- ⬇️ **admin 下載原檔**:獨立 endpoint + fetch blob 方式保護 token 不外洩,其他角色後端 403

### AI 分析
- 🤖 **AI 分析**:Whisper 轉錄 + GPT-4o 結構化,產出三種角色版本摘要
- 📄 **分角色 PDF 匯出**:主管版/班主任版/老師版/完整版各自可下載
- 🎯 **關鍵段落時間戳跳轉**:AI 自動標記重點段落,點擊直接跳到影片對應秒數

### 個人化知識庫(Sprint 3D)
- 📝 **我的筆記**:每支影片可寫整體筆記或綁時間戳的段落筆記,支援編輯/刪除
- 🔖 **我的書籤**:標記影片重要片段,附備註,點擊可跳轉;關鍵段落旁邊有快速加書籤鍵
- 📺 **自動續看進度**:關頁面再打開自動從上次位置繼續,看完自動標記完成
- 🏠 **Dashboard 繼續觀看**:首頁顯示未完成的影片,進度條一覽無遺
- 🕐 **個人搜尋歷史**:搜尋頁顯示最近關鍵字 chip,去重自動合併、可點擊快速重搜、可單筆或整批刪除

### 背景系統
- 📊 **行為日誌(activity_log)**:所有重要動作寫入審計 log,未來支援 admin 儀表板分析使用率
- 🔒 **權限隔離**:每個使用者的筆記/書籤/進度/搜尋歷史各自獨立,DB 層驗證擁有權

---

## 快速開始

### 後端

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # 填入 OPENAI_API_KEY、JWT_SECRET
python seed.py         # 建立 HQ 分校 + 預設 admin 帳號
python seed_3c.py      # (選配) 建立測試用台北分校 + teacher 帳號
uvicorn app:app --reload
```

後端跑在 `http://localhost:8000`。

> ⚠️ **提醒**:Python 沒有熱重載(用 `uvicorn --reload` 可以,但改完某些底層 import 還是建議手動重啟)。如果改了 `app.py` 或 `database.py` 的 endpoint / helper,**Ctrl+C → 重跑** 最穩。

### 前端

```bash
cd frontend
npm install
npm run dev
```

前端跑在 `http://localhost:5173`,會 proxy 到後端。

### 預設帳號

**總部 admin**:
- Email:    `admin@giraffe.local`
- Password: `admin123456`

**測試分校 teacher**(跑過 `seed_3c.py` 後):
- Email:    `teacher@taipei.test`
- Password: `teacher123456`

登入後請立即改密碼(Week 8 會加強制改密功能)。

---

## 備份

開發階段備份由 `scripts/backup.sh` 處理,每日壓縮 DB + uploads 目錄到 `backups/` 並保留 30 天。

建議加進 crontab：
```bash
0 2 * * * /path/to/scripts/backup.sh
```

詳細還原步驟:見 `scripts/backup.sh` 頂部註解。

> ⚠️ **兩個常見坑**:
> - 資料庫檔名是 `training.db`,不是 `app.db`
> - `DB_PATH` 是相對路徑,sqlite3 操作要在 `backend/` 目錄下跑;在其他目錄會靜默建空 DB,容易誤以為資料沒了

---

## 文件索引

- [`docs/progress.md`](./docs/progress.md) — 完整規格、設計決策、技術債
- [`docs/handoff.md`](./docs/handoff.md) — 換 AI 對話時的接手說明

---

## 所屬專案

長頸鹿 AI 校園六大模組的第 2 個：

1. 錄音作業系統
2. **影片培訓整理系統** ← 本專案
3. 教務教學輔導系統
4. 看課與教學品質追蹤系統
5. 智慧校園平台 / 班軟
6. 學習歷程系統