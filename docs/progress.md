# 長頸鹿 AI 校園 - 影片培訓整理系統 · 專案進度

> **最後更新**：2026/04/18（Week 2 確認完成）
> **專案階段**：Week 2 完成 · 準備開工 Week 3 Sprint 3A
> **目標**：把培訓影片從「看完就算」變成可追蹤、可搜尋、可累積、可收費的組織知識系統

---

## 📋 如何使用這份文件

這份文件是**完整版規格書**，用於存在專案的 `docs/` 目錄做完整記錄。

**兩份文件的分工**：
- **這份（progress.md）**：約 6000 字，完整規格、所有細節、設計決策歷史、技術債
- **`handoff.md`**（精簡版）：約 1500 字，每次開新對話貼進去給新 Claude 接手用

**更新時機**：
- 每週 Sprint 結束 → 更新兩份
- 重要設計決定 → 更新 progress.md 的 decision log
- 技術債發現 → 更新 progress.md 的已知問題區塊

**在新聊天室接手**：貼 `handoff.md` 就夠了，progress.md 是需要查細節時才翻。

---

## 🎯 專案核心定位

**這個系統不是「影音倉庫」，而是「組織知識整理系統」。**

核心差異化 vs 分校自己用 GPT：
1. **從「看完」到「執行完」的閉環** — 看完影片必須讓使用者知道要做什麼
2. **同一支影片、三種角色、三種版本** — 主管/班主任/老師看到的內容不同
3. **資料累積成資產** — 每支影片、每次整理、每筆重點都要沉澱成可搜尋的知識庫
4. **分校權限隔離** — 未來要賣給分校，就要有租戶隔離
5. **可收費的管理工具** — 不是內部 side project，目標是總部→分校的 SaaS

---

## 🏗 技術架構

**前端**：React + Vite + React Router（SPA）
**後端**：FastAPI + SQLite + 手寫 SQL
**AI**：OpenAI Whisper（語音轉文字）+ GPT-4o（結構化分析）
**檔案儲存**：本機 `uploads/` 目錄
**部署環境**：WSL / Linux

**專案結構**：
```
video-traning-system/
├── backend/
│   ├── app.py              # FastAPI 入口、API endpoints
│   ├── ai_service.py       # Whisper + GPT-4o 處理
│   ├── database.py         # SQLite CRUD
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/          # Dashboard, Upload, VideoDetail, Search
│       ├── components/     # Sidebar, VideoCard, Modal, Badges...
│       ├── hooks/
│       ├── context/
│       └── utils/
└── uploads/                # 原始檔案儲存
```

**資料庫 schema（目前）**：
- `videos` — 影片/檔案基本資訊（含預留欄位 `uploader_user_id`）
- `analyses` — AI 分析結果（含 `transcript_segments` 時間戳資料）
- `views` — 觀看紀錄（含預留欄位 `viewer_user_id`）
- `tasks` — 追蹤任務（含預留欄位 `assignee_user_id`）

---

## ✅ 已完成

### Week 1 — AI 底層升級 ✅

**完成日期**：2026/04/18
**目標**：讓 AI 處理出來的資料有時間戳，為 Week 2 的段落跳轉打基礎。

**改動檔案**：`backend/.env`、`backend/database.py`、`backend/ai_service.py`、`backend/app.py`

**具體完成項目**：
- [x] `.env` 模型升級 `gpt-4o-mini` → `gpt-4o`
- [x] `database.py` 加 migration：`analyses.transcript_segments` 欄位（存 JSON）
- [x] `database.py` 加 migration：預留 `uploader_user_id`、`viewer_user_id`、`assignee_user_id` 欄位
- [x] `database.py` 的 `save_analysis` 支援 segments 參數
- [x] `database.py` 的 `get_analysis` 把 `transcript_segments` 也 parse 回 list
- [x] `ai_service.py` 的 `chunk_audio` 回傳 `(chunk_path, start_offset)`
- [x] `ai_service.py` 的 `transcribe_audio` 改用 `verbose_json` + `timestamp_granularities=["segment"]`
- [x] `ai_service.py` 的 `_build_prompt` 支援 `has_timestamps` 參數
- [x] `ai_service.py` 的 `analyze` 接收 segments 並要求 AI 輸出 `start_time`
- [x] `ai_service.py` content 提升到 15000 字（gpt-4o 有 128k context）
- [x] `ai_service.py` 的 `process_file` 回傳多一個 `segments`
- [x] `app.py` 的 `process_file_bg` 傳 segments 給 `save_analysis`

**驗收結果**：
- ✅ 上傳 21 秒音檔 → Whisper 吐出 4 段時間戳（start=0, 4, 8, 12）
- ✅ DB 的 `transcript_segments` 有完整 JSON
- ✅ `key_segments` 每筆有 `start_time` 欄位
- ✅ gpt-4o 分析品質肉眼可見比 mini 好（主管版摘要精準、主題分類準確）

**額外修掉的 bug**：
- [x] 系統未安裝 ffmpeg 時錯誤訊息模糊 → 改成明確提示「請安裝 ffmpeg」

---

### Week 2 — VideoDetail 改造 ✅

**完成日期**：2026/04/18
**目標**：讓使用者在系統內感受到「這不是 GPT 包殼」。

**改動檔案**：`backend/app.py`、`backend/ai_service.py`、`frontend/src/pages/VideoDetail.jsx`

**具體完成項目**：
- [x] `app.py` 新增 `/api/videos/{video_id}/file` 串流 endpoint（支援 HTTP Range headers）
- [x] `app.py` 新增 `CONTENT_TYPES` 對應表(影片/音檔 MIME type)
- [x] `ai_service.py` 加 `_is_refusal()` 函式，偵測 AI 拒絕並轉成友善錯誤訊息
- [x] `VideoDetail.jsx` 嵌入 HTML5 `<video>` / `<audio>` 播放器
- [x] `VideoDetail.jsx` 加 `mediaRef`、`seekTo()`、`formatSeconds()` helper
- [x] `VideoDetail.jsx` 關鍵段落加「▶ 跳到 XX:XX」按鈕，可點擊跳轉（**已實測通過**）
- [x] `VideoDetail.jsx` 加「看完這支你要做的三件事」固定行動區塊
- [x] 行動區塊根據當前 role（主管/班主任/老師）過濾相關任務
- [x] PDF 匯出分角色：Topbar 兩顆按鈕（當前角色版 + 完整版）
- [x] PPT/PDF/Word 類型顯示「文件已完成 AI 整理」提示條（合理化「不可下載」的定位）

**驗收結果**：
- ✅ 音檔嵌入播放器正常，時長顯示正確
- ✅ AI 主題標籤精準（抓到「招生、續約、培訓」等）
- ✅ 本片行動清單根據角色切換會過濾
- ✅ PPT 類型顯示「15 張投影片」提示
- ✅ **段落跳轉按鈕實測通過**（點「▶ 跳到 00:04」音檔自動跳轉並播放）
- ✅ 分角色匯出 PDF 正常

**設計決策記錄**：
- 原檔**不開放下載**，這是刻意的設計決定。理由：保護總部 know-how、避免外流、讓使用者必須在系統內消化內容。
- PPT 目前只有 AI 分析，沒有原檔預覽（瀏覽器原生不支援）。Week 7 會用 LibreOffice 轉圖片預覽。
- 例外下載權限（擁有者、總部管理員）等 Week 3 有了使用者系統再設計。

---

## 🚧 待完成

### Week 3 — 使用者系統 + 分校隔離 + 觀看自動化（即將開工）

**目標**：從「單租戶 MVP」升級到「可以給真實分校試用的系統」。
**時間估計**：1 - 1.5 週
**風險**：動資料庫結構比較大，要留時間測試 migration
**登入方式**：**email + password**（bcrypt hash，之後可升級 magic link）

**⚠️ Week 3 心理準備**：
跟前兩週體感差很多——
- 第一兩天 UI 看不到變化（都在建 users、branches、auth middleware）
- 然後突然全部變樣（登入頁出現、要登入才能用、觀看自動化）
- 過程中會有一波 bug（FK migration、舊資料對應、session 過期處理）

---

#### Sprint 3A — 使用者系統基礎（約 3-4 天）

預計產出 5-7 個 patch：

- [ ] `backend/requirements.txt` 加 `bcrypt`、`PyJWT`、`python-multipart`
- [ ] `backend/database.py` 建 `users` 表（id, name, email, password_hash, role, branch_id, created_at）
- [ ] `backend/database.py` 建 `branches` 表（id, name, code, created_at）
- [ ] `backend/database.py` 加 users/branches 的 CRUD 函式
- [ ] 新檔案 `backend/auth.py`：password hash、JWT 產生與驗證、middleware
- [ ] `backend/app.py` 加登入 API（`POST /api/auth/login`）
- [ ] `backend/app.py` 加登出 API、取得當前使用者 API
- [ ] `backend/app.py` 其他 endpoint 加上 auth dependency
- [ ] 新檔案 `backend/seed.py`：初始化一個 admin + 一個示範分校
- [ ] 新檔案 `frontend/src/pages/Login.jsx`
- [ ] `frontend/src/App.jsx` 加 protected route 邏輯
- [ ] 新檔案 `frontend/src/context/AuthContext.jsx`：管理登入狀態
- [ ] `frontend/src/components/Sidebar.jsx` 顯示當前使用者 + 登出按鈕
- [ ] `frontend/src/utils/api.js` 所有請求自動帶 JWT

**Sprint 3A 驗收**：
- 無痕視窗開網站 → 被導去登入頁
- 用 seed 帳號登入 → 進 Dashboard
- 原本所有功能照舊能用
- Sidebar 顯示使用者名稱 + 登出按鈕
- 登出後再打 API 會回 401

---

#### Sprint 3B — 資料 FK 化（約 2 天）

- [ ] `videos.uploader_name` → 改用 `uploader_user_id`（FK to users.id）
- [ ] `views.viewer_name` / `viewer_role` → 改用 `viewer_user_id`（FK）
- [ ] `tasks.assignee` → 改用 `assignee_user_id`（FK）
- [ ] 舊資料 migration 腳本：把文字欄位對應到預設 admin user
- [ ] 前端所有顯示使用者的地方改成從 FK join 取名稱
- [ ] `Upload.jsx` 移除「上傳者」欄位（直接用 session user）

**Sprint 3B 驗收**：
- 舊影片的上傳者顯示正確對應到 admin
- 新上傳不用填「上傳者」，自動取 session user
- 觀看紀錄、任務的 assignee 都從 users 表取

---

#### Sprint 3C — 觀看自動化 + 權限（約 2-3 天）

- [ ] `VideoDetail.jsx` mount 時自動寫 view（status=pending）
- [ ] 播放進度 tracking：播到 80% 自動翻 completed
- [ ] 加「手動標記已看完」按鈕（給文件類型使用）
- [ ] 移除原本的「填表 Modal」觀看紀錄
- [ ] `videos` 表加 `visibility` 欄位（public / internal / confidential）
- [ ] `videos` 表加 `target_roles` 欄位（JSON array）
- [ ] `Upload.jsx` 加 visibility 和 target_roles 欄位
- [ ] API 層加權限檢查：依 branch_id 和 visibility 過濾資料
- [ ] Task assignee 改成下拉選單（從 users 表撈）
- [ ] `Dashboard.jsx` 加「我還沒看的」tab
- [ ] `Dashboard.jsx` 加「指派給我的任務」tab

**Sprint 3C 驗收**：
- 可建立 2 個分校、每校 2 個使用者
- A 分校的人看不到 B 分校的影片
- 觀看紀錄不用填表單，進頁面自動記錄
- 管理員可設影片權限層級
- Dashboard 顯示 personalized views

---

### Week 4 — 搜尋升級（待開始）

**目標**：把 `LIKE '%query%'` 升級成**語意搜尋 + 段落級結果**。
**時間估計**：約 1 週

- [ ] 整合 OpenAI embeddings（`text-embedding-3-small`）
- [ ] Analyses 表加 `summary_embedding` 欄位（BLOB 或 JSON）
- [ ] Transcript segments 每段產 embedding（新增 `segment_embeddings` 表）
- [ ] 後端實作 cosine similarity 搜尋（numpy 夠用，不需要向量資料庫）
- [ ] `/api/search` 支援 filter（分類、檔案類型、日期、上傳者、分校）
- [ ] 搜尋結果回傳段落級：命中某段落時，回傳段落內容 + 時間戳 + 跳轉連結
- [ ] `Search.jsx` 顯示段落級結果（點擊直接跳到那支影片的那個時間點）
- [ ] 加「相關影片推薦」（基於 embedding 相似度）

**Week 4 驗收**：
- 搜尋「家長抱怨怎麼處理」能找到講到「家長反應、家長溝通」的影片（即使沒字面命中）
- 點搜尋結果可直接跳到影片的 3:42 而不是整支影片從頭

---

### Week 5 — Admin 儀表板（待開始）

**目標**：讓總部真的能「管」。
**時間估計**：約 1 週

- [ ] 新增 `/admin` route（僅 admin role 可進）
- [ ] 跨影片觀看率矩陣（每人 × 每支片的觀看狀態）
- [ ] 未完成任務清單（按分校、按使用者分組）
- [ ] 熱門搜尋詞統計
- [ ] 異常提示：哪些人長期沒看、哪些影片沒人看、哪些任務逾期
- [ ] 各分校使用率對比
- [ ] 匯出管理報表（Excel / PDF）

---

### Week 6 — 版本管理 + 推送通知（待開始）

**目標**：讓舊影片有秩序地退場，讓新影片主動觸及使用者。
**時間估計**：約 1 週

- [ ] Videos 表加 `supersedes_id`（FK to videos.id，指向被取代的舊版）
- [ ] Videos 表加 `is_current` flag
- [ ] `Upload.jsx` 加「取代哪支舊影片」下拉選項
- [ ] 搜尋預設只顯示 `is_current=true`，可勾選「包含歷史版本」
- [ ] 新影片上傳通知（email + in-app）
- [ ] 「我的待看清單」頁面
- [ ] 指派任務時通知 assignee
- [ ] 任務逾期提醒

---

### Week 7 — PPT/文件預覽 + 下載權限（待開始）

**時間估計**：約 1 週

- [ ] PPT 預處理用 LibreOffice 轉圖片，前端做輪播預覽
- [ ] PDF 用 pdf.js 做內嵌預覽
- [ ] 擁有者可下載自己上傳的原檔（需權限檢查）
- [ ] Admin 可下載任何原檔（audit log 記錄）
- [ ] `VideoDetail.jsx` 載入效能優化（lazy load tabs）
- [ ] 手機 RWD 檢查（目前 Desktop-first）

---

### Week 8 — 安全性 + 打包（待開始）

**目標**：能打包給真實分校用。
**時間估計**：約 1 週

- [ ] CORS 收斂（不再 `allow_origins=["*"]`）
- [ ] Rate limiting（`slowapi` 或類似）
- [ ] Audit log 表（記錄刪除、下載、權限變更）
- [ ] Upload streaming write（目前整個檔案讀進 memory，大檔會 OOM）
- [ ] 環境變數管理（production .env 模板）
- [ ] Error tracking（Sentry 或簡易版）
- [ ] 前端 error boundary
- [ ] 後端統一 error handler
- [ ] 部署文件（Dockerfile、docker-compose、nginx 設定）
- [ ] 資料庫從 SQLite 升級到 PostgreSQL（多租戶需要）

---

## 🗺 可能的延伸功能（Week 8 之後）

這些不在原本 MVP 範圍，但文件裡有提到，未來可能要做：

- [ ] **收費計量系統**：依分校、依使用者數、依 AI 使用量計費
- [ ] **多語言**：英文版介面（給外籍分校）
- [ ] **OCR for 掃描 PDF**：目前掃描 PDF 會報錯
- [ ] **影片段落編輯**：讓使用者手動修改 AI 產的 key_segments
- [ ] **培訓認證系統**：看完影片做測驗、發證書
- [ ] **跨影片知識點關聯**：自動建立知識圖譜
- [ ] **行動 App**：主任碎片時間看培訓
- [ ] **與其他模組整合**：錄音作業、學習歷程、看課系統（整個長頸鹿 AI 校園的共通地基）

---

## 📝 設計決策記錄（Decision Log）

| 日期 | 決策 | 原因 |
|------|------|------|
| 2026/04/18 | 模型升到 gpt-4o | 品質優先，每支 1 小時影片成本約 12-15 台幣可接受 |
| 2026/04/18 | 使用者系統放在 Week 3 做，不是 Week 1 | 先做差異化看得見的功能，使用者系統沒有 demo 價值 |
| 2026/04/18 | 原檔預設不開放下載 | 保護總部 know-how、避免外流；擁有者下載等 Week 3 有使用者系統再做 |
| 2026/04/18 | DB 預留 `_user_id` 欄位但暫留字串欄位 | 現在不做使用者系統，但未來 FK 化時不用改 schema |
| 2026/04/18 | PPT 不做預覽 | 瀏覽器原生不支援，等 Week 7 用 LibreOffice 轉圖 |
| 2026/04/18 | Week 3 登入用 email+password（非 magic link） | 使用者熟悉、不需 email 寄信服務；之後可升級 |

---

## ⚠️ 已知問題 / 技術債

這些是目前放著的問題，之後要補：

- [ ] **CORS 全開**：`allow_origins=["*"]`，production 不能這樣（Week 8 修）
- [ ] **沒有 auth**：任何人都能 DELETE API（Week 3 修）
- [ ] **Upload 整個檔案進 memory**：大檔會 OOM（Week 8 修）
- [ ] **uploads/ 目錄沒有存取控制**：只要猜到路徑就能拿檔案（Week 3/8 修）
- [ ] **VideoDetail.jsx 太長**（720+ 行）：之後要拆檔
- [ ] **沒有 audit log**：誰刪了什麼都沒紀錄（Week 8 修）
- [ ] **手機 RWD 沒測**：目前 Desktop-first（Week 7 檢查）
- [ ] **沒有 error boundary**：單一元件錯誤會整頁白畫面（Week 8 修）
- [ ] **SQLite 多租戶限制**：上線前要換 PostgreSQL（Week 8）

---

## 🎓 給未來 Claude 的交接筆記

如果你是接手這個對話的 Claude，請讀以下內容：

### 這個使用者的工作風格
- 繁體中文溝通（台灣）
- 偏好**具體到可以直接貼上去跑的 code patch**，不喜歡抽象建議
- 實作過程中會邊做邊問問題（「為什麼要這樣」「這樣可以嗎」）
- 願意測試，但需要被鼓勵和具體的測試方法（給他「做這個指令、看這個結果」）
- 會截圖回報進度，視覺驗收很重要
- 常說「我想聽你的建議」→ 直接做決定，不要把球踢回去

### 互動的節奏
1. **先確認方向** → 問 1-3 個會影響實作的問題
2. **給具體 patch** → 檔案名 + 要改哪幾行 + 完整 code
3. **給測試方法** → 怎麼跑、看什麼結果算成功
4. **等他回報** → 成功就往下、卡住就 debug
5. **不要一次丟太多** → 每週一個主題，每個主題 3-6 個 patch

### 可以直接問他的問題範本
- 「Week X 的 Y 件事我現在做完了嗎？」→ 他會用截圖或文字確認
- 「你要選 A 還是 B？」→ 使用 `ask_user_input_v0` 工具給 2-4 個選項
- 「需要我更新進度文件嗎？」→ 每週 sprint 結束可以問

### 原始需求文件
如果需要回顧原始需求（六大模組、影片培訓是其中一個），使用者最初的需求文件是關於「長頸鹿 AI 校園」整體規劃，包含：
1. 錄音作業系統
2. **影片培訓整理系統** ← 目前在做這個
3. 教務教學輔導系統
4. 看課與教學品質追蹤系統
5. 智慧校園平台/班軟
6. 學習歷程系統

共通要求：模組化、權限分層、商業化後台、輸出能力、資料整合、操作簡化、後續擴充。

---

## 📞 更新這份文件的指令範本

每週結束時，可以對 Claude 說：

> 「幫我更新進度文件，把 Week X 的 [具體完成的項目] 打勾，然後把 [新發現的問題] 加到技術債區塊」

或是：

> 「我要開新聊天室了，先把目前進度總結一次更新到文件」

Claude 會產出最新版 markdown，你存回本地就好。

**兩份都要記得更新**：
- `progress.md`（這份）：完整細節
- `handoff.md`：精簡版，每次開新對話貼用
