# 接手說明 · 長頸鹿 AI 校園影片培訓整理系統

> 貼給新 Claude 用。完整細節看 `progress.md`。
> 最後更新：2026/04/19（Sprint 3C Phase 1-3 + visibility UI 完成）

---

## 專案一句話

總部→分校的 SaaS 培訓知識庫(訂閱制)：總部製作影片/音檔/投影片 → AI 轉錄+結構化分析 → 分校訂閱後,旗下角色依權限**線上觀看原檔**+ 看 AI 摘要、行動清單、做小測驗驗收學習成效。Netflix 模式：能看、能學、不能下載原檔。

---

## 商業模式(重要:訂閱制)

**兩種用戶本質不同**:

| 身份 | 角色 | 屬於 | 職責 |
|------|------|------|------|
| 內容製作方 | `admin` | 總部(長頸鹿自己) | 上傳影片、產生 AI 分析、管理全站 |
| 內容消費方 | `principal` / `teacher` / `staff` | 客戶分校(付費訂閱) | 登入看影片、看摘要、做測驗 |

**訂閱顆粒度**:MVP 做「全包制」— 分校付月費 → 旗下帳號看到所有 public 影片。未來可升級「按分類訂閱」。

**分校訂閱狀態**:`active` / `expired` / `trial`。`expired` 的分校旗下帳號看不到任何影片。

---

## 核心價值主張(四個支柱)

這個系統不是「影片資料庫」也不是「AI 摘要工具」,而是**完整的培訓成效管理平台**:

1. **線上看原檔**:分校登入後能串流播放影片、瀏覽 PPT(不能下載)
2. **AI 分析摘要**:依角色顯示不同版本(exec / manager / teacher)
3. **小測驗驗收**:AI 從影片生成題目,分校可看到旗下老師測驗成績
4. **可匯出 PDF**:線下分享、歸檔用

少了任何一個支柱,產品價值都會大打折扣。

---

## 目前進度

**已完成**:
- Week 1(AI 時間戳)
- Week 2(VideoDetail 改造)
- Sprint 3A(登入系統 + JWT)
- Sprint 3B(資料 FK 化 + 補寫入端 auth)
- **Sprint 3C Phase 1-3 + visibility 管理 UI(NEW!)**
- 品牌橘色改版 + 視角切換器

**下一步選項**(三選一):
- Sprint 3C Phase 4:`/download` 端點 + 前端下載按鈕(約 30 分鐘,小)
- Sprint 3D:個人化 Schema(筆記/書籤/進度/歷史,約 1-2 天)
- Sprint 3E:AI 測驗系統(約 2-3 天,商業價值最高)

**完整 Roadmap**:

- ~~Sprint 3C Phase 1-3~~ ✅ 權限擋牆 + visibility + 訂閱狀態過濾
- Sprint 3C Phase 4  stream/download 分流(未做)
- Sprint 3D  個人化 Schema(筆記/書籤/進度/歷史)
- Sprint 3E  AI 小測驗系統
- Week 4    搜尋
- Week 5    Admin 後台(管理分校訂閱、使用者、看整體成效)
- Week 6    版本管理
- Week 7    PPT 線上預覽
- Week 8    上線基建(SQLite → PostgreSQL、雲端部署)

---

## 技術棧

- **前端**:React + Vite + React Router + JWT Auth
- **後端**:FastAPI + SQLite + bcrypt + PyJWT
- **AI**:OpenAI Whisper + GPT-4o
- **環境**:WSL / Ubuntu
- **資料庫檔名**:`backend/training.db`(注意:不是 app.db,舊 handoff 寫錯了)

**未來搬家計畫**(Week 8):SQLite → PostgreSQL(AWS RDS 或 Supabase)。為此現在的原則是:
- 所有 SQL 操作集中在 `database.py`,app.py 不直接寫 SQL
- 避免 SQLite 特有語法(`INSERT OR REPLACE` 等有記下來,搬家時改)
- 時間戳先用字串存,搬家時轉 TIMESTAMP

---

## 關鍵架構:雙層 role 系統

專案有兩種 role:

**User role**(權限)— 存 DB:`admin` / `principal` / `teacher` / `staff`
**Content role**(UI 版本)— 純前端:`exec` / `manager` / `teacher`

映射(`AuthContext.jsx`):
- admin → exec
- principal → manager
- teacher → teacher
- staff → teacher

**Effective role**:UI 過濾全部吃 `effectiveRole`,不吃 `user.role`。
- 本人視角:`effectiveRole = user.role`
- admin 預覽視角:`effectiveRole = viewAsRole`(存 sessionStorage)

---

## 資料庫 schema 現況(已做)

- `users` (id, email, password_hash, name, role, branch_id, is_active)
- `branches` (id, name, code, is_headquarters, **subscription_status**)
- `videos` (含 `uploader_user_id` FK + `uploader_name` 舊字串 fallback + **visibility**)
- `analyses` (含 `transcript_segments` JSON)
- `views` (含 `viewer_user_id` FK)
- `tasks` (含 `assignee_user_id` FK)

**Sprint 3B 做完的事**(2026/04/19):
- Migration 腳本 `backend/migrate_3b.py`(冪等,已跑過)
- 讀取 API 全部 LEFT JOIN users,回傳帶 `uploader` / `viewer` / `assignee_user` 物件
- 寫入 API 全部塞 user_id
- `/views` / `/tasks` / `/tasks/toggle` 加 `Depends(auth.get_current_user)`
- `Upload.jsx` 的 xhr 手動帶 Authorization header(api.js wrapper 只處理 JSON)

**Sprint 3C Phase 1-3 + UI 做完的事**(2026/04/19):
- DB schema:`videos.visibility` 預設 `public`;`branches.subscription_status` 預設 `active`
- Seed 腳本 `backend/seed_3c.py`(建台北分校 + teacher 測試帳號,冪等)
- `db.can_view_video(viewer, video)` helper(權限判斷核心)
- `list_videos()` 和 `/api/videos` 依登入者過濾:admin 看全部,其他人只看 public + 分校 active
- 單支影片 API(`/api/videos/{id}`, `/analysis`, `/file`)全部加權限檢查
- 列表 API 加 `Depends(auth.get_current_user)`(必須登入才能看列表)
- **Stream token 機制(正規做法)**:`<video>`/`<audio>` 標籤不能帶 Authorization header,改用:
  - `GET /api/videos/{id}/stream-token` 取 5 分鐘門票 → 現改為 2 小時(夠看完大部分影片)
  - `GET /api/videos/{id}/file?stream_token=xxx` 用門票播放
  - 門票綁定 `user_id + video_id`,不能跨影片使用
- **前端 `VideoDetail.jsx` 改動**:useEffect 抓 stream_token,`!streamToken` 時先顯示「準備播放中」避免 `onError` 誤觸發
- **Visibility 管理 UI**:admin 在編輯 modal 能下拉切換 public / internal / confidential,即時生效(teacher 重整就看到變化)
- `PUT /api/videos/{id}` 加 `Depends(auth.require_admin)`(只有 admin 能改影片)

---

## 資料庫 schema 後續規劃(未做)

### Sprint 3D 要加
- `user_notes` / `user_bookmarks` / `watch_progress` / `search_history` / `activity_log`

### Sprint 3E 要加(AI 測驗系統)

```
quizzes                  # 每支影片一組測驗
├─ id, video_id (FK)
├─ questions (JSON)      # [{q, type, options, answer, explanation}, ...]
└─ created_at
quiz_attempts            # 誰答過、答得如何
├─ id, quiz_id (FK), user_id (FK)
├─ answers (JSON), score
├─ attempted_at, completed_at
```
商業價值:可量化培訓成效(「台北分校老師及格率 80%」),讓「看完影片」變成「證明學會了」。

---

## 權限矩陣(完整版)

| 角色 | 看摘要 | 線上看影片 | 線上看 PPT | 下載原檔 | 做測驗 | 看測驗結果 | 匯出 PDF | 上傳 |
|------|--------|-----------|-----------|---------|--------|-----------|---------|------|
| admin | ✅ 全部 | ✅ 全部 | ✅ 全部 | ✅ | ✅ | ✅ 全部人 | ✅ | ✅ |
| principal | ✅(同分校) | ✅(同分校) | ✅(同分校) | ❌ | ✅ | ✅ 同分校 | ✅ | ❌ |
| teacher | ✅(同分校) | ✅(同分校) | ✅(同分校) | ❌ | ✅ | ✅ 僅自己 | ✅ | ❌ |
| staff | ✅(同分校) | ✅(同分校) | ✅(同分校) | ❌ | ✅ | ✅ 僅自己 | ✅ | ❌ |

**visibility 過濾現況**(MVP 版本):
- `public`:同分校訂閱有效的所有人
- `internal`:**目前等同 admin only**(未來會改成同分校 principal 可看)
- `confidential`:admin only

> MVP 先把 `internal` 和 `confidential` 都當 admin only 處理。Sprint 3D 或 Week 5 再精緻化 principal 的 `internal` 權限。

**訂閱過濾**:如果分校 `subscription_status != 'active'`,以上所有「✅」變「❌」。

---

## API 端點規劃

**關鍵設計**:「線上看」vs「下載原檔」將來會是**兩個不同端點**。

- `GET /api/videos/{id}/stream-token` ✅(已做)— 拿播放門票,返回 JWT(2 小時效期)
- `GET /api/videos/{id}/file?stream_token=xxx` ✅(已做)— 串流播放,所有可見影片的登入者
- `GET /api/videos/{id}/download` ❌(Sprint 3C Phase 4 未做)— 下載原檔,只給 admin

前端 `<video>` 用 `/file` + stream_token,未來右鍵「下載」按鈕呼叫 `/download`(帶 Authorization header)。

---

## 這個使用者的工作風格

- 繁體中文溝通(台灣人)
- 要可直接貼的 code patch,不要抽象建議
- 邊做邊問,需要具體測試方法(做什麼、看什麼)
- 截圖驗收為主
- 「我想聽你的建議」= 直接做決定
- **會問對的產品問題**(商業模型、使用者價值、搬家)→ 認真回應,必要時重新規劃 Sprint
- 不是資深工程師,一次塞太多 step 會迷路,**分 Phase 給、每步驗收完再給下一步**最有效
- 擔心技術選型走向(SQLite → PostgreSQL 等),需要安心「現在做的不會白費」
- **python 檔案改動後一定要提醒重啟後端**(Python 不會熱重載,這踩過坑)
- **產品直覺很準**:會問出「都是總部管理員」、「只有分析沒原檔」這類正確質疑,要認真回應

---

## 踩雷提醒

- WSL 環境,ffmpeg 用 apt 裝
- iPhone 上傳的 `.mov` 要 ffmpeg 抽音軌
- git commit 有引號 bug,教用 `git commit` 開編輯器
- VideoDetail.jsx 超過 900 行,未來要拆
- CSS 衝突(`.sidebar-nav` 等),Sidebar 用 inline style 繞過
- **api.js wrapper 只處理 JSON,不處理 multipart** — 帶進度條的 xhr 要手動加 Authorization
- 所有寫入端點都要 `Depends(auth.get_current_user)`
- 資料庫檔是 `training.db`
- **後端 `auth.py` 常數叫 `JWT_SECRET` 和 `JWT_ALGORITHM`,不是 `SECRET_KEY` / `ALGORITHM`**(寫新功能時要用對)
- **後端改動必須手動重啟**(Ctrl+C → `python app.py`),Python 沒有像 Vite 那樣的熱重載
- **`<video>`/`<audio>` 標籤不能帶 Authorization header**,受 JWT 保護的 media 一定要走 stream_token URL 參數方案
- **前端 media 時序陷阱**:如果 `<video src="">` 是空字串,瀏覽器會觸發 onError → setMediaError(true) → fallback 蓋掉播放器。要在 `!streamToken` 時整個不渲染 media 標籤,別用空 src
- **curl 用 `-I`(HEAD)測 `/file` 端點會回 405**,FastAPI/StreamingResponse 不支援 HEAD。用 `-s -o /dev/null -w "HTTP %{http_code}"` 代替
- **FastAPI 500 錯誤要去後端 terminal 看 traceback**,curl 只會看到 Internal Server Error

---

## 登入資訊

- 預設 admin:`admin@giraffe.local` / `admin123456`
- 測試 teacher:`teacher@taipei.test` / `teacher123456`(台北分校)
- 重建 admin:`cd backend && python seed.py`
- Sprint 3B migration:`cd backend && python migrate_3b.py`(冪等)
- Sprint 3C 測試資料:`cd backend && python seed_3c.py`(冪等,建台北分校 + teacher)

---

## 關鍵檔案位置

- AuthContext:`frontend/src/context/AuthContext.jsx`
- API wrapper(JSON only):`frontend/src/utils/api.js`
- 視角切換:`frontend/src/components/Sidebar.jsx`
- Banner:`frontend/src/components/ViewAsBanner.jsx`
- VideoDetail:`frontend/src/pages/VideoDetail.jsx`(920+ 行,內含 stream_token 取得邏輯 + visibility 編輯 modal)
- Upload(xhr 特例):`frontend/src/pages/Upload.jsx`
- 後端 auth(含 stream token):`backend/auth.py`
- 後端 DB:`backend/database.py`(含 `can_view_video` helper)
- 後端 API:`backend/app.py`
- AI 服務:`backend/ai_service.py`
- 資料庫:`backend/training.db`
- 原檔:`backend/uploads/`

---

## 已知的小 bug(等打磨階段再處理)

1. **首頁統計卡片沒套用權限過濾**:teacher 看到「資料總數 4」但實際只顯示 3 支可見,數字應該要跟著權限過濾
2. **teacher 登入時若網址是某支看不到的影片,會直接顯示「找不到資料」**:應該導回首頁比較友善。改 AuthContext 的 login 成功行為
3. **內部 `internal` visibility 目前等同 admin only**:未來要改成「同分校 principal 可見」
4. **搜尋頁 `/api/search` 還沒套權限過濾**:teacher 搜尋可能搜到不該看的影片(但點進去會被擋,不是資安漏洞,只是 UX 問題)

---

## 立刻可做的下一步(三選一)

### 選項 A:Sprint 3C Phase 4(約 30 分鐘)
新增 `GET /api/videos/{id}/download` 端點,加 `Depends(auth.require_admin)`。前端在 admin 登入時顯示「下載原檔」按鈕,呼叫此端點(帶 Authorization header,直接觸發瀏覽器下載)。

### 選項 B:Sprint 3D 個人化功能(約 1-2 天)
筆記、書籤、觀看進度、搜尋歷史。讓使用者有「這是我的系統」的感覺。

### 選項 C:Sprint 3E AI 測驗系統(約 2-3 天,商業價值最高)
AI 從 transcript 生成測驗題目,teacher 答完計分,admin 看分校整體成績。這是把系統從「看完影片」升級到「證明學會了」的關鍵功能。

---

## 今天(2026/04/19)一句話總結

「從『只有一個 admin』進化成『總部可以控制分校看什麼』的完整 Netflix 式權限系統。」