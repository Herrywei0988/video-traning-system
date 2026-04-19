# 🦒 長頸鹿 AI 校園 · 影片培訓整理系統

把培訓影片從「看完就算」變成可追蹤、可搜尋、可累積、可收費的組織知識系統。

## 這是什麼

總部 → 分校的 SaaS 培訓知識庫：

1. **總部上傳** 培訓影片 / 音檔 / 投影片 / 文件
2. **AI 自動整理**：語音轉文字、結構化分析、產出三種角色版本（主管/班主任/老師）
3. **分校觀看**：線上播放 + 看 AI 整理的摘要、重點、FAQ、待辦清單
4. **可匯出 PDF** 給不同角色使用，原檔由總部保留（Netflix 模式）

## 核心差異化

vs 分校自己用 GPT：

- ✅ **從「看完」到「執行完」的閉環** — 每支影片配套行動清單
- ✅ **同一支影片、三種角色、三種版本** — 主管/班主任/老師看到不同重點
- ✅ **可累積的知識庫** — 不是閱後即焚，是 org-wide 搜尋資產
- ✅ **分校權限隔離** — 真 SaaS 不是 side project
- ✅ **Netflix 模式** — 付費看，不能帶走檔案

---

## 技術棧

| 層 | 技術 |
|------|------|
| 前端 | React + Vite + React Router + JWT Auth |
| 後端 | FastAPI + SQLite + bcrypt + PyJWT |
| AI | OpenAI Whisper + GPT-4o |
| 部署 | WSL / Linux（Week 8 遷移 PostgreSQL + Docker） |

---

## Roadmap

| 階段 | 狀態 | 內容 |
|------|------|------|
| Week 1 | ✅ 完成 | AI 底層升級（gpt-4o、時間戳、segments） |
| Week 2 | ✅ 完成 | VideoDetail 改造（嵌入播放器、段落跳轉、分角色 PDF） |
| Week 3 Sprint 3A | ✅ 完成 | 使用者系統後端 + 前端登入 |
| 插隊任務 | ✅ 完成 | 品牌橘色改版 + 視角切換器 |
| Week 3 Sprint 3B | 🚧 下一步 | 資料 FK 化（user_id 接上外鍵） |
| Week 3 Sprint 3C | ⏳ 規劃中 | 觀看自動化 + 權限擋牆 + 示範帳號 |
| Week 3 Sprint 3D | ⏳ 規劃中 | 個人化 Schema（筆記/書籤/續看/歷史） |
| Week 4 | ⏳ 規劃中 | 搜尋升級（向量搜尋、段落級結果） |
| Week 5 | ⏳ 規劃中 | Admin 儀表板 |
| Week 6 | ⏳ 規劃中 | 版本管理 + 推送通知 |
| Week 7 | ⏳ 規劃中 | PPT/文件預覽 |
| Week 8 | ⏳ 規劃中 | 上線基建（Postgres 遷移、備份、部署） |

詳細進度請看 [`docs/progress.md`](./docs/progress.md)。

---

## 快速開始

### 後端

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # 填入 OPENAI_API_KEY、JWT_SECRET
python seed.py         # 建立 HQ 分校 + 預設 admin 帳號
uvicorn app:app --reload
```

後端跑在 `http://localhost:8000`。

### 前端

```bash
cd frontend
npm install
npm run dev
```

前端跑在 `http://localhost:5173`，會 proxy 到後端。

### 預設帳號
- Email:    admin@giraffe.local
- Password: admin123456

登入後請立即改密碼（Week 8 會加強制改密功能）。

---

## 備份

開發階段備份由 `scripts/backup.sh` 處理，每日壓縮 DB + uploads 目錄到 `backups/` 並保留 30 天。

建議加進 crontab：
```bash
0 2 * * * /path/to/scripts/backup.sh
```

詳細還原步驟：見 `scripts/backup.sh` 頂部註解。

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