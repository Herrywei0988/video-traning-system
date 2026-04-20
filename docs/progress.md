# 長頸鹿 AI 校園 - 影片培訓整理系統 · 專案進度

> **最後更新**：2026/04/20（Sprint 3C Phase 4 + Sprint 3D Phase 1/2/3 全部完成）
> **專案階段**：Week 3 收尾中 · Sprint 3D 圓滿結束,下一步 Sprint 3E(AI 小測驗)
> **目標**：把培訓影片從「看完就算」變成可追蹤、可搜尋、可累積、可收費的組織知識系統

---

## 📋 如何使用這份文件

這份文件是**完整版規格書**,用於存在專案的 `docs/` 目錄做完整記錄。

**三份文件的分工**：
- **這份（progress.md）**：完整規格、所有細節、設計決策歷史、技術債
- **`handoff.md`**（精簡版）：每次開新對話貼進去給新 Claude 接手用
- **`README.md`**：門面,給外部人看,含 Roadmap 進度表格

**更新時機**：
- 每週 Sprint 結束 → 更新三份
- 重要設計決定 → 更新 progress.md 的 decision log
- 技術債發現 → 更新 progress.md 的已知問題區塊

**在新聊天室接手**：貼 `handoff.md` 就夠了,progress.md 是需要查細節時才翻。

---

## 🎯 專案核心定位

**這個系統不是「影音倉庫」,而是「組織知識整理系統」,更精確是「訂閱制 SaaS 培訓平台」。**

核心差異化 vs 分校自己用 GPT：
1. **從「看完」到「執行完」的閉環** — 看完影片必須讓使用者知道要做什麼
2. **同一支影片、三種角色、三種版本** — 主管/班主任/老師看到的內容不同
3. **資料累積成資產** — 每支影片、每次整理、每筆重點都要沉澱成可搜尋的知識庫
4. **分校權限隔離 + 訂閱控制** — 未來要賣給分校,就要有租戶隔離和訂閱狀態管理
5. **可收費的管理工具** — 不是內部 side project,目標是總部→分校的訂閱制 SaaS

---

## 💼 商業模型（訂閱制 SaaS · 2026/04/19 重新釐清）

**兩種用戶本質不同**：

| 身份 | 角色 | 屬於 | 職責 |
|------|------|------|------|
| 內容製作方 | `admin` | 總部（長頸鹿自己） | 上傳影片、產生 AI 分析、管理全站 |
| 內容消費方 | `principal` / `teacher` / `staff` | 客戶分校（付費訂閱） | 登入看影片、看摘要、做測驗 |

**訂閱顆粒度**：MVP 做「全包制」— 分校付月費 → 旗下帳號看到所有 public 影片。
未來可升級「按分類訂閱」（例如分校只訂「招生類」就只看那類影片）。

**分校訂閱狀態**：`active` / `expired` / `trial`。
- `active` → 旗下帳號正常運作
- `expired` → 旗下帳號看不到任何影片（清單空空）
- `trial` → 等同 active 但未來可限時

**分校可以做什麼**：
- ✅ 看 AI 分析結果（摘要、重點、FAQ、待辦）
- ✅ 在網頁內播放影片/音檔（串流）
- ✅ **寫個人筆記、加書籤、續看進度**（Sprint 3D 新增）
- ✅ **看個人搜尋歷史 + 快速重搜**（Sprint 3D 新增）
- ✅ 未來看 PPT/文件內容（Week 7 轉圖預覽）
- ✅ 下載 PDF 分析報告
- ✅ 做 AI 小測驗驗收學習成效（Sprint 3E 新增）
- ❌ **不能下載原檔**（保護總部 know-how）
- ❌ **不能上傳**（只有總部是內容生產者）

**總部（admin）可以做什麼**：
- ✅ 全部權限
- ✅ 下載任何原檔
- ✅ 上傳新內容
- ✅ 管理使用者與分校
- ✅ 設定影片可見度（`public` / `internal` / `confidential`）,即時控制分校看到什麼

**Netflix 模式 vs iTunes 模式**：這是 Netflix 模式——付費看,不能帶走檔案。分校買的是「內容使用權 + AI 整理服務」,不是「檔案所有權」。

---

## 🎯 核心價值主張（四個支柱 · 2026/04/19 擴充）

這個系統不只是「影片資料庫」或「AI 摘要工具」,而是**完整的培訓成效管理平台**：

1. **線上看原檔**：分校登入後能串流播放影片、瀏覽 PPT（不能下載）
2. **AI 分析摘要**：依角色顯示不同版本（exec / manager / teacher）
3. **小測驗驗收**（Sprint 3E 新增）：AI 從影片生成題目,分校可看到旗下老師測驗成績
4. **可匯出 PDF**：線下分享、歸檔用

少了任何一個支柱,產品價值都會大打折扣。特別是「小測驗」讓「看完影片」升級成「證明學會了」,這是真正的差異化。

**使用者體驗層（Sprint 3D 補完）**:系統要讓使用者累積個人知識,不是每次來都像第一次。筆記、書籤、續看進度、搜尋歷史這四件事,讓「匿名查資料」變成「自己的知識庫」。

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
│   ├── database.py         # SQLite CRUD（含 users、branches、can_view_video helper）
│   │                       # + Sprint 3D:notes/bookmarks/progress/search_history/activity_log
│   ├── auth.py             # Password hash + JWT + stream token
│   ├── seed.py             # 初始化 admin 帳號
│   ├── seed_3c.py          # 建測試用台北分校 + teacher 帳號（Sprint 3C）
│   ├── migrate_3b.py       # Sprint 3B 一次性資料遷移（已跑過）
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/          # Dashboard, Upload, VideoDetail, Search, Login
│       ├── components/     # Sidebar, VideoCard, Modal, Badges, ViewAsBanner
│       │                   # + Sprint 3D:NotesPanel, BookmarksPanel
│       ├── hooks/
│       ├── context/        # ToastContext, AuthContext（含 effectiveRole）
│       └── utils/          # api.js (含 JWT 自動帶入 + Sprint 3D:DELETE 支援 body)
├── docs/                   # progress.md, handoff.md
├── scripts/                # backup.sh 等
└── uploads/                # 原始檔案儲存
```

**資料庫 schema（目前）**：
- `videos` — 影片/檔案基本資訊（含 `uploader_user_id` FK + `visibility`）
- `analyses` — AI 分析結果（含 `transcript_segments` 時間戳資料）
- `views` — 觀看紀錄（含 `viewer_user_id` FK）
- `tasks` — 追蹤任務（含 `assignee_user_id` FK）
- `users` — 使用者（email、password_hash、role、branch_id）
- `branches` — 分校（含 `is_headquarters`、`subscription_status`）
- **`user_notes`** — 個人筆記(Sprint 3D;可選綁 timestamp_sec)
- **`user_bookmarks`** — 個人書籤(Sprint 3D;必綁 start_time)
- **`watch_progress`** — 續看進度(Sprint 3D;composite PK user_id+video_id)
- **`search_history`** — 搜尋歷史(Sprint 3D;支援個人歷史 + admin 熱門詞)
- **`activity_log`** — 行為日誌(Sprint 3D;所有重要事件的 audit trail)

**資料庫檔名**：`backend/training.db`（不是 app.db,舊 handoff 寫錯了）

⚠️ **注意**：DB_PATH 目前是相對路徑 `"training.db"`,必須在 `backend/` 目錄執行才找得到。在其他目錄跑 `python -c "sqlite3.connect('training.db')"` SQLite 會**靜默建立空 DB**,容易誤判「資料沒了」。Week 8 要改絕對路徑。

---

## ✅ 已完成

### Week 1 — AI 底層升級 ✅

**完成日期**：2026/04/18
**目標**：讓 AI 處理出來的資料有時間戳,為 Week 2 的段落跳轉打基礎。

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
- [x] `_is_refusal()` 函式,偵測 AI 拒絕並轉成友善錯誤訊息
- [x] `VideoDetail.jsx` 嵌入 HTML5 `<video>` / `<audio>` 播放器
- [x] `mediaRef`、`seekTo()`、`formatSeconds()` helper
- [x] 關鍵段落加「▶ 跳到 XX:XX」按鈕,可點擊跳轉（**實測通過**）
- [x] 「看完這支你要做的三件事」固定行動區塊
- [x] 行動區塊根據當前 role（主管/班主任/老師）過濾相關任務
- [x] PDF 匯出分角色：Topbar 兩顆按鈕（當前角色版 + 完整版）
- [x] PPT/PDF/Word 類型顯示「文件已完成 AI 整理」提示條

---

### Week 3 Sprint 3A — 使用者系統後端 + 前端登入 ✅

**完成日期**：2026/04/18
**目標**：建立使用者系統地基,admin 可以登入、其他人看不到網站。

**Batch 1（後端 auth 地基）**：
- [x] `requirements.txt` 加 `bcrypt`、`PyJWT`、`python-multipart`
- [x] `.env` 加 `JWT_SECRET`、`JWT_EXPIRE_HOURS=24`
- [x] `database.py` 建 `users` / `branches` 表與 CRUD
- [x] 新建 `auth.py`：bcrypt 密碼 hash、JWT 產生/驗證、dependencies
- [x] 新建 `seed.py`：初始化 HQ 分校 + admin 帳號（`admin@giraffe.local` / `admin123456`）
- [x] `app.py` 加三個 auth endpoints,所有原有 endpoint 加 auth 保護
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
**目標**：讓系統有品牌感,並讓 admin 可以預覽各角色視角,不需要真的建四個帳號登入登出。

**UI 改版（品牌橘色）**：
- [x] 修掉 Sidebar 因 CSS 衝突造成的排列 bug（選項變橫排、文字消失）
- [x] Sidebar 改用 inline style,不再受 `.sidebar-nav` 全域 CSS 影響
- [x] `index.css` 的 `:root` 區塊全站換色：`--primary` 由藍 `#2563eb` → 橘 `#f97316`
- [x] 背景色由冷藍白 `#f0f4ff` → 暖米白 `#fffaf5`
- [x] Sidebar 背景保留白色,active 狀態用淺橘底
- [x] Shadow 光暈色調跟著換成橘色
- [x] 狀態色（綠/黃/紅/青）不動,保持語意

**視角切換器 Batch 1（操作面）**：
- [x] `AuthContext.jsx` 新增三個 state：`viewAsRole` / `effectiveRole` / `effectiveContentRole`
- [x] 新增 `ROLE_TO_CONTENT` 映射表：
  - admin → exec
  - principal → manager
  - teacher → teacher
  - staff → teacher
- [x] `viewAsRole` 存在 sessionStorage（關 tab 歸零,避免忘記預覽模式）
- [x] 新建 `ViewAsBanner.jsx`：頂部橘色 banner,提示當前視角+回到本人按鈕
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
- [x] Topbar「完整版」PDF 按鈕用 `canSwitchRole` 包條件
- [x] Role switcher（三個版本按鈕）用 `canSwitchRole` 包條件

**驗收結果**：
- ✅ Sidebar 樣式正常（選項垂直、文字完整顯示）
- ✅ 全站主色正確變橘（按鈕、active、hover 都對）
- ✅ admin 本人視角：三個版本切換器 + 兩顆 PDF 按鈕
- ✅ admin 切換到班主任視角：頂部橘色 banner 出現、「上傳資料」消失、切換器消失、摘要變班主任版、PDF 只剩「匯出班主任版」
- ✅ 切到老師/行政視角同樣正確（staff→teacher 映射驗證通過）
- ✅ 「回到真實身份」按鈕所有 admin UI 正確回復
- ✅ F5 刷新保留預覽狀態（sessionStorage）
- ✅ 登出後重新登入,預覽狀態清除

---

### Week 3 Sprint 3B — 資料 FK 化 ✅

**完成日期**：2026/04/19
**目標**：把舊的字串欄位（`uploader_name`、`viewer_name`、`assignee`）真正接上 users 表的 FK,讓「誰做了什麼」能精準追蹤。

**Phase 1（Migration）**：
- [x] 新建 `backend/migrate_3b.py`（冪等,可重跑）
- [x] 把 DB 裡所有舊資料的 `uploader_user_id` / `viewer_user_id` / `assignee_user_id` 填上 admin id
- [x] 驗證：三張表的 user_id 欄位全部不再是 NULL

**Phase 2（讀取端 join）**：
- [x] `database.py` 新增 `_attach_user()` helper
- [x] `get_video`、`list_videos`、`get_video_views`、`get_video_tasks` 改為 LEFT JOIN users
- [x] API 回傳多帶 `uploader: {id, name, role, branch_id}` 等完整物件
- [x] 舊字串欄位（`uploader_name` 等）保留做 fallback,不破壞向下相容

**Phase 3（寫入端 FK + auth）**：
- [x] `create_video` 多吃 `uploader_user_id` 參數
- [x] `record_view` 多吃 `viewer_user_id` 參數
- [x] `create_task` 多吃 `assignee_user_id` 參數
- [x] `POST /api/videos/upload`：`uploader_name` 改從登入者 name 取,並寫入 `uploader_user_id`
- [x] `POST /api/videos/{id}/views`：加 `Depends(auth.get_current_user)`,從登入者塞 viewer 資料
- [x] `POST /api/videos/{id}/tasks`：加 `Depends(auth.get_current_user)`
- [x] `PATCH /api/tasks/{id}/toggle`：加 `Depends(auth.get_current_user)`
- [x] `ViewRecord` schema 精簡（viewer 資訊改從登入者拿）

**Phase 4（前端顯示）**：
- [x] `VideoCard.jsx`：`video.uploader?.name || video.uploader_name`（優先新,fallback 舊）
- [x] `VideoDetail.jsx` 兩處：畫面顯示 + PDF 匯出模板
- [x] `Upload.jsx`：刪掉「上傳者」輸入欄位（改由後端從登入者取）

**Bonus（修 3A 的漏網 bug）**：
- [x] `Upload.jsx` 的 xhr 加 `Authorization: Bearer` header（api.js wrapper 只處理 JSON,xhr 是特例要手動帶）

**驗收結果**：
- ✅ 舊 3 支影片的 `uploader_user_id` 全部對應到 admin
- ✅ API 回傳帶完整 uploader 物件（含 role、branch_id）
- ✅ 新上傳的影片自動帶正確 user_id
- ✅ 三個寫入端 curl 沒帶 token 會被 401 擋
- ✅ 帶 token 後能成功寫入,DB 裡 user_id 欄位正確填值

---

### Week 3 Sprint 3C Phase 1-3 + Visibility UI — 權限擋牆 ✅

**完成日期**：2026/04/19
**目標**：讓 admin 能即時控制分校看得到什麼,實現「Netflix 式」的權限管理。

**Phase 1（Schema）**：
- [x] `database.py` init_db 加 migration：`videos.visibility TEXT DEFAULT 'public'`
- [x] `database.py` init_db 加 migration：`branches.subscription_status TEXT DEFAULT 'active'`
- [x] 舊資料自動繼承預設值（SQLite `DEFAULT` 特性,不用寫 migration 腳本）

**Phase 2（測試資料）**：
- [x] 新建 `backend/seed_3c.py`（冪等）
- [x] 建立「台北分校」客戶分校（code=TPE）
- [x] 建立測試 teacher：`teacher@taipei.test` / `teacher123456`（屬於台北分校）
- [x] 把其中一支影片標為 `confidential` 作為測試基準

**Phase 3（權限過濾）**：
- [x] `database.py` 新增 `can_view_video(viewer, video)` helper（核心權限邏輯）
- [x] `list_videos()` 加 `viewer` 參數,按 role + subscription_status + visibility 過濾
- [x] `GET /api/videos`：加 `Depends(auth.get_current_user)` + 傳 viewer 給 db
- [x] `GET /api/videos/{id}`：加權限檢查（不合法回 403）
- [x] `GET /api/videos/{id}/analysis`：加權限檢查
- [x] **Stream token 機制**（正規做法）：
  - [x] `auth.py` 加 `create_stream_token` + `verify_stream_token`
  - [x] stream token payload 含 `kind: "stream"` + 綁定 `user_id` + `video_id`,不能跨影片使用
  - [x] 初期設 5 分鐘,後改為 2 小時（夠看完大部分影片,避免 seek 失敗）
  - [x] 新增 `GET /api/videos/{id}/stream-token`：發門票（要 JWT 驗證）
  - [x] `GET /api/videos/{id}/file` 改成吃 URL 參數 `?stream_token=xxx`,不用 Authorization header
  - [x] 雙保險：發票後到播放時再做一次 `can_view_video` 檢查

**前端適配**：
- [x] `VideoDetail.jsx` 加 `streamToken` state
- [x] 加 useEffect：影片 ready + 是 video/audio 時才抓 stream_token
- [x] **時序陷阱修復**：`!streamToken` 時整個不渲染 `<video>/<audio>`,改顯示「準備播放中...」（避免空 src 觸發 onError → mediaError 永久蓋掉播放器）
- [x] 播放標籤 src 改為 `/api/videos/${id}/file?stream_token=${streamToken}`

**Visibility 管理 UI**：
- [x] 後端 `VideoUpdate` schema 加 `visibility: Optional[str]`
- [x] `PUT /api/videos/{id}`：加 `Depends(auth.require_admin)`（只有 admin 能改）
- [x] `update_video()` DB 函式支援 visibility（有傳才更新）
- [x] 前端 `VideoDetail.jsx` 編輯 modal 加可見度下拉選單
- [x] 下拉三選項：🌐 公開 / 🏫 內部 / 🔒 機密（含說明文字）
- [x] 用 `isRealAdmin` 包條件（admin 預覽 teacher 視角時也看不到這選項）

**驗收結果**：
- ✅ curl 沒帶 token 打 `/api/videos` → 401
- ✅ admin 帳號列表 API 回 4 支影片,teacher 帳號只回 3 支
- ✅ teacher 直接 GET confidential 影片 id → 403「你沒有權限看這支影片」
- ✅ Stream token 機制 4 項驗收全過：
  - admin 拿票（200）
  - 用票播放（200）
  - 沒票播放（401）
  - 用 A 影片的票打 B 影片（401）
- ✅ admin 編輯 modal 看得到可見度下拉,選機密儲存後,teacher 重整首頁那支消失
- ✅ admin 改回公開,teacher 重整又看得到
- ✅ 音檔/影片在瀏覽器能正常播放（stream token 機制有效運作）

---

### Week 3 Sprint 3C Phase 4 — stream/download 分流 ✅

**完成日期**：2026/04/20
**目標**：讓「線上看」跟「下載原檔」是兩個獨立端點,明確區分權限。分校只能線上看、admin 才能下載。

**後端**：
- [x] 新增 `GET /api/videos/{video_id}/download`,用 `Depends(auth.require_admin)` 擋非 admin
- [x] 用 FastAPI `FileResponse(filename=...)` 自動設 `Content-Disposition: attachment` + 處理 RFC 5987 中文檔名編碼
- [x] `media_type="application/octet-stream"` 強制瀏覽器下載而非內嵌開啟
- [x] 檔名回填原始 filename（不是 uuid.xxx）
- [x] 現有 `/file` endpoint 保留,所有登入者用 stream token 線上看

**前端**：
- [x] `VideoDetail.jsx` topbar 加「⬇️ 下載原檔」按鈕（放在「🗂 完整版」跟「✏️ 編輯」之間）
- [x] 用 fetch blob 而非 `window.location.href`(後者會把 JWT 塞進 URL,洩漏到 browser history/server log)
- [x] 流程:`fetch` 拿 blob → `URL.createObjectURL()` → 觸發 `<a download>` → `setTimeout(100ms)` 清理
- [x] 新增 `downloading` state + `disabled` 防止連點
- [x] 用 `canSwitchRole` 條件隱藏按鈕(admin 預覽 teacher 視角時按鈕也消失,跟「🗂 完整版」邏輯一致)

**驗收結果（4 項全過）**：
- ✅ admin 能下載,檔名是原始檔名（非 uuid.mp3）
- ✅ teacher 看不到下載按鈕
- ✅ teacher 手動透過 DevTools Console 打 `/download` API → 403「需要管理員權限」
- ✅ admin 預覽 teacher 視角時按鈕隱藏,切回本人恢復

---

### Week 3 Sprint 3D — 個人化 Schema（Phase 1/2/3 全完成）✅

**完成日期**：2026/04/20
**目標**：讓系統從「匿名查資料」升級成「自己的知識庫」——使用者會累積筆記、書籤、續看進度、搜尋歷史,不再是「每次都像第一次進來」。
**商業價值**：把 stickiness 做起來。使用者寫越多筆記、累積越多書籤,越離不開系統。

---

#### Phase 1 — 地基（後端 + Schema）✅

**Step 1-1：5 張新表 schema + 6 個索引**
- [x] `user_notes` (id, user_id, video_id, content, `timestamp_sec REAL NULL`, created_at, updated_at)
- [x] `user_bookmarks` (id, user_id, video_id, `start_time REAL NOT NULL`, note, created_at)
- [x] `watch_progress` (user_id, video_id 組合 PK, last_position_sec, completed_at, updated_at)
- [x] `search_history` (id, user_id, query, result_count, searched_at)
- [x] `activity_log` (id, user_id NULL, action, target_type, target_id, metadata JSON, created_at)
- [x] 索引：每張表都有 user_id + context 組合索引,總共 6 個

**Step 1-2：`log_activity()` helper + 在 login endpoint 接上**
- [x] `db.log_activity(user_id, action, target_type, target_id, metadata)` 寫失敗不拖垮主流程（try/except + log & swallow）
- [x] `db.list_activities(user_id, action, limit)` 查詢 helper(metadata 自動 parse JSON 回來)
- [x] `POST /api/auth/login` 接上,寫入 `action="login"` + metadata 含 email/role

**Step 1-3：其他 4 張表的 CRUD helpers**
- [x] Notes:create / get / list / update / delete(依 timestamp 升冪,整體筆記殿後按 created_at 降冪)
- [x] Bookmarks:create / get / list / delete（依 start_time 升冪）
- [x] Progress:`upsert_progress()` UPSERT 邏輯;`completed=True` 時用 `COALESCE(completed_at, ?)` 保留首次完成時間
- [x] Progress:`list_in_progress(user_id, limit)` INNER JOIN videos + 過濾 `completed_at IS NULL` + `status='done'`
- [x] Search history:`record_search` / `list_user_searches` / `top_queries`(admin 儀表板用) / `list_user_recent_queries`(MAX(id) GROUP BY query 去重) / `delete_search_query`(單刪) / `clear_user_search_history`(全清)

**Step 1-4：接上 11 個事件 + 順便修 3 個技術債**

接上 activity_log 事件（所有重要寫入動作）：
- [x] `view_video_detail` / `edit_video`（含 changes diff metadata） / `delete_video` / `reprocess_video`
- [x] `record_view`(含 completed metadata) / `create_task` / `toggle_task`
- [x] `upload_video`(含 title/file_type/filesize) / `download_video`
- [x] `search`(同時寫 search_history 跟 activity_log,用途不同)

**順便修的技術債**（這三個 endpoint 原本完全沒 auth 擋）：
- [x] `DELETE /api/videos/{id}` 加 `require_admin`(原本任何登入者都能刪影片)
- [x] `POST /api/videos/{id}/reprocess` 加 `require_admin`(原本 teacher 能觸發花 OpenAI 錢的分析)
- [x] `GET /api/search` 加 `get_current_user`(原本沒登入也能搜)

**驗收**：
- ✅ 登入 + 上傳 + 看詳情 + 編輯 + 加任務 + 打勾 + 下載 + 搜尋 → activity_log 8 個不同 action 都有紀錄
- ✅ `[edit_video]` 的 metadata 正確記錄 visibility 從 confidential → public
- ✅ `[toggle_task]` 3 筆分別是 True/False/True(三次點擊狀態變化全記錄)
- ✅ search_history 筆數 = activity_log 的 search 筆數

---

#### Phase 2 — 看得見的功能 ✅

**Step 2-1：續看進度**
- [x] 後端 `GET /api/videos/{id}/progress` + `PUT /api/videos/{id}/progress`
- [x] 後端防呆：負值截 0、超過 duration+5 秒截 duration（防 edge case）
- [x] `PUT` **不寫 activity_log**(每 10 秒一次會把 log 灌爆噪音)
- [x] 前端 VideoDetail：`savedPosition` + `progressApplied` + `lastSavedPositionRef` 三個 state
- [x] 自動載入舊進度：只在 `!completed_at && last_position_sec > 5` 才 seek（太早的位置沒意義）
- [x] Seek 時機：`streamToken` 就緒 + media 的 `loadedmetadata` 後做一次,toast「已從 XX:XX 繼續播放」
- [x] 自動存進度三重保障：
  - 定時 10 秒一次（playing 狀態下）
  - `pause` / `ended` event 補一次
  - `beforeunload` 用 `keepalive: true` 讓關頁面也能送出
- [x] `completed` 標記：`ended` event 觸發時自動標 `completed_at = now()`

**Step 2-2：我的筆記**
- [x] 後端 CRUD：`GET/POST /api/videos/{id}/notes`、`PUT/DELETE /api/notes/{note_id}`
- [x] 後端權限：list 需要 `can_view_video`、update/delete 檢查 user_id 擁有權
- [x] 後端防呆：空白 400、超過 2000 字 400
- [x] activity_log：`create_note` / `update_note` / `delete_note`
- [x] 新增 `frontend/src/components/NotesPanel.jsx`：可新增(可選綁時間戳)、編輯、刪除
- [x] VideoDetail 加 `currentTime` state + `timeupdate` event 每秒更新 1 次（避免每幀都 setState 卡頓）
- [x] Sidebar layout 重構：用 flex column + gap 12,放在觀看紀錄之前
- [x] 筆記排序：段落筆記按 start_time 升冪,整體筆記殿後按 created_at 降冪

**Step 2-3：Dashboard「繼續觀看」**
- [x] 後端 `GET /api/progress/in-progress?limit=6`(max 20 防呆)
- [x] Dashboard 加 `inProgress` state + `loadInProgress` loader + mount 時呼叫
- [x] 新增 `ContinueCard` 元件(VideoCard 的簡化版)：icon + 標題 + 進度條 + 「上次看到 XX:XX」 + 相對時間
- [x] 空清單時整塊隱藏(`{inProgress.length > 0 && ...}`,不用「暫無紀錄」placeholder)
- [x] 插入位置：Stats 之後、Type pills 之前(進 Dashboard 第一眼可見的最佳位置)

---

#### Phase 3 — 收尾功能 ✅

**Step 3-1：書籤**
- [x] 後端 CRUD：`GET/POST /api/videos/{id}/bookmarks` + `DELETE /api/bookmarks/{id}`
- [x] 後端權限：跟 notes 一樣的擁有權檢查(只能刪自己的)
- [x] 後端防呆：start_time 負值 400、備註超過 500 字 400
- [x] activity_log：`create_bookmark` / `delete_bookmark`
- [x] 新增 `frontend/src/components/BookmarksPanel.jsx`:
  - 文件/PPT (`canSeek=false`) 回傳 null,整個不顯示
  - 用 `refreshToken` prop 讓外部事件能觸發 reload
- [x] VideoDetail 加 `bookmarkRefresh` state + `handleQuickBookmark` handler
- [x] `TabSummary` 關鍵段落旁邊加「🔖」快速書籤按鈕(傳 `onQuickBookmark` prop),帶入段落 title 當 note

**Step 3-2：搜尋頁升級 + 單筆/整批刪除**
- [x] 後端新增 3 個 endpoint:
  - `GET /api/search/history?limit=10`(去重後最新)
  - `DELETE /api/search/history`(整批清)
  - `DELETE /api/search/history/item` body 帶 query(單筆刪)
- [x] 去重實作：`WHERE id IN (SELECT MAX(id) ... GROUP BY query)`(避免 sear/sea/s/search 都佔 chip 位置)
- [x] 前端 Search.jsx 加「🕐 最近搜尋」chip 區
- [x] Chip 結構：左半「查詢文字 · 結果數」按鈕 + 右半「✕」單刪按鈕(兩個子按鈕包在一個 span 容器)
- [x] 互動:點 chip 文字 → 快速重搜;點 ✕ → 刪單筆(`e.stopPropagation()` 防冒泡);最右邊「✕ 清除」→ 整批清
- [x] 搜尋完自動 reload history(最新 chip 跳最前)
- [x] `api.js` 的 `delete()` 擴充為支援 optional body(向下相容,原本沒帶 body 的呼叫不受影響)
- [x] Empty state 條件調整:`!searched && history.length === 0` 才顯示「📚 輸入關鍵字開始搜尋」(有歷史就省掉)

---

**Sprint 3D 整體驗收通過事項（按重要性排序）**：
- ✅ **權限隔離**：admin / teacher 各自只看到自己的 notes / bookmarks / progress / search_history(**Sprint 3D 最核心的保證**)
- ✅ 續看進度：關頁面再進來 toast「已從 00:10 繼續播放」,播放器在正確位置
- ✅ 播完自動標 `completed_at`,下次打開不再 seek 回去(guard 條件 `!p.completed_at` 生效)
- ✅ 文件/PPT 類型正確隱藏書籤面板(`canSeek=false` → null)
- ✅ Dashboard 沒未完成影片時「繼續觀看」整塊隱藏
- ✅ 搜尋歷史 chip 去重有效:連打 sear/seag/seagu/seagul 只留「seagul」1 個 chip
- ✅ 11 個 activity_log 事件都寫入成功(手動查 DB 驗證)
- ✅ 書籤面板 refreshToken 機制:關鍵段落「🔖」按鈕加書籤後,右側書籤面板自動 reload
- ✅ 搜尋單筆刪除 + 整批清除兩種模式都可用

---

## 🚧 待完成

### Week 3 Sprint 3E — AI 小測驗系統（新增 · 2026/04/19）

**時間估計**：約 2-3 天
**插入位置**：Sprint 3D 之後、Week 4 之前
**緣由**：使用者（Herry）在 Sprint 3C 做完後提出：「能不能出小測驗驗證學員是否真的理解？」這個洞察把系統從「看完影片打勾」升級成「證明學會了」,商業價值最高的差異化功能。

**新增表**：
```
quizzes                  # 每支影片一組測驗(一對一)
├─ id, video_id (FK UNIQUE)
├─ questions (JSON)      # [{q, type, options, answer, explanation}, ...]
└─ created_at

quiz_attempts            # 誰答過、答得如何
├─ id, quiz_id (FK), user_id (FK)
├─ answers (JSON), score (0-100)
├─ attempted_at, completed_at
└─ (可選) duration_sec
```

**後端任務**：
- [ ] `ai_service.py` 加 `generate_quiz(transcript, summary, key_points)` 函式
- [ ] Prompt 設計：5 題單選 + 答案解釋（用 GPT-4o）
- [ ] `POST /api/videos/{id}/quiz/generate`(admin 專用,重新生成覆蓋)
- [ ] `GET /api/videos/{id}/quiz`(拿題目,隱藏答案)
- [ ] `POST /api/videos/{id}/quiz/attempt`(提交答案,回傳成績 + 解釋)
- [ ] `GET /api/videos/{id}/quiz/attempts`(列出所有嘗試紀錄,依權限過濾)
- [ ] 擴展權限：teacher 看自己的紀錄;principal 看同分校;admin 看全部

**前端任務**：
- [ ] VideoDetail 加「做測驗」tab / 區塊
- [ ] 題目答題 UI（單選題組件）
- [ ] 提交後顯示：你答的 vs 正確答案 vs 解釋
- [ ] admin 按「重新生成題目」按鈕（拿 AI 重出 5 題）
- [ ] Dashboard 加「我還沒測驗的影片」清單
- [ ] （進階）principal 版：看旗下老師的測驗成績統計

**商業價值**：
- 可量化培訓成效（「台北分校老師 ABC 課程及格率 80%」）
- 變成對客戶分校的**必選功能**（沒這個就只是影片摘要工具）
- 未來可賣「測驗報告」給總部做管理

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
- [ ] **搜尋結果套用權限過濾**（目前 `/api/search` 會回所有結果,沒擋可見度 → Week 4 Must）

---

### Week 5 — Admin 儀表板（待開始）

**時間估計**：約 1 週

- [ ] 新增 `/admin` route（僅 admin）
- [ ] 跨影片觀看率矩陣
- [ ] 未完成任務清單
- [ ] 熱門搜尋詞統計（吃 Sprint 3D 的 `search_history` 和 `top_queries()` helper）
- [ ] **測驗成績統計**（吃 Sprint 3E 的 quiz_attempts）
- [ ] 異常提示：長期沒看、沒人看、任務逾期
- [ ] 各分校使用率對比(吃 Sprint 3D 的 activity_log)
- [ ] 匯出管理報表
- [ ] 使用者管理頁
- [ ] **分校管理頁（可切換 subscription_status）**
- [ ] **「以分校視角預覽」工具**:admin 可以選一個真實分校 + 真實 user 來模擬他們看到什麼,彌補目前視角切換只改 UI 不改資料的限制

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

- [ ] PPT 用 LibreOffice 轉圖片,前端做輪播預覽
- [ ] PDF 用 pdf.js 做內嵌預覽
- [x] ~~Admin 可下載任何原檔~~ → Sprint 3C Phase 4 已做,只剩加 audit log（已被 activity_log 覆蓋一部分）
- [ ] `VideoDetail.jsx` 載入效能優化 + **拆檔**(目前 1000+ 行)
- [ ] 手機 RWD 檢查

---

### Week 8 — 上線基建（擴充範疇 · 2026/04/19）

**時間估計**：約 1 週（從原本「安全性 + 打包」擴充為完整基建）

**原有項目**：
- [ ] CORS 收斂
- [ ] Rate limiting（`slowapi`）
- [ ] ~~Audit log 表~~ 已被 Sprint 3D 的 activity_log 覆蓋
- [ ] Upload streaming write
- [ ] Production .env 模板
- [ ] JWT 改用 httpOnly cookie
- [ ] 加 refresh token 機制
- [ ] 密碼強度檢查 + 強制改預設密碼
- [ ] Error tracking（Sentry）
- [ ] 前端 error boundary
- [ ] 後端統一 error handler
- [ ] 部署文件（Dockerfile、docker-compose、nginx）
- [ ] **資料庫從 SQLite 升級 PostgreSQL**（AWS RDS 或 Supabase/Neon）

**新增項目（架構洞察）**：
- [ ] **檔案儲存遷移**：本機 `uploads/` → 物件儲存（S3 / MinIO / Cloudflare R2 擇一）或外接掛載磁碟
- [ ] **自動備份機制**（正式版）：Postgres pg_dump 每日 + 檔案目錄 rsync 異地
- [ ] **資料保留政策**：刪除影片時相關 notes/bookmarks/views/activity_log 怎麼處理（CASCADE vs SET NULL）
- [ ] **資料匯出功能**：給分校「退租」時能帶走自己 branch 的資料（JSON 匯出）
- [ ] **分校資料隔離從應用層強制到 DB 層**（Row Level Security 或每查詢強制 `WHERE branch_id = ?`）
- [ ] **Stream token 升級**：目前 JWT 2 小時效期,上線前考慮縮到 30 分鐘 + 支援續簽
- [ ] **DB_PATH 改絕對路徑或環境變數**(消除「相對路徑 + 換目錄 = 誤連空 DB」的陷阱)
- [ ] **activity_log 歸檔策略**:上線後累積很快,需要定期歸檔/分表/刪除老資料

---

## 🗺 可能的延伸功能（Week 8 之後）

- [ ] 收費計量系統（對接分校訂閱付款）
- [ ] 多語言
- [ ] OCR for 掃描 PDF
- [ ] 影片段落編輯
- [ ] 培訓認證系統（吃 Sprint 3E 的測驗資料,達標後發電子證書）
- [ ] 跨影片知識點關聯
- [ ] 行動 App
- [ ] 與其他五大模組整合

---

## 📝 設計決策記錄（Decision Log）

| 日期 | 決策 | 原因 |
|------|------|------|
| 2026/04/18 | 模型升到 gpt-4o | 品質優先,每支 1 小時影片成本約 12-15 台幣可接受 |
| 2026/04/18 | 使用者系統放 Week 3 不是 Week 1 | 先做差異化看得見的功能 |
| 2026/04/18 | **原檔預設不開放下載（Netflix 模式）** | 保護總部 know-how、避免外流 |
| 2026/04/18 | DB 預留 `_user_id` 欄位暫留字串 | 未來 FK 化時不用改 schema |
| 2026/04/18 | PPT 不做預覽 | 瀏覽器原生不支援,Week 7 轉圖 |
| 2026/04/18 | Week 3 登入用 email+password | 使用者熟悉、不需 email 寄信服務 |
| 2026/04/18 | **Session 機制用 JWT 不用 cookie** | 未來其他模組串同一套 auth 方便 |
| 2026/04/18 | **JWT 存 localStorage** | 簡單直接;Week 8 可升級 httpOnly cookie |
| 2026/04/18 | **只有總部能上傳,分校只能看** | Netflix 模式、品牌一致 |
| 2026/04/18 | **分校看得到影片播放 + AI 分析,只能匯出 PDF** | 付費看使用權,不能帶走所有權 |
| 2026/04/18 | **Sprint 3A 先開 admin 全權限,Sprint 3C 再擋** | 先做「有權限情境」再做「擋權限情境」 |
| 2026/04/19 | **主色改為長頸鹿橘 `#f97316`**（Tailwind orange-500） | 品牌一致性;原藍色是 Template 預設 |
| 2026/04/19 | **狀態色不換,仍綠/黃/紅/青** | 語意色跟品牌色職責不同,混用會亂 |
| 2026/04/19 | **做 `effectiveRole` 抽象,所有 UI 過濾吃這個不吃 `user.role`** | 支援 admin 預覽模式;未來 3C 做完仍然是正確抽象 |
| 2026/04/19 | **`viewAsRole` 存 sessionStorage 而非 localStorage** | 關 tab 歸零,避免使用者忘記自己在預覽模式 |
| 2026/04/19 | **User role ↔ Content role 映射：staff → teacher** | 最終權限表中 staff 跟 teacher 可見權限完全相同,內容也該一致 |
| 2026/04/19 | **只有真 admin 看得到視角切換器** | teacher 不能切成 admin 看自己不該看的;安全性考量 |
| 2026/04/19 | **VideoDetail 操作按鈕不做 effectiveRole 擋,交給 3C 後端權限** | 前端擋是 UX,真正的安全防線在後端 |
| 2026/04/19 | **新增 Sprint 3D 個人化 Schema** | 原 Roadmap 漏了使用者個人累積資料;不做會讓系統感覺「匿名查資料」 |
| 2026/04/19 | **Week 8 擴充為「上線基建」範疇** | 原 Roadmap 對檔案儲存、備份策略、資料隔離著墨不足 |
| 2026/04/19 | **商業模式確認為訂閱制（非租戶型 SaaS）** | 分校是內容消費方不是內容製作方,跟 Netflix / Coursera 同模式 |
| 2026/04/19 | **訂閱顆粒度 MVP 做全包制** | 少一張多對多表,按分類訂閱之後再加就好 |
| 2026/04/19 | **加 `branches.subscription_status` 欄位** | 分校過期要能一鍵切斷訪問;用欄位比砍使用者簡單 |
| 2026/04/19 | **Stream token 用 JWT 短期簽名（而非 URL 帶長期 token）** | `<video>`/`<audio>` 不能帶 Authorization header;這是 Netflix/YouTube 的正規做法 |
| 2026/04/19 | **Stream token 綁定 user_id + video_id** | 防止攻擊者拿 A 影片的票偷看 B 影片 |
| 2026/04/19 | **Stream token 效期 2 小時（最初設 5 分鐘）** | Seek 進度條會觸發新 HTTP Range 請求,短效期會導致播到一半失效 |
| 2026/04/19 | **前端 `!streamToken` 時整個不渲染 `<video>` 而非 src="" 空字串** | 空 src 會觸發 onError → mediaError,永久蓋掉播放器 |
| 2026/04/19 | **新增 Sprint 3E AI 測驗系統** | 使用者洞察:光有摘要不夠,「證明學會了」才是完整產品 |
| 2026/04/19 | **MVP 的 `internal` visibility 等同 admin only** | 精緻化 principal 權限放 Sprint 3D 或 Week 5;先做核心 |
| 2026/04/19 | **`PUT /api/videos/{id}` 要求 admin 身份** | 連帶 visibility 是敏感設定,非 admin 完全不能改影片 |
| 2026/04/20 | **`/download` 用 `require_admin` + fetch blob 而非 URL 帶 token** | JWT 塞 URL 會寫進瀏覽器歷史、referrer、server log;fetch blob 用 Authorization header 較安全 |
| 2026/04/20 | **`/reprocess` 加 `require_admin`** | 原本 teacher 能觸發 OpenAI 花錢呼叫;補上這個技術債 |
| 2026/04/20 | **`DELETE /api/videos/{id}` 加 `require_admin`** | 原本任何登入者都能刪影片,補上權限擋牆 |
| 2026/04/20 | **`GET /api/search` 加 `get_current_user`** | 原本沒登入也能搜,補上權限;順便能寫 search_history |
| 2026/04/20 | **筆記可選綁時間戳,書籤必綁** | 筆記既能寫「這支以後給新人看」(整體)也能寫「這段很重要」(段落);書籤語意就是「標記某一秒」,不需要整體書籤 |
| 2026/04/20 | **`log_activity()` 寫失敗不 raise(log & swallow)** | activity_log 是輔助用途,不該成為關鍵路徑。DB 爆炸或 lock 不該拖垮登入/上傳等核心操作 |
| 2026/04/20 | **`progress` PUT 不寫 activity_log** | 每 10 秒一筆會把 activity_log 灌爆噪音;真正的觀看事件靠 `view_video_detail` 代表 |
| 2026/04/20 | **續看進度自動 seek 的門檻:`last_position_sec > 5` 秒** | < 5 秒的位置 seek 回去沒意義(幾乎是從頭),直接當 fresh start 體驗更好 |
| 2026/04/20 | **續看進度三重保障:10s interval + pause/ended event + beforeunload keepalive** | 單一機制都有漏洞;interval 需要 playing、event 需要正確 dispatch、unload 有 keepalive 才送得出去。三者疊加才穩 |
| 2026/04/20 | **Dashboard「繼續觀看」為空時整塊隱藏,而非顯示「無紀錄」** | 空 placeholder 會讓 Dashboard 看起來像沒資料的壞掉狀態;沒資料就不顯示最乾淨 |
| 2026/04/20 | **搜尋歷史 chip 以 query 為 key 去重(MAX(id) GROUP BY query)** | 「hic / hick / hickor / hickory」是同一個意圖的連打,只留最後版本比較不吵 |
| 2026/04/20 | **搜尋單筆刪除用 POST body 傳 query 而非 URL path** | 中文/空格/特殊字元進 URL path 會踩 encoding 問題;改 body 最穩。副作用:api.js 的 `delete()` 要擴成支援 optional body |
| 2026/04/20 | **Notes/Bookmarks 用 Panel 元件模式,不塞進 VideoDetail** | 未來拆 VideoDetail 時(技術債)這些元件能直接單獨被其他頁用(例如 Week 5 admin 儀表板想看每支影片總筆記數) |
| 2026/04/20 | **BookmarksPanel 在文件/PPT 類型直接 return null** | 「可以加書籤但沒有」跟「這類型本來就不能加書籤」是不同語意;null 比空清單更清楚 |

---

## ⚠️ 已知問題 / 技術債

**已解決(2026/04/20)**:
- ✅ ~~`DELETE /api/videos/{id}` 沒權限檢查~~ → 改用 `require_admin`(Sprint 3D Phase 1)
- ✅ ~~`POST /api/videos/{id}/reprocess` 沒權限檢查~~ → 改用 `require_admin`(Sprint 3D Phase 1)
- ✅ ~~`GET /api/search` 沒 auth~~ → 加 `get_current_user`(Sprint 3D Phase 1)
- ✅ ~~原檔下載沒獨立端點,混在 /file~~ → Sprint 3C Phase 4 拆出 /download

**高優先（會影響未來功能）**：
- [ ] **VideoDetail.jsx 超長**（1000+ 行,Sprint 3D 又加了一些 state/effect）,Sprint 3E 前先拆檔
- [ ] **uploads/ 目錄沒存取控制**（/file 有 stream token 擋了,但檔案系統層面沒擋;Week 8）
- [ ] **分校資料隔離靠應用層不靠 DB 層**（Week 8 擴充）
- [ ] **`/api/search` 沒套可見度過濾**(登入有擋,但結果列表本身會回傳所有 status='done' 的,包含 confidential;Week 4 處理)
- [ ] **首頁統計卡片沒套權限過濾**:teacher 看到「資料總數 4」但實際只顯示 3 支可見,數字跟畫面兜不上
- [ ] **teacher 登入時若網址是某支看不到的影片,直接顯示「找不到資料」**:應該導回首頁比較友善
- [ ] **視角切換不過濾機密影片**:admin 切「老師視角」時後端回的仍是 admin 全清單(視角切換只改 UI 不送到後端);Week 5 admin 儀表板加「以分校視角預覽」工具

**中優先（Week 8 前解決）**：
- [ ] **CORS 全開** `allow_origins=["*"]`
- [ ] **JWT 存 localStorage 有 XSS 風險**（升級 httpOnly cookie）
- [ ] **JWT 24 小時過期太長**（改 1-2 小時 + refresh token）
- [ ] **seed.py 密碼寫死預設值**（強制環境變數）
- [ ] **沒有密碼強度檢查**
- [ ] **沒有 rate limit**,登入 API 可以被 brute force
- [ ] **Upload 整個檔案進 memory**,大檔會 OOM
- [ ] **SQLite 多租戶限制**,上線前要換 PostgreSQL
- [ ] **Internal visibility 目前等同 admin only**（未來要精緻化為 principal 可見）
- [ ] **DB_PATH 相對路徑陷阱**:在非 backend 目錄跑 `sqlite3.connect('training.db')` 會靜默建空 DB(Week 8 改絕對路徑)
- [ ] **`progress` PUT 沒 server-side rate limit**:前端雖有 3 秒節流,拖進度條仍可能連發幾次;Week 5 觀察流量再決定

**低優先（體驗改善）**：
- [ ] **PDF 輸出的內嵌 CSS 仍是舊藍色 `#3b82f6`**（品牌統一時順手改）
- [ ] **沒有 error boundary**（Week 8）
- [ ] **沒有忘記密碼功能**（Week 5 admin 儀表板做）
- [ ] **手機 RWD 沒測**（Week 7）
- [ ] **HEAD 請求打 /file 會回 405**（FastAPI StreamingResponse 的限制;瀏覽器 `<video>` 用 GET+Range 所以實際沒影響）

---

## 🎓 給未來 Claude 的交接筆記

### 這個使用者的工作風格
- 繁體中文溝通（台灣）
- 偏好**具體到可以直接貼上去跑的 code patch**,不喜歡抽象建議
- 實作過程中會邊做邊問問題
- 願意測試,但需要具體的測試方法（給他「做這個指令、看這個結果」）
- 會截圖回報進度,視覺驗收很重要
- 常說「我想聽你的建議」→ 直接做決定,不要把球踢回去
- git commit 用多行建議 `git commit` 打開編輯器貼（避免引號問題）
- **一次塞太多 step 會迷路,分 Phase 給、每步驗收完再給下一步最有效**
- **擔心技術選型走向（SQLite → PostgreSQL 等）,需要安心「現在做的不會白費」**
- **會主動提出產品層面的想法(例如「單筆刪除也要有」、「能不能出小測驗」),要認真當 feature request 處理**

### 互動的節奏
1. 先確認方向（1-3 個問題）
2. 給具體 patch（檔案名 + 行號 + 完整 code）
3. 給測試方法（怎麼跑、看什麼結果算成功）
4. 等他回報,成功就往下、卡住就 debug
5. 不要一次丟太多,Sprint 可以拆 Batch/Phase

### 會冒出的架構性問題（超重要）
這個使用者會問「對的問題」——例如資料存哪、使用者怎麼累積、壞了怎麼辦、商業模式怎麼運作。遇到這類問題：
- **認真對待**,不要打哈哈
- **先回答「我有沒有規劃這個」**,承認漏掉的地方
- 把洞察**寫進 Roadmap** 當作新 Sprint,不要塞進「延伸功能」打發掉
- 正因為他會問,所以 progress.md 裡才會有「Sprint 3D」「Sprint 3E」「Week 8 擴充」「訂閱制商業模型釐清」這些後加的區塊
- 這個使用者**產品直覺很好**（問「只有分析沒原檔不完整」、「都是總部管理員」等）,要認真回應,不要敷衍

### 2026/04/19 踩過的坑（Sprint 3B/3C 期間）
1. **後端 Python 改動必須手動重啟**（Ctrl+C → `python app.py`）,Python 沒有像 Vite 那樣的熱重載。Sprint 3C 中途就因為這個浪費了時間
2. **auth.py 的常數叫 `JWT_SECRET` 和 `JWT_ALGORITHM`**,不是 `SECRET_KEY` / `ALGORITHM`。寫新函式前先 grep 一下實際名稱
3. **`<video>/<audio>` 標籤不能帶 Authorization header**,受保護的 media 資源必須用 stream token + URL query 參數
4. **前端 media 空 src 陷阱**：`<video src="">` 會觸發 onError,在複雜 UI 裡可能 trigger setMediaError 導致播放器被 fallback 蓋掉。正確做法是 token 未就位時整個不渲染
5. **api.js wrapper 只處理 JSON,不處理 multipart**,Upload.jsx 的 xhr 要手動帶 Authorization
6. **curl `-I` HEAD 打 /file 會回 405**,用 `-s -o /dev/null -w "HTTP %{http_code}"` 代替
7. **FastAPI 500 錯誤要去後端 terminal 看 traceback**,curl 只會看到 Internal Server Error
8. **向使用者講解時要白話**,「FK 化」「RBAC」這種術語他不熟,用比喻更有效（例如用 Netflix 比喻訂閱制）

### 2026/04/20 踩過的坑(Sprint 3C Phase 4 + 3D 整輪)
1. **Python 沒熱重載,今天又踩一次**(Sprint 3D Phase 3 單筆刪除 endpoint 404)。這個坑會反覆出現,驗收 404 第一件事就是問「後端重啟了嗎」
2. **`DB_PATH` 相對路徑陷阱**:使用者在專案根目錄下 `python -c` 測試 → SQLite 靜默建空 DB 不報錯 → 看到 `no such table` 以為資料沒了,其實是連錯 DB。提醒使用者「在 backend/ 目錄下執行」
3. **`api.delete(url, body)` 要特別擴充**:原本 api wrapper 的 DELETE 不吃 body,Sprint 3D 3-2 要單刪需要 body 帶 query,所以順便擴充成 optional body。向下相容 fine
4. **URL path 塞中文會炸**:`DELETE /api/search/history/{query}` 如果 query 是「招生話術」會踩 encoding 問題,改用 POST body 最穩
5. **續看進度的 edge case 很多**:< 5 秒位置不 seek、seek 要等 `loadedmetadata`、`beforeunload` 要 `keepalive:true`、pause/ended 都要補存,一次寫漏一個就體驗爆掉
6. **書籤面板對文件類型要回 null 而非顯示空清單**:「可以加書籤但沒有」跟「這類型本來就不能加書籤」要分開。null 最乾淨
7. **前端同步 list 的模式**:Dashboard 的 inProgress、Search 的 history,都要在完成相關操作後 reload(搜完要 reload history、刪完要從 state filter 掉;兩種都能用但建議一致化)
8. **前端 `el.readyState >= 1` 要查**:載入 media metadata 時若 el 已經 ready,要立刻 doSeek,不能依賴 `loadedmetadata` event(因為可能已經 fire 過)

### 踩過的雷 / 使用者環境特性
- WSL（Windows 底下的 Ubuntu）,ffmpeg 用 apt 裝
- 上傳檔案常是 iPhone 的 .mov（H.264）,需要 ffmpeg 抽音軌
- git commit 用 `-m "..."` 如果有雙引號會壞,要教他用 `git commit` 開編輯器
- **資料庫檔叫 `training.db` 不是 `app.db`**（最早 handoff 寫錯,一直沿用糾正中）
- **複製指令時會連 shell prompt 一起複製**(例如 `(venv) (base) herry@...$`),造成 shell syntax error。提醒「只複製指令本身」
- **會截圖 DevTools Console 裡的錯誤**,這是好習慣,直接貼就能 debug

### 使用者成長軌跡(觀察)
- 週一:跟著做,看不太懂架構
- 週二-三:開始問「這些資料存哪」「壞掉怎麼辦」等架構問題
- 週四:開始主動提出產品 feature(小測驗、單筆刪除),從被動驗收轉向主動設計
- 對技術選型信心增加,不再擔心「現在的東西會不會白做」

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

> 「幫我更新進度文件,把 Sprint X 的 [項目] 打勾,把 [問題] 加到技術債」

換聊天室前：

> 「我要開新聊天室了,先把目前進度總結一次更新到三份文件」

**三份都要更新**：
- `progress.md`（這份）：完整細節
- `handoff.md`：精簡版,新對話貼
- `README.md`：門面,Roadmap 打勾