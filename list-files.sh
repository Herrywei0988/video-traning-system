#!/bin/bash
cd "$(dirname "$0")"

echo "=== 📁 專案結構 ==="
tree -I 'node_modules|venv|.venv|__pycache__|*Zone.Identifier*|package-lock.json|*.db|.git|dist|build|*.pyc|uploads' \
     --dirsfirst -L 5

echo ""
echo "=== 📊 主要程式檔行數（由大到小） ==="
find . -type f \( -name "*.py" -o -name "*.jsx" -o -name "*.js" -o -name "*.css" \) \
  -not -path '*/node_modules/*' \
  -not -path '*/venv/*' \
  -not -path '*/.venv/*' \
  -not -path '*/__pycache__/*' \
  -not -path '*/dist/*' \
  -not -name '*Zone.Identifier*' \
  -exec wc -l {} + 2>/dev/null | sort -rn | grep -v " total$"

echo ""
echo "=== 📄 設定與文件檔 ==="
for f in README.md backend/requirements.txt frontend/package.json frontend/vite.config.js backend/.env.example; do
  if [ -f "$f" ]; then
    size=$(stat -c%s "$f" 2>/dev/null)
    echo "$f ($size bytes)"
  fi
done
