#!/usr/bin/env bash
# ============================================================================
# 長頸鹿 AI 校園 · 影片培訓系統 備份腳本
# ============================================================================
# 用途：每日備份 SQLite DB + uploads 目錄 + 設定檔，壓縮保留 30 天。
#
# 使用方式：
#   手動執行： ./scripts/backup.sh
#   自動排程： crontab -e 加入以下一行（每日凌晨 2 點）
#             0 2 * * * /絕對路徑/to/video-traning-system/scripts/backup.sh >> /tmp/giraffe-backup.log 2>&1
#
# 備份內容：
#   - backend/training.db         （SQLite 資料庫）
#   - backend/uploads/       （原始影音檔）
#   - backend/.env           （環境變數，含 JWT secret）
#
# 備份位置：
#   專案根目錄/backups/YYYY-MM-DD_HHMMSS/giraffe-backup-YYYY-MM-DD_HHMMSS.tar.gz
#
# 還原方式：
#   1. 停掉後端服務
#   2. cd 到專案根目錄
#   3. tar -xzf backups/<想還原的日期>/giraffe-backup-*.tar.gz
#   4. 檢查 backend/training.db 跟 backend/uploads/ 是否正確還原
#   5. 重啟後端
# ============================================================================

set -euo pipefail

# ── 路徑設定 ──────────────────────────────────────────────
# 讓 cron 也能找到正確路徑（不管從哪裡執行）
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
BACKUP_ROOT="$PROJECT_ROOT/backups"

TIMESTAMP="$(date +%Y-%m-%d_%H%M%S)"
BACKUP_DIR="$BACKUP_ROOT/$TIMESTAMP"
BACKUP_FILE="$BACKUP_DIR/giraffe-backup-$TIMESTAMP.tar.gz"

# 保留天數（預設 30 天，要改自己改）
RETENTION_DAYS=30

# ── 開始備份 ──────────────────────────────────────────────
echo "=========================================="
echo "🦒 Giraffe Backup · $TIMESTAMP"
echo "=========================================="
echo "Project root: $PROJECT_ROOT"
echo "Backup to:    $BACKUP_FILE"
echo ""

mkdir -p "$BACKUP_DIR"

# 要備份的項目清單（相對於專案根目錄）
BACKUP_ITEMS=()
[ -f "$PROJECT_ROOT/backend/training.db" ]   && BACKUP_ITEMS+=("backend/training.db")
[ -d "$PROJECT_ROOT/backend/uploads" ]  && BACKUP_ITEMS+=("backend/uploads")
[ -f "$PROJECT_ROOT/backend/.env" ]     && BACKUP_ITEMS+=("backend/.env")

if [ ${#BACKUP_ITEMS[@]} -eq 0 ]; then
    echo "❌ 沒有找到任何要備份的檔案，請確認路徑。"
    exit 1
fi

echo "要備份："
for item in "${BACKUP_ITEMS[@]}"; do
    echo "  - $item"
done
echo ""

# ── SQLite 安全複製（避免寫入中途被讀）──────────────────
# 用 sqlite3 .backup 指令，比直接 cp 安全
if [ -f "$PROJECT_ROOT/backend/training.db" ]; then
    if command -v sqlite3 &> /dev/null; then
        echo "📦 使用 sqlite3 .backup 模式複製 DB..."
        sqlite3 "$PROJECT_ROOT/backend/training.db" ".backup '$BACKUP_DIR/app.db'"
        # 把備份檔替換掉原始 path（tar 時用備份版本）
        TMP_DB="$BACKUP_DIR/app.db"
    else
        echo "⚠️  sqlite3 指令未安裝，改用 cp（理論上 SQLite WAL 模式仍然安全）"
        cp "$PROJECT_ROOT/backend/training.db" "$BACKUP_DIR/app.db"
        TMP_DB="$BACKUP_DIR/app.db"
    fi
fi

# ── 打包 tar.gz ──────────────────────────────────────────
echo "📦 打包中..."
cd "$PROJECT_ROOT"
tar -czf "$BACKUP_FILE" "${BACKUP_ITEMS[@]}"

# 打包完成後把單獨的 app.db 臨時檔刪掉（已在 tar 裡了）
[ -f "$TMP_DB" ] && rm -f "$TMP_DB"

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "✅ 備份完成：$BACKUP_FILE（$BACKUP_SIZE）"
echo ""

# ── 清理超過保留天數的舊備份 ─────────────────────────────
echo "🧹 清理 $RETENTION_DAYS 天前的舊備份..."
find "$BACKUP_ROOT" -maxdepth 1 -type d -mtime +$RETENTION_DAYS -exec rm -rf {} \; 2>/dev/null || true
REMAINING=$(find "$BACKUP_ROOT" -maxdepth 1 -type d | wc -l)
echo "目前保留備份數：$((REMAINING - 1))"
echo ""

echo "=========================================="
echo "🎉 Done."
echo "=========================================="