#!/usr/bin/env python3
"""从 data/*.json 同步生成 app.js 中的 FALLBACK，并做规范化双向验证。"""
import json
import re
import sys
from pathlib import Path

ROOT = Path("/Users/a1234/Documents/kimi/workspace/htx-otc-progress-hub")
APP = ROOT / "app.js"

# FALLBACK 键 → data 文件名（9 个被加载的数据源，不含 design-delivery）
KEY_FILES = {
    "kpi": "kpi.json",
    "pipeline": "pipeline.json",
    "crmSummary": "crm-summary.json",
    "taskProgress": "task-progress.json",
    "roadmap": "roadmap.json",
    "gantt": "gantt.json",
    "taskTree": "task-tree.json",
    "todo": "todo.json",
    "milestones": "milestones.json",
}

def main():
    data = {}
    for key, fname in KEY_FILES.items():
        with open(ROOT / "data" / fname, encoding="utf-8") as f:
            data[key] = json.load(f)

    fallback_js = "const FALLBACK = " + json.dumps(data, ensure_ascii=False, indent=2) + ";"

    src = APP.read_text(encoding="utf-8")
    pattern = re.compile(
        r"(// __FALLBACK_SYNC_BEGIN__\n).*?(\n// __FALLBACK_SYNC_END__)",
        re.DOTALL,
    )
    if not pattern.search(src):
        print("ERROR: FALLBACK 同步标记未找到")
        return 1
    src = pattern.sub(lambda m: m.group(1) + fallback_js + m.group(2), src)
    APP.write_text(src, encoding="utf-8")
    print("FALLBACK 已写入 app.js")

    # ---- 规范化比对验证：解析 app.js 中的 FALLBACK 与磁盘 JSON 逐一对比 ----
    src2 = APP.read_text(encoding="utf-8")
    m = re.search(r"const FALLBACK = (\{.*?\});\n// __FALLBACK_SYNC_END__", src2, re.DOTALL)
    if not m:
        print("ERROR: 无法回读 FALLBACK")
        return 1
    parsed = json.loads(m.group(1))
    ok = True
    for key, fname in KEY_FILES.items():
        with open(ROOT / "data" / fname, encoding="utf-8") as f:
            disk = json.load(f)
        if parsed.get(key) != disk:
            print(f"MISMATCH: {key} != data/{fname}")
            ok = False
        else:
            print(f"OK: {key} == data/{fname}")
    print("VERIFY:", "PASS" if ok else "FAIL")
    return 0 if ok else 1

if __name__ == "__main__":
    sys.exit(main())
