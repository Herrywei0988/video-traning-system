# 接手說明 · 長頸鹿 AI 校園影片培訓整理系統

> 貼給新 Claude 用。完整細節看 `progress.md`。
> 最後更新：2026/04/20（Sprint 3C 全完成 + Sprint 3D Phase 1/2/3 全完成）

---

## 專案一句話

總部→分校的 SaaS 培訓知識庫(訂閱制):總部製作影片/音檔/投影片 → AI 轉錄+結構化分析 → 分校訂閱後,旗下角色依權限**線上觀看原檔**+ 看 AI 摘要、行動清單、**寫個人筆記/書籤、自動續看進度**、做小測驗驗收學習成效。Netflix 模式:能看、能學、不能下載原檔。

---

## 商業模式(重要:訂閱制)

**兩種用戶本質不同**:

| 身份 | 角色 | 屬於 | 職責 |
|------|------|------|------|
| 內容製作方 | `admin` | 總部(長頸鹿自己) | 上傳影片、產生 AI 分析、管理全站 |
| 內容消費方 | `principal` / `teacher` / `staff` | 客戶分校(付費訂閱) | 登入看影片、看摘要、寫筆記、做測驗 |

**訂閱顆粒度**:MVP 做「全包制」— 分校付月費 → 旗下帳號看到所有 public 影片。未來可升級「按分類訂閱」。

**分校訂閱狀態**:`active` / `expired` / `trial`。`expired` 的分校旗下帳號看不到任何影片。

---

## 核心價值主張(四個支柱 + 體驗層)

**四個產品支柱**:
1. **線上看原檔**:分校登入後能串流播放影片、瀏覽 PPT(不能下載)
2. **AI 分析摘要**:依角色顯示不同版本(exec / manager / teacher)
3. **小測驗驗收**(Sprint 3E 未做):AI 從影片生成題目,驗證學會了
4. **可匯出 PDF**:線下分享、歸檔用

**使用者體驗層**(Sprint 3D 已補完):筆記、書籤、續看進度、搜尋歷史。讓系統從「匿名查資料」變成「自己的知識庫」。

少了任何一個支柱,產品價值都會大打折扣。

---

## 目前進度

**已完成**:
- Week 1(AI 時間戳)
- Week 2(VideoDetail 改造)
- Sprint 3A(登入系統 + JWT)
- Sprint 3B(資料 FK 化 + 補寫入端 auth)
- Sprint 3C Phase 1-3 + visibility UI(權限擋牆 + stream token)
- 品牌橘色改版 + 視角切換器
- **Sprint 3C Phase 4(NEW!)**:stream/download 分流,admin 能下載原檔、其他角色 403
- **Sprint 3D Phase 1-3 全完成(NEW!)**:5 張新表 + 筆記 + 書籤 + 續看進度 + 搜尋歷史 + 11 個 activity_log 事件 + 順手修 3 個無 auth 技術債

**下一步**(Sprint 3D 完成後唯一剩的 Week 3 任務):
- **Sprint 3E:AI 測驗系統**(約 2-3 天,商業價值最高)

**完整 Roadmap**:

- ~~Sprint 3A~~ ✅ 使用者登入系統
- ~~Sprint 3B~~ ✅ 資料 FK 化
- ~~Sprint 3C~~ ✅ 權限擋牆 + visibility + stream/download 分流
- ~~Sprint 3D~~ ✅ 個人化 Schema(筆記/書籤/進度/歷史)
- **Sprint 3E  AI 小測驗系統(下一步)**
- Week 4    搜尋升級(embeddings + 段落級結果)
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
- **⚠️ DB_PATH 是相對路徑**:必須在 `backend/` 目錄執行;在其他目錄用 sqlite3 會靜默建空 DB 不報錯

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

**注意**:視角切換目前只改 UI,不影響後端回傳內容。admin 切「老師視角」還是會拿到全部影片清單(含機密)。Week 5 admin 儀表板會做真實的「以分校視角預覽」工具解決這個缺口。

---

## 資料庫 schema 現況(已做)

**核心業務表**:
- `users` (id, email, password_hash, name, role, branch_id, is_active)
- `branches` (id, name, code, is_headquarters, **subscription_status**)
- `videos` (含 `uploader_user_id` FK + `uploader_name` 舊字串 fallback + **visibility**)
- `analyses` (含 `transcript_segments` JSON)
- `views` (含 `viewer_user_id` FK)
- `tasks` (含 `assignee_user_id` FK)

**Sprint 3D 新增的個人化表**:
- `user_notes` (id, user_id, video_id, content, **timestamp_sec REAL NULL**, created_at, updated_at)
  - 整體筆記:timestamp_sec = NULL
  - 段落筆記:timestamp_sec 有值,前端可跳轉
- `user_bookmarks` (id, user_id, video_id, start_time REAL, note, created_at)
  - 書籤必綁時間戳
- `watch_progress` (user_id, video_id composite PK, last_position_sec, completed_at, updated_at)
  - 一人一影片一筆;completed_at NULL 表示未看完
- `search_history` (id, user_id, query, result_count, searched_at)
  - 個人歷史(chip 去重顯示)+ admin 熱門詞統計
- `activity_log` (id, user_id NULL, action, target_type, target_id, metadata JSON, created_at)
  - 所有重要事件的 audit trail

**Sprint 3D 接上的 11 個事件**:
login / upload_video / view_video_detail / edit_video / delete_video / reprocess_video / record_view / create_task / toggle_task / download_video / search / create_note / update_note / delete_note / create_bookmark / delete_bookmark / clear_search_history

---

## 資料庫 schema 後續規劃(未做)

### Sprint 3E 要加(AI 測驗系統)

```
quizzes                  # 每支影片一組測驗
├─ id, video_id (FK UNIQUE)
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

| 角色 | 看摘要 | 線上看影片 | 線上看 PPT | **下載原檔** | 筆記/書籤 | 續看進度 | 做測驗 | 看測驗結果 | 匯出 PDF | 上傳 |
|------|--------|-----------|-----------|-------------|----------|---------|--------|-----------|---------|------|
| admin | ✅ 全部 | ✅ 全部 | ✅ 全部 | ✅ | ✅ 僅自己 | ✅ 僅自己 | ✅ | ✅ 全部人 | ✅ | ✅ |
| principal | ✅(同分校) | ✅(同分校) | ✅(同分校) | ❌ | ✅ 僅自己 | ✅ 僅自己 | ✅ | ✅ 同分校 | ✅ | ❌ |
| teacher | ✅(同分校) | ✅(同分校) | ✅(同分校) | ❌ | ✅ 僅自己 | ✅ 僅自己 | ✅ | ✅ 僅自己 | ✅ | ❌ |
| staff | ✅(同分校) | ✅(同分校) | ✅(同分校) | ❌ | ✅ 僅自己 | ✅ 僅自己 | ✅ | ✅ 僅自己 | ✅ | ❌ |

**visibility 過濾現況**(MVP 版本):
- `public`:同分校訂閱有效的所有人
- `internal`:**目前等同 admin only**(未來會改成同分校 principal 可看)
- `confidential`:admin only

> MVP 先把 `internal` 和 `confidential` 都當 admin only 處理。Week 5 admin 儀表板再精緻化 principal 的 `internal` 權限。

**訂閱過濾**:如果分校 `subscription_status != 'active'`,以上所有「✅」變「❌」(整個列表空空)。

---

## API 端點規劃

### 已做

**Auth**:
- `POST /api/auth/login` — 登入,回傳 JWT(寫 activity_log)
- `GET /api/auth/me` — 回當前使用者
- `POST /api/auth/logout` — 目前純 client-side(未來 blacklist)

**影片 CRUD**:
- `GET /api/videos` — 列表(依 viewer 過濾 visibility + subscription)
- `GET /api/videos/{id}` — 單支(寫 view_video_detail log)
- `POST /api/videos/upload` — admin only(寫 upload_video log)
- `PUT /api/videos/{id}` — admin only(含 visibility,寫 edit_video log 含 changes diff)
- `DELETE /api/videos/{id}` — admin only(3D Phase 1 補權限)
- `POST /api/videos/{id}/reprocess` — admin only(3D Phase 1 補權限)

**Media 串流/下載**(分流設計):
- `GET /api/videos/{id}/stream-token` — 取 2 小時 JWT,綁 user_id+video_id
- `GET /api/videos/{id}/file?stream_token=xxx` — 線上播放(`<video>/<audio>` 不能帶 Authorization header)
- `GET /api/videos/{id}/download` — **admin only** 下載原檔(3C Phase 4 新增)
  - 前端用 fetch blob + `<a download>`,避免 JWT 塞 URL

**分析/觀看/任務**:
- `GET /api/videos/{id}/analysis` — 需有 can_view_video
- `POST /api/videos/{id}/views` — 記錄觀看(寫 record_view log)
- `GET /api/videos/{id}/views` — 觀看列表
- `POST /api/videos/{id}/tasks` / `GET /api/videos/{id}/tasks` / `PATCH /api/tasks/{id}/toggle`

**搜尋**(Sprint 3D 強化):
- `GET /api/search?q=xxx` — 登入才能搜;同時寫 search_history + log
- `GET /api/search/history?limit=10` — 個人最近搜尋(MAX(id) GROUP BY query 去重)
- `DELETE /api/search/history` — 整批清除
- `DELETE /api/search/history/item` body 帶 `{query}` — 單筆刪除

**個人化**(Sprint 3D 新增):
- `GET/PUT /api/videos/{id}/progress` — 續看進度(PUT 不寫 log 避免噪音)
- `GET /api/progress/in-progress?limit=6` — 未完成影片清單(Dashboard 用)
- `GET/POST /api/videos/{id}/notes` — 列出/新增筆記
- `PUT/DELETE /api/notes/{note_id}` — 編輯/刪除(只能動自己的)
- `GET/POST /api/videos/{id}/bookmarks` — 列出/新增書籤
- `DELETE /api/bookmarks/{id}` — 刪除(只能刪自己的)

### 未做(Sprint 3E)

- `POST /api/videos/{id}/quiz/generate` — admin 生成題目
- `GET /api/videos/{id}/quiz` — 拿題目(隱藏答案)
- `POST /api/videos/{id}/quiz/attempt` — 提交答案
- `GET /api/videos/{id}/quiz/attempts` — 看歷史(依角色過濾)

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
- **會主動提出產品 feature**(「單筆刪除也要有」、「能不能出小測驗」)→ 認真當 feature request 處理
- **產品直覺很準**:會問出「都是總部管理員」、「只有分析沒原檔」、「這些資料存哪」這類正確質疑
- **python 檔案改動後一定要提醒重啟後端**(Python 不會熱重載,這踩過很多次坑)

---

## 踩雷提醒(持續累積)

### 環境與工具
- WSL 環境,ffmpeg 用 apt 裝
- iPhone 上傳的 `.mov` 要 ffmpeg 抽音軌
- git commit 有引號 bug,教用 `git commit` 開編輯器
- **資料庫檔叫 `training.db` 不是 `app.db`**
- **DB_PATH 是相對路徑**:在 backend/ 目錄才找得到,在專案根目錄跑 sqlite3 會靜默建空 DB 不報錯
- **複製指令不要連 shell prompt 一起複製**(`(venv) (base) herry@...$`),會 syntax error

### 後端
- 所有寫入端點都要 `Depends(auth.get_current_user)` 或更嚴格
- **後端改動必須手動重啟**(Ctrl+C → `python app.py`),Python 沒有像 Vite 那樣的熱重載(這個坑會反覆出現,驗收 404 第一件事先問「後端重啟了嗎」)
- **auth.py 常數叫 `JWT_SECRET` 和 `JWT_ALGORITHM`**,不是 `SECRET_KEY` / `ALGORITHM`
- **FastAPI 500 錯誤要去後端 terminal 看 traceback**,curl 只看到 Internal Server Error
- **URL path 塞中文/空格/特殊字元會炸**:想傳 query 字串這類動態內容用 POST body 最穩
- **`log_activity` 寫失敗不 raise**:audit log 不該成為關鍵路徑

### 前端
- VideoDetail.jsx 超過 1000 行(Sprint 3D 又加了),Sprint 3E 前要拆
- CSS 衝突(`.sidebar-nav` 等),Sidebar 用 inline style 繞過
- **api.js wrapper 只處理 JSON,不處理 multipart** — 帶進度條的 xhr 要手動加 Authorization
- **api.js 的 `delete()` 已擴充支援 optional body**(Sprint 3D 3-2 單刪需要)
- **`<video>`/`<audio>` 標籤不能帶 Authorization header**,受 JWT 保護的 media 一定要走 stream_token URL 參數方案
- **前端 media 時序陷阱**:`<video src="">` 空字串會觸發 onError → setMediaError(true) → fallback 蓋掉播放器。`!streamToken` 時整個不渲染 media 標籤,別用空 src
- **`el.readyState >= 1` 要處理**:載入 media metadata 時若 el 已經 ready,要立刻 doSeek,不能單靠 `loadedmetadata` event(可能已經 fire 過)

### 測試與 debug
- **curl 用 `-I`(HEAD)測 `/file` 端點會回 405**,FastAPI/StreamingResponse 不支援 HEAD。用 `-s -o /dev/null -w "HTTP %{http_code}"` 代替
- **DevTools Console 是好朋友**:前端在 `localhost:5173/video/xxx` 打開 Console 用 fetch 測後端 API 最快驗權限

---

## 登入資訊

- 預設 admin:`admin@giraffe.local` / `admin123456`
- 測試 teacher:`teacher@taipei.test` / `teacher123456`(台北分校)
- 重建 admin:`cd backend && python seed.py`
- Sprint 3B migration:`cd backend && python migrate_3b.py`(冪等)
- Sprint 3C 測試資料:`cd backend && python seed_3c.py`(冪等,建台北分校 + teacher)

---

## 關鍵檔案位置

**Frontend**:
- AuthContext:`frontend/src/context/AuthContext.jsx`(含 viewAsRole/effectiveRole)
- API wrapper(JSON + optional body DELETE):`frontend/src/utils/api.js`
- 視角切換:`frontend/src/components/Sidebar.jsx`
- Banner:`frontend/src/components/ViewAsBanner.jsx`
- **筆記面板(Sprint 3D)**:`frontend/src/components/NotesPanel.jsx`
- **書籤面板(Sprint 3D)**:`frontend/src/components/BookmarksPanel.jsx`
- VideoDetail:`frontend/src/pages/VideoDetail.jsx`(1000+ 行,含 stream_token/progress/notes/bookmarks 整合)
- Dashboard(Sprint 3D 加「繼續觀看」):`frontend/src/pages/Dashboard.jsx`(含 ContinueCard)
- Search(Sprint 3D 加歷史 chip):`frontend/src/pages/Search.jsx`
- Upload(xhr 特例):`frontend/src/pages/Upload.jsx`

**Backend**:
- auth(含 stream token):`backend/auth.py`
- DB(含 can_view_video + 5 張 Sprint 3D 新表 CRUD + log_activity):`backend/database.py`
- API(含 Sprint 3D 全部 endpoint):`backend/app.py`
- AI 服務:`backend/ai_service.py`

**資料**:
- 資料庫:`backend/training.db`
- 原檔:`backend/uploads/`

---

## 已知的小 bug(等打磨階段再處理)

**已解決(2026/04/20)**:
- ✅ ~~`DELETE /api/videos/{id}` 沒權限檢查~~ → 改用 require_admin
- ✅ ~~`POST /api/videos/{id}/reprocess` 沒權限檢查~~ → 改用 require_admin
- ✅ ~~`GET /api/search` 沒 auth~~ → 加 get_current_user
- ✅ ~~原檔下載沒獨立端點~~ → 拆出 /download endpoint

**仍待處理**:
1. **首頁統計卡片沒套用權限過濾**:teacher 看到「資料總數 4」但實際只顯示 3 支可見,數字應該要跟著權限過濾
2. **teacher 登入時若網址是某支看不到的影片,會直接顯示「找不到資料」**:應該導回首頁比較友善
3. **內部 `internal` visibility 目前等同 admin only**:未來要改成「同分校 principal 可見」
4. **搜尋頁 `/api/search` 還沒套可見度過濾**:teacher 搜尋可能看到不該看的影片標題摘要(但點進去會被擋;Week 4 處理)
5. **視角切換不過濾機密影片清單**:admin 切「老師視角」時後端還是回全清單(視角只改 UI)。Week 5 admin 儀表板會做「以分校視角預覽」工具解決
6. **VideoDetail.jsx 1000+ 行過胖**:Sprint 3E 前先拆

---

## 立刻可做的下一步(建議順序)

### 選項 A(推薦):Sprint 3E AI 測驗系統 — 約 2-3 天
把 Sprint 3D 鋪好的「個人化地基」接上「測驗成績紀錄」,讓分校老師看完影片能證明學會了。這是 Week 3 唯一剩下的主線任務,做完 Week 3 就完整收尾。

- 後端:ai_service 加 `generate_quiz()`、DB 加 `quizzes` / `quiz_attempts` 表、6 個 endpoint
- 前端:VideoDetail 加「做測驗」tab、答題 UI、結果頁
- 權限擴展:teacher 看自己、principal 看同分校、admin 看全部

### 選項 B:先修技術債再進 Sprint 3E — 約半天
拆 VideoDetail.jsx、補首頁統計權限過濾、修 teacher 404 導向。讓 code 乾淨再繼續。

### 選項 C:進 Week 4 搜尋升級(跳過 3E) — 約 1 週
接 OpenAI embeddings、段落級搜尋結果、加「相關影片推薦」。但這會讓 Week 3 不完整。

**通常選 A**。3E 商業價值最高、也讓 Week 3 完整收尾。

---

## 今天(2026/04/20)一句話總結

「**Sprint 3D 全部完成**:系統從『匿名查資料』升級成『自己的知識庫』,使用者有筆記、書籤、續看進度、搜尋歷史,Dashboard 能從上次看到的位置繼續;同時把 Sprint 3C Phase 4 補完,admin 能下載原檔、其他角色被後端 403 擋。Week 3 只差 Sprint 3E(AI 測驗)就完整收尾。」