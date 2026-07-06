#!/usr/bin/env bash

# Kiểm tra code thủ công cho NoteData (Svelte 5 + TypeScript + Vite)
# - oxlint: quy tắc JS/TS nhanh
# - svelte-check + tsc: kiểm tra kiểu Svelte/TypeScript

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LINT_RESULT_FILE="$SCRIPT_DIR/lint-results.json"
CHECK_LOG_FILE="$SCRIPT_DIR/check-results.log"

OXLINT_EXIT=0
CHECK_EXIT=0

echo "=================================================="
echo "NoteData — Kiểm tra code thủ công"
echo "Thư mục dự án: $PROJECT_ROOT"
echo "=================================================="

cd "$PROJECT_ROOT"

if [ ! -d "src" ]; then
  echo "Không tìm thấy thư mục src trong $PROJECT_ROOT"
  exit 1
fi

if [ ! -f "package.json" ]; then
  echo "Không tìm thấy package.json trong $PROJECT_ROOT"
  exit 1
fi

echo ""
echo "[1/2] oxlint — phân tích src/"
echo "--------------------------------------------------"
npx -y oxlint@latest "$PROJECT_ROOT/src"
OXLINT_EXIT=$?

echo ""
echo "[2/2] svelte-check + tsc — kiểm tra kiểu"
echo "--------------------------------------------------"
if npm run check >"$CHECK_LOG_FILE" 2>&1; then
  CHECK_EXIT=0
  cat "$CHECK_LOG_FILE"
else
  CHECK_EXIT=$?
  cat "$CHECK_LOG_FILE"
fi

echo ""
echo "=================================================="

if [ $OXLINT_EXIT -eq 0 ] && [ $CHECK_EXIT -eq 0 ]; then
  echo "Kết quả: CODE SẠCH — không phát hiện lỗi."
  echo "=================================================="
  rm -f "$LINT_RESULT_FILE" "$CHECK_LOG_FILE"
  exit 0
fi

echo "Kết quả: PHÁT HIỆN VẤN ĐỀ"
[ $OXLINT_EXIT -ne 0 ] && echo "  - oxlint:      FAILED (exit $OXLINT_EXIT)"
[ $CHECK_EXIT -ne 0 ] && echo "  - type check:  FAILED (exit $CHECK_EXIT)"
echo "=================================================="

if [ $OXLINT_EXIT -ne 0 ]; then
  echo "Đang tạo báo cáo oxlint JSON: scripts/lint-results.json"
  npx -y oxlint@latest "$PROJECT_ROOT/src" -f json >"$LINT_RESULT_FILE" 2>/dev/null || true
fi

if [ $CHECK_EXIT -ne 0 ]; then
  echo "Log kiểm tra kiểu: scripts/check-results.log"
fi

if [ $OXLINT_EXIT -ne 0 ] && command -v jq >/dev/null 2>&1 && [ -f "$LINT_RESULT_FILE" ]; then
  TOTAL_ISSUES=$(jq 'length' "$LINT_RESULT_FILE" 2>/dev/null || echo "?")
  echo "Tổng số vấn đề oxlint (theo file): $TOTAL_ISSUES"
fi

FINAL_EXIT=0
[ $OXLINT_EXIT -ne 0 ] && FINAL_EXIT=$OXLINT_EXIT
[ $CHECK_EXIT -ne 0 ] && FINAL_EXIT=$CHECK_EXIT

exit $FINAL_EXIT