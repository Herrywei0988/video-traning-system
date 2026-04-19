# 長頸鹿 AI 校園 - 影片培訓整理系統 · 專案進度

> **最後更新**：2026/04/19（Week 3 Sprint 3A + 視角切換器完成）
> **專案階段**：Week 3 進行中 · 準備開工 Sprint 3B
> **目標**：把培訓影片從「看完就算」變成可追蹤、可搜尋、可累積、可收費的組織知識系統

---

## 📋 如何使用這份文件

這份文件是**完整版規格書**，用於存在專案的 `docs/` 目錄做完整記錄。

**三份文件的分工**：
- **這份（progress.md）**：完整規格、所有細節、設計決策歷史、技術債
- **`handoff.md`**（精簡版）：每次開新對話貼進去給新 Claude 接手用
- **`README.md`**：門面，給外部人看，含 Roadmap 進度表格

**更新時機**：
- 每週 Sprint 結束 → 更新三份
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

## 💼 商業模型（影響所有權限設計）

**分校可以做什麼：**
- ✅ 看 AI 分析結果（摘要、重點、FAQ、待辦）
- ✅ 在網頁內播放影片/音檔（串流）
- ✅ 未來看 PPT/文件內容（Week 7 轉圖預覽）
- ✅ 下載 PDF 分析報告
- ❌ **不能下載原檔**（保護總部 know-how）
- ❌ **不能上傳**（只有總部是內容生產者）

**總部（admin）可以做什麼：**
- ✅ 全部權限
- ✅ 下載任何原檔
- ✅ 上傳新內容
- ✅ 管理使用者與分校

**Netflix 模式 vs iTunes 模式**：這是 Netflix 模式——付費看，不能帶走檔案。分校買的是「內容使用權 + AI 整理服務」，不是「檔案所有權」。

---

## 🏗 技術架構

**前端**：React + Vite + React Router + **JWT Auth**（SPA）
**後端**：FastAPI + SQLite + **bcrypt + PyJWT**
**AI**：OpenAI Whisper（語音轉文字）+ GPT-4o（結構化分析）
**檔案儲存**：本機 `uploads/` 目錄（Week 8 前改方案）
**部署環境**：WSL / Linux

**專案結構**：
```
video-traning-system/
├── backend/
│   ├── app.py              # FastAPI 入口、API endpoints、auth 保護
│   ├── ai_service.py       # Whisper + GPT-4o 處理
│   ├── database.py         # SQLite CRUD（含 users、branches）
│   ├── auth.py             # Password hash + JWT + dependencies
│   ├── seed.py             # 初始化 admin 帳號
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/          # Dashboard, Upload, VideoDetail, Search, Login
│       ├── components/     # Sidebar, VideoCard, Modal, Badges, ViewAsBanner...
│       ├── hooks/
│       ├── context/        # ToastContext, AuthContext（含 effectiveRole）
│       └── utils/          # api.js (含 JWT 自動帶入)
├── docs/                   # progress.md, handoff.md
├── scripts/                # backup.sh 等
└── uploads/                # 原始檔案儲存
```

**資料庫 schema（目前）**：
- `videos` — 影片/檔案基本資訊（含預留欄位 `uploader_user_id`）
- `analyses` — AI 分析結果（含 `transcript_segments` 時間戳資料）
- `views` — 觀看紀錄（含預留欄位 `viewer_user_id`）
- `tasks` — 追蹤任務（含預留欄位 `assignee_user_id`）
- `users` — 使用者（email、password_hash、role、branch_id）
- `branches` — 分校（含是否總部標記）

---

## ✅ 已完成

### Week 1 — AI 底層升級 ✅

**完成日期**：2026/04/18
**目標**：讓 AI 處理出來的資料有時間戳，為 Week 2 的段落跳轉打基礎。

**具體完成項目**：
- [x] `.env` 模型升級 `gpt-4o-mini` → `gpt-4o`
- [x] `database.py` migration：`analyses.transcript_segments` 欄位（存 JSON）
- [x] `database.py` migration：預留 `uploader_user_id`、`viewer_user_id`、`assignee_user_id` 欄位
- [x] `database.py` 的 `save_analysis` 支援 segments 參數
- [x] `database.py` 的 `get_analysis` 把 `transcript_segments` parse 回 list
- [x] `ai_service.py` 的 `chunk_audio` 回傳 `(chunk_path, start_offset)`
- [x] `ai_service.py` 的 `transcribe_audio` 改用 `verbose_json` + `timestamp_granularities=["segment"]`
- [x] `ai_service.py` 的 `_build_prompt` 支援 `has_timestamps` 參數
- [x] `ai_service.py` 的 `analyze` 接收 segments 並要求 AI 輸出 `start_time`
- [x] Content 提升到 15000 字（gpt-4o 有 128k context）
- [x] `process_file` 回傳多一個 `segments`
- [x] `process_file_bg` 傳 segments 給 `save_analysis`

**驗收結果**：
- ✅ 上傳 21 秒音檔 → Whisper 吐出 4 段時間戳（start=0, 4, 8, 12）
- ✅ DB 的 `transcript_segments` 有完整 JSON
- ✅ `key_segments` 每筆有 `start_time` 欄位
- ✅ gpt-4o 分析品質肉眼可見比 mini 好

**額外修掉的 bug**：
- [x] ffmpeg 未安裝時錯誤訊息模糊 → 改成明確提示「請安裝 ffmpeg」

---

### Week 2 — VideoDetail 改造 ✅

**完成日期**：2026/04/18
**目標**：讓使用者在系統內感受到「這不是 GPT 包殼」。

**具體完成項目**：
- [x] `/api/videos/{video_id}/file` 串流 endpoint（支援 HTTP Range headers）
- [x] `CONTENT_TYPES` 對應表（影片/音檔 MIME type）
- [x] `_is_refusal()` 函式，偵測 AI 拒絕並轉成友善錯誤訊息
- [x] `VideoDetail.jsx` 嵌入 HTML5 `<video>` / `<audio>` 播放器
- [x] `mediaRef`、`seekTo()`、`formatSeconds()` helper
- [x] 關鍵段落加「▶ 跳到 XX:XX」按鈕，可點擊跳轉（**實測通過**）
- [x] 「看完這支你要做的三件事」固定行動區塊
- [x] 行動區塊根據當前 role（主管/班主任/老師）過濾相關任務
- [x] PDF 匯出分角色：Topbar 兩顆按鈕（當前角色版 + 完整版）
- [x] PPT/PDF/Word 類型顯示「文件已完成 AI 整理」提示條

---

### Week 3 Sprint 3A — 使用者系統後端 + 前端登入 ✅

**完成日期**：2026/04/18
**目標**：建立使用者系統地基，admin 可以登入、其他人看不到網站。

**Batch 1（後端 auth 地基）**：
- [x] `requirements.txt` 加 `bcrypt`、`PyJWT`、`python-multipart`
- [x] `.env` 加 `JWT_SECRET`、`JWT_EXPIRE_HOURS=24`
- [x] `database.py` 建 `users` / `branches` 表與 CRUD
- [x] 新建 `auth.py`：bcrypt 密碼 hash、JWT 產生/驗證、dependencies
- [x] 新建 `seed.py`：初始化 HQ 分校 + admin 帳號（`admin@giraffe.local` / `admin123456`）
- [x] `app.py` 加三個 auth endpoints，所有原有 endpoint 加 auth 保護
- [x] `POST /api/videos/upload` 特別改用 `require_admin`

**Batch 2（前端登入流程）**：
- [x] 新建 `AuthContext.jsx`：管理 user/token/loading 狀態
- [x] 新建 `Login.jsx`：藍色漸層背景、email+password 表單
- [x] `utils/api.js` 重寫：每個請求自動帶 JWT、401 自動導回登入頁
- [x] `App.jsx` 重寫：加 `<AuthProvider>`、`<ProtectedLayout>`、`/login` route
- [x] `Sidebar.jsx` 重寫：左下角顯示使用者 + 角色 + 登出按鈕；admin-only 選單過濾

**驗收通過**：登入/登出/錯誤密碼/token 過期全部驗證通過。

---

### Week 3 插隊任務 — UI 改版 + 視角切換器 ✅

**完成日期**：2026/04/19
**目標**：讓系統有品牌感，並讓 admin 可以預覽各角色視角，不需要真的建四個帳號登入登出。

**UI 改版（品牌橘色）**：
- [x] 修掉 Sidebar 因 CSS 衝突造成的排列 bug（選項變橫排、文字消失）
- [x] Sidebar 改用 inline style，不再受 `.sidebar-nav` 全域 CSS 影響
- [x] `index.css` 的 `:root` 區塊全站換色：`--primary` 由藍 `#2563eb` → 橘 `#f97316`
- [x] 背景色由冷藍白 `#f0f4ff` → 暖米白 `#fffaf5`
- [x] Sidebar 背景保留白色，active 狀態用淺橘底
- [x] Shadow 光暈色調跟著換成橘色
- [x] 狀態色（綠/黃/紅/青）不動，保持語意

**視角切換器 Batch 1（操作面）**：
- [x] `AuthContext.jsx` 新增三個 state：`viewAsRole` / `effectiveRole` / `effectiveContentRole`
- [x] 新增 `ROLE_TO_CONTENT` 映射表：

- admin → exec
- principal → manager
- teacher → teacher
- staff → teacher

- [x] `viewAsRole` 存在 sessionStorage（關 tab 歸零，避免忘記預覽模式）
- [x] 新建 `ViewAsBanner.jsx`：頂部橘色 banner，提示當前視角+回到本人按鈕
- [x] `App.jsx` 在 `.main` 最上方插入 `<ViewAsBanner />`
- [x] `Sidebar.jsx` 重寫 avatar 區：點擊展開下拉選單（舊版是純顯示）
- [x] 下拉選單結構：email → 視角切換列表（只有真 admin 可見）→ 登出
- [x] 下拉選單的互動：點外部/ESC 關閉、當前視角打勾、本人標「（本人）」
- [x] Sidebar 選單過濾改用 `effectiveRole`（預覽 teacher 時「上傳資料」會消失）

**視角切換器 Batch 2（內容面）**：
- [x] `VideoDetail.jsx` 引入 `useAuth`
- [x] 定義 `canSwitchRole = isRealAdmin && !isViewingAs`
- [x] `role` state 預設值改為 `effectiveContentRole`
- [x] 加 `useEffect` 同步：`effectiveContentRole` 變化時自動 `setRole`
- [x] Topbar「完整版」PDF 按鈕用 `canSwitchRole` 包條件（預覽視角下只剩角色版一顆）
- [x] Role switcher（三個版本按鈕）用 `canSwitchRole` 包條件（預覽視角下整組消失）

**驗收結果**：
- ✅ Sidebar 樣式正常（選項垂直、文字完整顯示）
- ✅ 全站主色正確變橘（按鈕、active、hover 都對）
- ✅ admin 本人視角：三個版本切換器 + 兩顆 PDF 按鈕
- ✅ admin 切換到班主任視角：頂部橘色 banner 出現、「上傳資料」消失、切換器消失、摘要變班主任版、PDF 只剩「匯出班主任版」
- ✅ 切到老師/行政視角同樣正確（staff→teacher 映射驗證通過）
- ✅ 「回到真實身份」按鈕所有 admin UI 正確回復
- ✅ F5 刷新保留預覽狀態（sessionStorage）
- ✅ 登出後重新登入，預覽狀態清除

---

## 🚧 待完成

### Week 3 Sprint 3B — 資料 FK 化（下一步）

**時間估計**：約 2 天

- [ ] `videos.uploader_name` → `uploader_user_id`（FK to users.id）
- [ ] `views.viewer_name` / `viewer_role` → `viewer_user_id`（FK）
- [ ] `tasks.assignee` → `assignee_user_id`（FK）
- [ ] 舊資料 migration：把文字欄位對應到預設 admin user
- [ ] 前端所有顯示使用者的地方改成從 FK join 取名稱
- [ ] `Upload.jsx` 移除「上傳者」欄位（直接用 session user）
- [ ] API 回傳時 join users 表

**驗收**：舊影片上傳者對應到 admin、新上傳自動取 session user、assignee 從 users 表取

---

### Week 3 Sprint 3C — 觀看自動化 + 權限擋牆

**時間估計**：約 2-3 天

- [ ] `VideoDetail.jsx` mount 時自動寫 view（status=pending）
- [ ] 播放進度 tracking：播到 80% 自動翻 completed
- [ ] 加「手動標記已看完」按鈕（文件類型用）
- [ ] 移除原本的「填表 Modal」觀看紀錄
- [ ] `videos` 表加 `visibility` 欄位（public / internal / confidential）
- [ ] `videos` 表加 `target_roles` 欄位（JSON array）
- [ ] `Upload.jsx` 加 visibility 和 target_roles 欄位
- [ ] API 層加權限檢查邏輯：admin 看全部、principal 看同 branch 的 public+internal、teacher 看同 branch 的 public
- [ ] Task assignee 改成下拉選單（從 users 表撈同 branch users）
- [ ] `Dashboard.jsx` 加「我還沒看的」/「指派給我的任務」tab
- [ ] 建示範帳號：A 分校 1 principal + 2 teacher、B 分校 1 principal + 1 teacher
- [ ] **VideoDetail 操作按鈕（編輯/刪除/新任務/重新分析）改用 `effectiveRole` guard**（Batch 2 故意沒做，3C 統一處理）

**權限模型（最終確認）**：

| 角色 | role 值 | public | internal | confidential | 上傳 | 下載原檔 | 匯出 PDF |
|------|--------|--------|----------|--------------|------|----------|----------|
| 總部管理員 | admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 分校主任 | principal | ✅(同分校) | ✅(同分校) | ❌ | ❌ | ❌ | ✅ |
| 分校老師 | teacher | ✅(同分校) | ❌ | ❌ | ❌ | ❌ | ✅ |
| 分校行政 | staff | ✅(同分校) | ❌ | ❌ | ❌ | ❌ | ✅ |

**visibility 三層**：
- `public`：家長溝通話術、教學示範、公共培訓
- `internal`：主任級管理培訓、經營重點
- `confidential`：加盟策略、內部數字、敏感培訓（總部 only）

---

### Week 3 Sprint 3D — 個人化 Schema（新增 · 2026/04/19 規劃）

**時間估計**：約 1-2 天
**插入位置**：Sprint 3C 之後、Week 4 之前
**緣由**：原 Roadmap 只規劃了「使用者帳號」跟「觀看紀錄」，但漏了**使用者在系統裡會累積的東西**（筆記、書籤、續看進度、搜尋歷史）。沒有這層，系統對使用者來說還是「匿名查資料」而不是「自己的知識庫」。

**新增表**：

| 新表 | 欄位 | 用途 |
|------|------|------|
| `user_notes` | id, user_id, video_id, content, timestamp_sec, created_at, updated_at | 使用者在某支影片的私人筆記（可選附時間戳） |
| `user_bookmarks` | id, user_id, video_id, start_time, note, created_at | 標記影片某段「這段重要」 |
| `watch_progress` | user_id, video_id, last_position_sec, completed_at, updated_at | 續看用（PK: user_id + video_id） |
| `search_history` | id, user_id, query, result_count, searched_at | Admin 儀表板要做「熱門搜尋詞」的資料源 |
| `activity_log` | id, user_id, action, target_type, target_id, metadata, created_at | 審計 + debug + 使用率分析 |

**前端任務**：
- [ ] VideoDetail 右側加「我的筆記」面板（drawer 或 tab）
- [ ] 影片段落旁邊加「🔖 加書籤」按鈕
- [ ] Dashboard 加「繼續觀看」區塊（列出 watch_progress 未完成的）
- [ ] `/api/search` 呼叫時寫 search_history
- [ ] 所有寫入操作補寫 activity_log

**驗收**：
- 使用者重登入後仍看得到自己的筆記跟書籤
- 關影片頁再打開能從上次位置繼續
- Dashboard 正確顯示未看完的影片

---

### Week 4 — 搜尋升級（待開始）

**時間估計**：約 1 週

- [ ] 整合 OpenAI embeddings（`text-embedding-3-small`）
- [ ] Analyses 表加 `summary_embedding` 欄位
- [ ] Transcript segments 每段產 embedding（新增 `segment_embeddings` 表）
- [ ] 後端實作 cosine similarity 搜尋（numpy 夠用）
- [ ] `/api/search` 支援 filter（分類、檔案類型、日期、上傳者、分校）
- [ ] 搜尋結果回傳段落級：命中段落時回傳段落內容 + 時間戳
- [ ] `Search.jsx` 顯示段落級結果（點擊跳到影片對應時間）
- [ ] 加「相關影片推薦」（基於 embedding 相似度）
- [ ] 搜尋結果套用權限過濾

---

### Week 5 — Admin 儀表板（待開始）

**時間估計**：約 1 週

- [ ] 新增 `/admin` route（僅 admin）
- [ ] 跨影片觀看率矩陣
- [ ] 未完成任務清單
- [ ] 熱門搜尋詞統計（吃 Sprint 3D 的 search_history）
- [ ] 異常提示：長期沒看、沒人看、任務逾期
- [ ] 各分校使用率對比
- [ ] 匯出管理報表
- [ ] 使用者管理頁
- [ ] 分校管理頁

---

### Week 6 — 版本管理 + 推送通知（待開始）

**時間估計**：約 1 週

- [ ] Videos 表加 `supersedes_id` FK
- [ ] Videos 表加 `is_current` flag
- [ ] `Upload.jsx` 加「取代哪支舊影片」下拉
- [ ] 搜尋預設只顯示 `is_current=true`
- [ ] 新影片上傳通知（email + in-app）
- [ ] 「我的待看清單」頁面
- [ ] 指派任務時通知 assignee
- [ ] 任務逾期提醒

---

### Week 7 — PPT/文件預覽 + 下載權限（待開始）

**時間估計**：約 1 週

- [ ] PPT 用 LibreOffice 轉圖片，前端做輪播預覽
- [ ] PDF 用 pdf.js 做內嵌預覽
- [ ] Admin 可下載任何原檔（audit log）
- [ ] `VideoDetail.jsx` 載入效能優化
- [ ] 手機 RWD 檢查

---

### Week 8 — 上線基建（擴充範疇 · 2026/04/19）

**時間估計**：約 1 週（從原本「安全性 + 打包」擴充為完整基建）

**原有項目**：
- [ ] CORS 收斂
- [ ] Rate limiting（`slowapi`）
- [ ] Audit log 表（已被 Sprint 3D 的 activity_log 覆蓋）
- [ ] Upload streaming write
- [ ] Production .env 模板
- [ ] JWT 改用 httpOnly cookie
- [ ] 加 refresh token 機制
- [ ] 密碼強度檢查 + 強制改預設密碼
- [ ] Error tracking（Sentry）
- [ ] 前端 error boundary
- [ ] 後端統一 error handler
- [ ] 部署文件（Dockerfile、docker-compose、nginx）
- [ ] 資料庫從 SQLite 升級 PostgreSQL

**新增項目（架構洞察）**：
- [ ] **檔案儲存遷移**：本機 `uploads/` → 物件儲存（S3 / MinIO / Cloudflare R2 擇一）或外接掛載磁碟
- [ ] **自動備份機制**（正式版）：Postgres pg_dump 每日 + 檔案目錄 rsync 異地
- [ ] **資料保留政策**：刪除影片時相關 notes/bookmarks/views 怎麼處理（CASCADE vs SET NULL）
- [ ] **資料匯出功能**：給分校「退租」時能帶走自己 branch 的資料（JSON 匯出）
- [ ] **分校資料隔離從應用層強制到 DB 層**（Row Level Security 或每查詢強制 `WHERE branch_id = ?`）

---

## 🗺 可能的延伸功能（Week 8 之後）

- [ ] 收費計量系統
- [ ] 多語言
- [ ] OCR for 掃描 PDF
- [ ] 影片段落編輯
- [ ] 培訓認證系統
- [ ] 跨影片知識點關聯
- [ ] 行動 App
- [ ] 與其他五大模組整合

---

## 📝 設計決策記錄（Decision Log）

| 日期 | 決策 | 原因 |
|------|------|------|
| 2026/04/18 | 模型升到 gpt-4o | 品質優先，每支 1 小時影片成本約 12-15 台幣可接受 |
| 2026/04/18 | 使用者系統放 Week 3 不是 Week 1 | 先做差異化看得見的功能 |
| 2026/04/18 | **原檔預設不開放下載（Netflix 模式）** | 保護總部 know-how、避免外流 |
| 2026/04/18 | DB 預留 `_user_id` 欄位暫留字串 | 未來 FK 化時不用改 schema |
| 2026/04/18 | PPT 不做預覽 | 瀏覽器原生不支援，Week 7 轉圖 |
| 2026/04/18 | Week 3 登入用 email+password | 使用者熟悉、不需 email 寄信服務 |
| 2026/04/18 | **Session 機制用 JWT 不用 cookie** | 未來其他模組串同一套 auth 方便 |
| 2026/04/18 | **JWT 存 localStorage** | 簡單直接；Week 8 可升級 httpOnly cookie |
| 2026/04/18 | **只有總部能上傳，分校只能看** | Netflix 模式、品牌一致 |
| 2026/04/18 | **分校看得到影片播放 + AI 分析，只能匯出 PDF** | 付費看使用權，不能帶走所有權 |
| 2026/04/18 | **Sprint 3A 先開 admin 全權限，Sprint 3C 再擋** | 先做「有權限情境」再做「擋權限情境」 |
| 2026/04/19 | **主色改為長頸鹿橘 `#f97316`**（Tailwind orange-500） | 品牌一致性；原藍色是 Template 預設 |
| 2026/04/19 | **狀態色不換，仍綠/黃/紅/青** | 語意色跟品牌色職責不同，混用會亂 |
| 2026/04/19 | **做 `effectiveRole` 抽象，所有 UI 過濾吃這個不吃 `user.role`** | 支援 admin 預覽模式；未來 3C 做完仍然是正確抽象 |
| 2026/04/19 | **`viewAsRole` 存 sessionStorage 而非 localStorage** | 關 tab 歸零，避免使用者忘記自己在預覽模式 |
| 2026/04/19 | **User role ↔ Content role 映射：staff → teacher** | 最終權限表中 staff 跟 teacher 可見權限完全相同，內容也該一致 |
| 2026/04/19 | **只有真 admin 看得到視角切換器** | teacher 不能切成 admin 看自己不該看的；安全性考量 |
| 2026/04/19 | **VideoDetail 操作按鈕（編輯/刪除等）不做 effectiveRole 擋** | 屬於寫入權限，3C 會統一處理；Batch 2 不重複做 |
| 2026/04/19 | **新增 Sprint 3D 個人化 Schema** | 原 Roadmap 漏了使用者個人累積資料；不做會讓系統感覺「匿名查資料」 |
| 2026/04/19 | **Week 8 擴充為「上線基建」範疇** | 原 Roadmap 對檔案儲存、備份策略、資料隔離著墨不足 |

---

## ⚠️ 已知問題 / 技術債

**高優先（會影響未來功能）**：
- [ ] **VideoDetail.jsx 太長**（920+ 行），3D/3C 時拆檔
- [ ] **VideoDetail 操作按鈕未依 effectiveRole 擋**（Sprint 3C 處理）
- [ ] **uploads/ 目錄沒存取控制**（Sprint 3C/Week 8）
- [ ] **分校資料隔離靠應用層不靠 DB 層**（Week 8 擴充）

**中優先（Week 8 前解決）**：
- [ ] **CORS 全開** `allow_origins=["*"]`
- [ ] **JWT 存 localStorage 有 XSS 風險**（升級 httpOnly cookie）
- [ ] **JWT 24 小時過期太長**（改 1-2 小時 + refresh token）
- [ ] **seed.py 密碼寫死預設值**（強制環境變數）
- [ ] **沒有密碼強度檢查**
- [ ] **沒有 rate limit**，登入 API 可以被 brute force
- [ ] **Upload 整個檔案進 memory**，大檔會 OOM
- [ ] **SQLite 多租戶限制**，上線前要換 PostgreSQL

**低優先（體驗改善）**：
- [ ] **PDF 輸出的內嵌 CSS 仍是舊藍色 `#3b82f6`**（品牌統一時順手改 VideoDetail.jsx L218-220）
- [ ] **沒有 error boundary**（Week 8）
- [ ] **沒有忘記密碼功能**（Week 5 admin 儀表板做）
- [ ] **手機 RWD 沒測**（Week 7）

---

## 🎓 給未來 Claude 的交接筆記

### 這個使用者的工作風格
- 繁體中文溝通（台灣）
- 偏好**具體到可以直接貼上去跑的 code patch**，不喜歡抽象建議
- 實作過程中會邊做邊問問題
- 願意測試，但需要具體的測試方法（給他「做這個指令、看這個結果」）
- 會截圖回報進度，視覺驗收很重要
- 常說「我想聽你的建議」→ 直接做決定，不要把球踢回去
- git commit 用多行建議 `git commit` 打開編輯器貼（避免引號問題）

### 互動的節奏
1. 先確認方向（1-3 個問題）
2. 給具體 patch（檔案名 + 行號 + 完整 code）
3. 給測試方法（怎麼跑、看什麼結果算成功）
4. 等他回報，成功就往下、卡住就 debug
5. 不要一次丟太多，Sprint 可以拆 Batch

### 會冒出的架構性問題
這個使用者會問「對的問題」——例如資料存哪、使用者怎麼累積、壞了怎麼辦。遇到這類問題：
- **認真對待**，不要打哈哈
- **先回答「我有沒有規劃這個」**，承認漏掉的地方
- 把洞察**寫進 Roadmap** 當作新 Sprint，不要塞進「延伸功能」打發掉
- 正因為他會問，所以 progress.md 裡才會有「Sprint 3D」「Week 8 擴充」這些後加的區塊

### 踩過的雷 / 使用者環境特性
- WSL（Windows 底下的 Ubuntu），ffmpeg 用 apt 裝
- 用 `./list-files.sh` 印專案結構
- 上傳檔案常是 iPhone 的 .mov（H.264），需要 ffmpeg 抽音軌
- git commit 用 `-m "..."` 如果有雙引號會壞，要教他用 `git commit` 開編輯器

### 原始需求（六大模組）
長頸鹿 AI 校園整體規劃：
1. 錄音作業系統
2. **影片培訓整理系統** ← 目前在做
3. 教務教學輔導系統
4. 看課與教學品質追蹤系統
5. 智慧校園平台/班軟
6. 學習歷程系統

共通要求：模組化、權限分層、商業化後台、輸出能力、資料整合、操作簡化、擴充。

---

## 📞 更新文件的指令範本

每週結束時：

> 「幫我更新進度文件，把 Sprint X 的 [項目] 打勾，把 [問題] 加到技術債」

換聊天室前：

> 「我要開新聊天室了，先把目前進度總結一次更新到三份文件」

**三份都要更新**：
- `progress.md`（這份）：完整細節
- `handoff.md`：精簡版，新對話貼
- `README.md`：門面，Roadmap 打勾