#!/usr/bin/env bash
# Claude 가 "끝" 이라고 할 때 실행. exit 2 = 멈추지 말고 고쳐라 (최대 3회)
set -uo pipefail
input=$(cat)
sid=$(echo "$input" | jq -r '.session_id')
cd "$(git rev-parse --show-toplevel)"
LOG=.claude/harness.log
CNT=${TMPDIR:-/tmp}/ff-fe-stop-$sid
n=$(cat "$CNT" 2>/dev/null || echo 0)

log() { echo "$(date '+%F %T')|$sid|$1|$2" >> "$LOG"; }

fail() { # $1=실패유형 $2=Claude 에게 줄 메시지
  n=$((n+1)); echo "$n" > "$CNT"
  log "$1" "try$n"
  if [ "$n" -ge 3 ]; then
    log "$1" "GIVEUP"
    echo "3회 실패. 사람 확인 필요: $1" >&2
    rm -f "$CNT"; exit 0
  fi
  echo -e "$2" >&2; exit 2
}

changed=$( { git diff --name-only HEAD; git ls-files --others --exclude-standard; } 2>/dev/null | sort -u )
[ -z "$changed" ] && { rm -f "$CNT"; exit 0; }

# 1) 테스트 무력화 차단 (바뀐 테스트 코드의 더해진 줄과 새 테스트 파일만 본다)
git diff --name-only --diff-filter=D HEAD 2>/dev/null | grep -E '\.test\.tsx?$' >/dev/null \
  && fail TEST_DELETED "테스트 파일 삭제 금지. 테스트가 틀렸다면 이유를 말하고 멈춰라."
added=$( { git diff -U0 HEAD -- '*.test.ts' '*.test.tsx' 2>/dev/null | grep -E '^\+[^+]' | sed 's/^+//'
  git ls-files -z --others --exclude-standard -- '*.test.ts' '*.test.tsx' | xargs -0 -r cat; } )
echo "$added" | grep -E '\b(it|test|describe)\.(skip|only|todo)\b|\bx(it|test|describe)\(' >/dev/null \
  && fail TEST_DISABLED ".skip, .only, .todo, xit 로 테스트 끄기 금지."
echo "$added" | grep -E 'expect\((true|false|1|null|undefined)\)\.(toBe|toEqual)\((true|false|1|null|undefined)\)' >/dev/null \
  && fail FAKE_ASSERT "의미 없는 assert 금지."

# 2) 코드나 빌드 설정이 바뀌었으면 CI 와 같은 검사 (lint → test → build)
if echo "$changed" | grep -E '^(src/|index\.html|package(-lock)?\.json|vite\.config\.ts|tsconfig.*\.json|\.oxlintrc\.json)' >/dev/null; then
  out=$( { npm run lint --silent && npm test --silent && npm run build --silent; } 2>&1 ) \
    || fail CHECK_FAIL "검사 실패. 고친 뒤 다시 끝내라.\n$(echo "$out" | tail -40)"
fi

rm -f "$CNT"; exit 0
