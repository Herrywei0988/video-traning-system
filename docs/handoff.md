# 長頸鹿 AI 校園 · 影片培訓系統 — 交接簡報

> 給新 Claude 看：這是延續中的專案，請接上進度繼續協助。
> **最後更新：2026/04/18**

---

## 這是什麼專案

長頸鹿補教機構的「影片培訓整理系統」，是「長頸鹿 AI 校園」六大模組之一。
**不是影音倉庫，是組織知識整理系統。**
目標：把培訓影片從「看完就算」變成可追蹤、可搜尋、可累積、能收費的 SaaS。

**技術棧**：React + Vite（前端）· FastAPI + SQLite（後端）· OpenAI Whisper + GPT-4o（AI）

**核心差異化**（vs 分校自己用 GPT）：
1. 看完影片要形成閉環（行動清單 + 追蹤）
2. 同一支影片三種角色三種版本（主管/班主任/老師）
3. 資料累積成可搜尋的知識庫
4. 分校權限隔離（未來多租戶 SaaS）

---

## 已完成

**Week 1：AI 底層升級** ✅
- 升級 gpt-4o-mini → gpt-4o
- Whisper 改 verbose_json，保留時間戳
- DB 加 `transcript_segments` 欄位
- `key_segments` 每筆帶 `start_time`
- 預留 `uploader_user_id`、`viewer_user_id`、`assignee_user_id` 欄位給未來使用者系統

**Week 2：VideoDetail 改造** ✅
- `/api/videos/{id}/file` 串流 endpoint（支援 HTTP Range）
- 嵌入 `<video>` / `<audio>` 播放器
- 關鍵段落可點擊跳轉（`seekTo()`）
- 「看完這支你要做的三件事」固定區塊（根據 role 過濾）
- PDF 匯出分角色（當前角色版 + 完整版）
- AI 拒絕錯誤訊息改善（`_is_refusal()` 函式）
- PPT/PDF/Word 類型顯示「文件已完成 AI 整理」提示條

---

## 目前卡在哪

要進 Week 3，需要使用者確認兩件事：
1. Week 2 段落跳轉按鈕是否實測通過
2. Week 3 登入方式選 email+password 還是 magic link（Claude 建議 email+password）

---

## 下一步：Week 3 — 使用者系統 + 分校隔離 + 觀看自動化

預計 1-1.5 週，拆 3 個 Sprint：

**Sprint 3A**（使用者系統基礎）：`users` 表、`branches` 表、bcrypt password hash、登入 API、JWT session、登入頁、protected route middleware、Sidebar 顯示當前使用者

**Sprint 3B**（資料 FK 化）：`uploader_name`、`viewer_name`、`assignee` 三個字串欄位改用 FK to `users.id`；舊資料 migration

**Sprint 3C**（觀看自動化 + 權限）：VideoDetail mount 自動寫 view、播到 80% 自動完成、移除填表 Modal、加 `visibility` 欄位（public/internal/confidential）、加 `target_roles`、API 層依 branch_id 過濾、「我還沒看的」「指派給我」頁面

**Week 3 驗收**：兩個分校互看不到彼此、觀看不用填表、管理員可設影片權限層級。

---

## 後續週次（預計）

- **Week 4**：搜尋升級（embeddings 語意搜尋、段落級搜尋結果、filter）
- **Week 5**：Admin 儀表板（觀看率矩陣、未完成任務、異常提示）
- **Week 6**：版本管理（`supersedes_id`）+ 推送通知
- **Week 7**：PPT/文件預覽（LibreOffice 轉圖）+ 擁有者下載
- **Week 8**：安全性打磨（CORS、rate limiting、audit log、streaming upload、部署文件）

---

## 關鍵設計決定（不要翻案）

| 決策 | 原因 |
|------|------|
| 用 gpt-4o 不用 mini | 品質優先，每支 1 小時影片 ~12-15 台幣可接受 |
| 使用者系統放 Week 3 不是 Week 1 | 先做差異化看得見的功能；使用者系統沒有 demo 價值 |
| **原檔預設不開放下載** | 保護總部 know-how、避免外流；未來只開給擁有者/admin |
| DB 預留 `_user_id` 欄位但暫用字串 | 避免未來 FK 化時改 schema |
| PPT 目前無原檔預覽 | 瀏覽器原生不支援；Week 7 會用 LibreOffice 轉圖 |

---

## 已知技術債（有空再修）

- CORS `allow_origins=["*"]`（Week 8）
- Upload 整檔讀進 memory，大檔會 OOM（Week 8）
- VideoDetail.jsx 720+ 行，要拆檔
- 沒 audit log
- 手機 RWD 沒測（Desktop-first）

---

## 使用者工作風格（給新 Claude）

- **繁體中文**（台灣）
- 偏好**具體到可直接貼上跑的 code patch**，不要抽象建議
- 實作中會邊做邊問（「為什麼這樣」「這樣可以嗎」）
- **需要具體測試方法**：給他「跑這個指令、看這個結果」
- 會**截圖**回報進度，視覺驗收很重要
- 時常說「我想聽你的建議」→ 直接做決定、不要把球踢回去
- **不要一次丟太多改動**：每個 sprint 3-6 個 patch 為上限

## 互動節奏

1. 先確認方向（1-3 個關鍵問題）
2. 給具體 patch（檔案 + 行號 + 完整 code）
3. 給測試方法（做什麼、看什麼結果算成功）
4. 等他回報（截圖或文字）
5. 每個 sprint 結束問「需要更新進度嗎」

---

**開始對話模板**：

> 「我是上面那個專案的使用者，Week X 進行到 Y。我現在想要 Z。」
