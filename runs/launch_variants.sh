#!/bin/bash
# wait for the noon run to finish, then run the two prompt variants on the same checkpoints
cd "$(dirname "$0")/.."
while pgrep -f "locks -3" >/dev/null; do sleep 15; done
for v in intent audited; do
  python3 -m harness.run --policy llm --variant $v --n-hist 16 --reps 4 --locks 0 3 --workers 3 \
    --out runs/${v}_qwen.jsonl > runs/$v.log 2>&1 &
done
wait
