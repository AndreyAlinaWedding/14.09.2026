#!/usr/bin/env bash
# Load-test RSVP → Google Sheets: 100 form-like submissions.
# Rows are marked with comment "LOADTEST #NNN" for easy cleanup.
set -euo pipefail

URL='https://script.google.com/macros/s/AKfycbxlm86cA7v1Q7kaD8oKnN_Plgh7tbEkbRmLu3iAJ4Q4fzKUYGpdQ5VLcgFqXk2Z6y38IQ/exec'
TOTAL="${1:-100}"
CONCURRENCY="${2:-5}"
WORKDIR="$(mktemp -d)"
RESULTS="$WORKDIR/results.txt"
touch "$RESULTS"

now_ms() { python3 -c 'import time; print(int(time.time()*1000))'; }

send_one() {
  local i="$1"
  local attending guests names drinks comment payload code t0 t1 ms

  if (( i % 5 == 0 )); then
    attending=no
    guests=0
    names="ТестГость${i} Фамилия${i}"
    drinks=""
  else
    attending=yes
    guests=$(( (i % 4) + 1 ))
    names="ТестГость${i} Фамилия${i}"
    drinks="Вино"
    if (( guests >= 2 )); then
      names="${names}; Гость${i}б Тестов"
      drinks="${drinks}; Крепкий алкоголь"
    fi
    if (( guests >= 3 )); then
      names="${names}; Гость${i}в Тестова"
      drinks="${drinks}; Не пью алкоголь"
    fi
    if (( guests >= 4 )); then
      names="${names}; Гость${i}г Тестов"
      drinks="${drinks}; Вино"
    fi
  fi

  comment=$(printf 'LOADTEST #%03d — тестовая запись, можно удалить' "$i")
  payload=$(printf '{"attendance":"%s","guests":"%s","name":"%s","names":"%s","drinks":"%s","comment":"%s"}' \
    "$attending" "$guests" "$names" "$names" "$drinks" "$comment")

  t0=$(now_ms)
  # Do not follow redirects: Apps Script returns 302 after successful doPost
  code=$(curl -sS -o "$WORKDIR/body_$i.txt" -w '%{http_code}' -X POST \
    -H 'Content-Type: text/plain;charset=utf-8' \
    --data-binary "$payload" \
    "$URL" || echo 000)
  t1=$(now_ms)
  ms=$((t1 - t0))

  if [[ "$code" == "302" || "$code" == "200" ]]; then
    echo "OK $i $code ${ms}ms" >> "$RESULTS"
  else
    echo "FAIL $i $code ${ms}ms" >> "$RESULTS"
  fi
}

export -f send_one now_ms
export URL WORKDIR RESULTS

echo "Sending $TOTAL RSVP records (concurrency=$CONCURRENCY)..."
START=$(now_ms)

seq 1 "$TOTAL" | xargs -n 1 -P "$CONCURRENCY" -I{} bash -c 'send_one "$@"' _ {}

END=$(now_ms)
OK=$(grep -c '^OK ' "$RESULTS" || true)
FAIL=$(grep -c '^FAIL ' "$RESULTS" || true)
ELAPSED_MS=$((END - START))

echo
echo '=== SUMMARY ==='
echo "total: $TOTAL"
echo "ok: $OK"
echo "fail: $FAIL"
echo "elapsed: $(python3 -c "print(round($ELAPSED_MS/1000, 1))")s"

python3 - "$RESULTS" <<'PY'
import sys
from pathlib import Path
lines = Path(sys.argv[1]).read_text().strip().splitlines()
times = []
for line in lines:
    parts = line.split()
    if len(parts) >= 4 and parts[3].endswith('ms'):
        times.append(int(parts[3][:-2]))
if times:
    times.sort()
    p50 = times[len(times)//2]
    p95 = times[min(len(times)-1, int(len(times)*0.95))]
    print(f"latency p50: {p50}ms, p95: {p95}ms, max: {times[-1]}ms, avg: {sum(times)//len(times)}ms")
fails = [l for l in lines if l.startswith('FAIL ')]
if fails:
    print('\nFailures (first 10):')
    print('\n'.join(fails[:10]))
PY

rm -rf "$WORKDIR"
