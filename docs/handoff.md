# 接手說明 · 長頸鹿 AI 校園影片培訓整理系統

> 貼給新 Claude 用。完整細節看 `progress.md`。
> 最後更新：2026/04/19

---

## 專案一句話

總部→分校的 SaaS 培訓知識庫：上傳影片/音檔/投影片 → AI 轉錄+結構化分析 → 分校依角色看對應版本的摘要、行動清單、可匯出 PDF 但拿不到原檔（Netflix 模式）。

---

## 目前進度

**完成**：Week 1（AI 時間戳）+ Week 2（VideoDetail 改造）+ Week 3 Sprint 3A（登入系統）+ 品牌橘色改版 + 視角切換器

**下一步**：Sprint 3B（資料 FK 化），約 2 天

**完整 Roadmap**：Sprint 3B → 3C（權限擋牆）→ 3D（個人化 Schema，新增）→ Week 4 搜尋 → Week 5 Admin → Week 6 版本管理 → Week 7 PPT 預覽 → Week 8 上線基建

---

## 技術棧

- **前端**：React + Vite + React Router + JWT Auth
- **後端**：FastAPI + SQLite + bcrypt + PyJWT
- **AI**：OpenAI Whisper + GPT-4o
- **環境**：WSL / Ubuntu

---

## 關鍵架構：雙層 role 系統

專案有兩種 role，要分清楚：

**User role（使用者權限角色）** — 存在 DB
- `admin` / `principal` / `teacher` / `staff`
- 擋權限、過濾選單、決定能不能上傳

**Content role（內容版本角色）** — 純 UI 層
- `exec` / `manager` / `teacher`
- VideoDetail 裡同一支影片的三種摘要版本（AI 產出時就分好）

**映射**（寫在 `AuthContext.jsx`）：

- admin     → exec
- principal → manager
- teacher   → teacher
- staff     → teacher

**Effective role 抽象**：所有 UI 過濾邏輯吃 `effectiveRole` 不吃 `user.role`
- 本人視角：`effectiveRole = user.role`
- admin 預覽視角：`effectiveRole = viewAsRole`
- 這讓 admin 可以「以分校老師視角預覽」看系統長什麼樣，不用真的建帳號登入登出

---

## 視角切換器使用說明

- 左下 avatar 點擊 → 下拉選單（只有真 admin 看得到視角切換列表）
- 切換到非本人角色 → 頂部出橘色 banner、Sidebar 選單過濾、VideoDetail 預設對應版本
- `viewAsRole` 存 sessionStorage（F5 保留，關 tab 清除）
- 登出/重登入自動清除 `viewAsRole`

---

## 資料庫 schema 現況

**已建**：
- `users` (id, email, password_hash, name, role, branch_id, is_active)
- `branches` (id, name, code, is_headquarters)
- `videos` (含預留 `uploader_user_id` 但目前還用字串 `uploader_name`)
- `analyses` (含 `transcript_segments` JSON)
- `views` (含預留 `viewer_user_id`，目前用字串)
- `tasks` (含預留 `assignee_user_id`，目前用字串)

**Sprint 3B 要做**：把預留的 user_id 欄位真的接上 FK、舊資料遷移、前端顯示從 join 取。

**Sprint 3D 要加**：
- `user_notes` / `user_bookmarks` / `watch_progress` / `search_history` / `activity_log`

---

## 商業模型（影響所有權限設計）

| 角色 | public | internal | confidential | 上傳 | 下載原檔 | 匯出 PDF |
|------|--------|----------|--------------|------|----------|----------|
| admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| principal | ✅(同分校) | ✅(同分校) | ❌ | ❌ | ❌ | ✅ |
| teacher | ✅(同分校) | ❌ | ❌ | ❌ | ❌ | ✅ |
| staff | ✅(同分校) | ❌ | ❌ | ❌ | ❌ | ✅ |

visibility 三層：`public` / `internal` / `confidential`（目前 DB 還沒這欄位，Sprint 3C 加）

---

## 這個使用者的工作風格

- 繁體中文溝通（台灣人）
- 要**可直接貼的 code patch**，不要抽象建議
- 會邊做邊問，需要具體測試方法（做什麼指令、看什麼結果）
- 截圖驗收為主
- 說「我想聽你的建議」= 直接做決定，不要把球踢回
- **會問對的架構問題**（資料存哪、使用者累積、壞了怎麼辦）→ 認真回應，必要時新增 Sprint

---

## 踩雷提醒

- WSL 環境，ffmpeg 用 apt 裝
- iPhone 上傳的 `.mov` 要 ffmpeg 抽音軌
- git commit 有引號 bug，教用 `git commit` 開編輯器
- VideoDetail.jsx 超過 900 行，未來要拆
- CSS 之前有衝突（`.sidebar-nav` 等），Sidebar 現在用 inline style 繞過

---

## 登入資訊

- 預設 admin：`admin@giraffe.local` / `admin123456`
- 重建用：`cd backend && python seed.py`

---

## 關鍵檔案位置

- **AuthContext 邏輯**：`frontend/src/context/AuthContext.jsx`
- **視角切換 UI**：`frontend/src/components/Sidebar.jsx` 下拉選單部分
- **Banner**：`frontend/src/components/ViewAsBanner.jsx`
- **VideoDetail**：`frontend/src/pages/VideoDetail.jsx`（920+ 行）
- **後端 auth**：`backend/auth.py`
- **資料庫**：`backend/app.db`（SQLite）
- **原檔**：`backend/uploads/`

---

## 立刻可做的下一步

1. **Sprint 3B**：資料 FK 化（2 天）
2. 或先讀完 `progress.md` 看完整脈絡再決定

有任何架構問題先看 progress.md 的「設計決策記錄」區塊，大概率已經討論過了。