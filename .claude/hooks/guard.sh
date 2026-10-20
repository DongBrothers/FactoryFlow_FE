#!/usr/bin/env bash
# 사람만 고치는 파일 차단. exit 2 = 거부
input=$(cat)
root=$(git rev-parse --show-toplevel)
# Windows 경로(C:\dev\...)를 git 경로(C:/dev/...) 모양으로 맞춘 뒤 저장소 기준 경로로 바꾼다 (드라이브 글자 대소문자 무시)
f=$(echo "$input" | jq -r '.tool_input.file_path // empty' | sed 's|\\|/|g')
rel=$f
shopt -s nocasematch
[[ "$f" == "$root/"* ]] && rel=${f:${#root}+1}
shopt -u nocasematch

deny() {
  echo "$(date '+%F %T')|guard|GUARD_BLOCK|$rel" >> "$root/.claude/harness.log"
  echo "차단: $1" >&2; exit 2
}

case "$rel" in
  CLAUDE.md|.claude/*|.github/*)
    deny "$rel 은 사람만 수정한다. 변경 제안만 하고 멈춰라." ;;
esac
exit 0
