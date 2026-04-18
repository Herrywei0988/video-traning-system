# 長頸鹿 AI 校園 · 影片培訓系統 — 交接簡報

> 給新 Claude 看：這是延續中的專案，請接上進度繼續協助。
> **最後更新：2026/04/18（Sprint 3A 完成）**

---

## 這是什麼專案

長頸鹿補教機構的「影片培訓整理系統」，是「長頸鹿 AI 校園」六大模組之一。
**不是影音倉庫，是組織知識整理系統。**
目標：把培訓影片從「看完就算」變成可追蹤、可搜尋、可累積、能收費的 SaaS。

**技術棧**：React + Vite + JWT（前端）· FastAPI + SQLite + bcrypt + PyJWT（後端）· OpenAI Whisper + GPT-4o（AI）

**核心差異化**（vs 分校自己用 GPT）：
1. 看完影片要形成閉環（行動清單 + 追蹤）
2. 同一支影片三種角色三種版本（主管/班主任/老師）
3. 資料累積成可搜尋的知識庫
4. 分校權限隔離（未來多租戶 SaaS）

---

## 商業模型（影響所有權限設計）

**Netflix 模式，不是 iTunes 模式。**

- 分校可以**看** AI 分析、**播放**影片/音檔、**下載 PDF 報告**
- 分校**不能下載原檔**、**不能上傳**
- 只有總部（admin）能上傳、能下載原檔

---

## 已完成

**Week 1：AI 底層升級** ✅
- 升 gpt-4o-mini → gpt-4o
- Whisper 改 verbose_json，保留時間戳
- DB 加 `transcript_segments` 欄位
- 預留使用者系統相關欄位

**Week 2：VideoDetail 改造** ✅
- `/api/videos/{id}/file` 串流 endpoint
- 嵌入 `<video>` / `<audio>` 播放器
- 關鍵段落可點擊跳轉（`seekTo()`）
- 「看完這支你要做的三件事」固定區塊（依 role 過濾）
- PDF 匯出分角色
- PPT/PDF/Word 顯示「已完成 AI 整理」提示條
- AI 拒絕錯誤訊息改善

**Week 3 Sprint 3A：使用者系統後端 + 前端登入** ✅
- 後端：`users`、`branches` 表、bcrypt 密碼 hash、JWT 產生與驗證、`get_current_user` / `require_admin` dependencies
- 後端：`/api/auth/login`、`/api/auth/me`、`/api/auth/logout` endpoints
- 後端：所有原有 endpoint 加 auth 保護，上傳限定 admin
- 後端：`seed.py` 建立 HQ 分校 + admin 帳號
- 前端：`AuthContext.jsx`、`Login.jsx`、`App.jsx` protected route、`Sidebar.jsx` 顯示使用者
- 前端：`api.js` 自動帶 JWT、401 自動登出
- **驗收全通過**：登入、登出、token 驗證、admin 看全部資料都正常

**目前預設帳號**：`admin@giraffe.local` / `admin123456`（HQ 分校）

---

## 下一步：Week 3 Sprint 3B — 資料 FK 化

**預計 2 天**：把三個字串欄位（uploader_name、viewer_name、assignee）改成 FK 指向 users 表。

- [ ] `videos.uploader_name` → `uploader_user_id`（FK）
- [ ] `views.viewer_name` / `viewer_role` → `viewer_user_id`（FK）
- [ ] `tasks.assignee` → `assignee_user_id`（FK）
- [ ] 舊資料 migration（對應到 admin user）
- [ ] 前端顯示名字改成 join users 取
- [ ] `Upload.jsx` 移除「上傳者」欄位（自動取 session user）

**驗收**：舊影片上傳者顯示「總部管理員」、新上傳不用填上傳者、assignee 從 users 表取

---

## 接下來的 Sprint / Week

- **Sprint 3C**（2-3 天）：觀看自動化 + `visibility` 欄位 + 角色擋權限
- **Week 4**（1 週）：搜尋升級（embeddings 語意搜尋、段落級命中）
- **Week 5**（1 週）：Admin 儀表板
- **Week 6**（1 週）：版本管理 + 推送通知
- **Week 7**（1 週）：PPT 預覽 + Admin 下載權限
- **Week 8**（1 週）：安全性打磨 + 部署

---

## 權限模型（Sprint 3C 要實作）

| 角色 | role 值 | public | internal | confidential | 上傳 | 下載原檔 |
|------|--------|--------|----------|--------------|------|----------|
| 總部管理員 | admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| 分校主任 | principal | ✅(同分校) | ✅(同分校) | ❌ | ❌ | ❌ |
| 分校老師 | teacher | ✅(同分校) | ❌ | ❌ | ❌ | ❌ |
| 分校行政 | staff | ✅(同分校) | ❌ | ❌ | ❌ | ❌ |

---

## 關鍵設計決定（不要翻案）

| 決策 | 原因 |
|------|------|
| 用 gpt-4o 不用 mini | 品質優先，每支 1 小時影片 ~12-15 台幣可接受 |
| 使用者系統放 Week 3 不是 Week 1 | 先做差異化看得見的功能 |
| **原檔預設不開放下載（Netflix 模式）** | 保護總部 know-how、避免外流 |
| DB 預留 `_user_id` 欄位但暫用字串 | 避免未來 FK 化時改 schema |
| PPT 目前無原檔預覽 | 瀏覽器原生不支援；Week 7 用 LibreOffice 轉圖 |
| **Session 機制用 JWT 不用 cookie** | 未來其他模組串同一套 auth 方便 |
| **JWT 存 localStorage** | 簡單直接；Week 8 可升級 httpOnly cookie |
| **只有總部能上傳，分校只能看** | Netflix 模式、品牌一致 |
| **Sprint 3A 先開 admin 全權限，Sprint 3C 再擋** | 先做有權限情境再做擋權限情境 |

---

## 已知技術債（有空再修）

- CORS `allow_origins=["*"]`（Week 8）
- JWT 存 localStorage 有 XSS 風險（Week 8 升級 httpOnly cookie）
- JWT 24 小時過期太長（Week 8 改 1-2 小時 + refresh token）
- seed.py 密碼寫死（Week 8 強制環境變數）
- 沒有 rate limit、密碼強度檢查（Week 8）
- Upload 整檔讀進 memory，大檔會 OOM（Week 8）
- VideoDetail.jsx 720+ 行，要拆檔
- 沒有 audit log
- 手機 RWD 沒測（Desktop-first）
- 沒有忘記密碼功能（Week 5）

---

## 使用者工作風格（給新 Claude）

- **繁體中文**（台灣）
- 偏好**具體到可直接貼上跑的 code patch**，不要抽象建議
- 實作中會邊做邊問
- 需要**具體測試方法**：給他「跑這個指令、看這個結果」
- 會**截圖**回報進度，視覺驗收很重要
- 時常說「我想聽你的建議」→ 直接做決定、不要把球踢回去
- **不要一次丟太多改動**：Sprint 可以拆 Batch，每個 Batch 3-6 個 patch

## 互動節奏

1. 先確認方向（1-3 個關鍵問題，用 `ask_user_input_v0`）
2. 給具體 patch（檔案 + 行號 + 完整 code）
3. 給測試方法（做什麼、看什麼結果算成功）
4. 等回報（截圖或文字）
5. 每個 sprint 結束問「需要更新進度嗎」

## 踩過的雷

- WSL 環境，ffmpeg 要 `sudo apt install`
- iPhone 上傳常是 .mov，需要 ffmpeg 抽音軌才能給 Whisper
- git commit `-m "..."` 裡有雙引號會壞，建議用 `git commit` 開編輯器
- AI 可能拒絕分析（回「I'm sorry, I can't assist」），要用內容包含培訓主題測

---

**開始對話模板**：

> 「我是上面那個專案的使用者，Week X Sprint Y 完成。現在要做 Z。」