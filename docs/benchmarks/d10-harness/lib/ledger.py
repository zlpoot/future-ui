# -*- coding: utf-8 -*-
"""d10-harness · ledger.py — 结果账本（JSONL）。

每 run 一条：taskId/family/seed/group/order/subjectSha/harnessSha/attempts/
usage/cost/elapsed/feedback/bridge/eval/failureCategory/status。
全局预算护栏读取累计 token；cost 仅作为非权威观测记录。
"""
import io, json, os, time

HERE = os.path.dirname(os.path.abspath(__file__))
HARNESS = os.path.dirname(HERE)


class Ledger:
    def __init__(self, runs_dir, name="ledger.jsonl"):
        """name：正式账本默认 ledger.jsonl；干跑/自检必须用独立账本（ledger-dry.jsonl），
        防止 modelId=dry 的成功结果污染正式 calibration（Review P1：dry/real 隔离）。"""
        self.runs_dir = runs_dir
        self.path = os.path.join(runs_dir, name)
        os.makedirs(runs_dir, exist_ok=True)
        self._entries = []
        if os.path.exists(self.path):
            with io.open(self.path, encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        try:
                            self._entries.append(json.loads(line))
                        except ValueError:
                            pass

    def append(self, entry):
        entry.setdefault("ts", time.strftime("%Y-%m-%dT%H:%M:%S%z"))
        self._entries.append(entry)
        with io.open(self.path, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
        return entry

    def total_cost(self):
        return sum(float(e.get("cost", 0) or 0) for e in self._entries)

    def total_tokens(self):
        return sum(int((e.get("usage") or {}).get("total", 0) or 0) for e in self._entries)

    def count(self):
        return len(self._entries)
