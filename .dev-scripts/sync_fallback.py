#!/usr/bin/env python3
"""从 data/*.json 同步生成 app.js 中的 FALLBACK，并做规范化双向验证。

用法：
  python3 .dev-scripts/sync_fallback.py          # 同步模式：重写 app.js 中的 FALLBACK 并验证
  python3 .dev-scripts/sync_fallback.py --check  # 校验模式：只比对、不写文件（CI / 提交前自查）

v0.5 起加载的 7 个数据集：
  kpi / gantt / roadmap / pipeline / todo / milestones / weekly-log
已弃用（保留磁盘、不再加载、不纳入 FALLBACK）：
  design-delivery.json / crm-summary.json / task-progress.json / task-tree.json
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "app.js"

# FALLBACK 键 → data 文件名（7 个被加载的数据源，键序与 app.js FALLBACK 一致）
KEY_FILES = {
    "kpi": "kpi.json",
    "gantt": "gantt.json",
    "roadmap": "roadmap.json",
    "pipeline": "pipeline.json",
    "todo": "todo.json",
    "milestones": "milestones.json",
    "weeklyLog": "weekly-log.json",
}


def read_fallback():
    """从 app.js 回读 FALLBACK 并解析为 dict。"""
    src = APP.read_text(encoding="utf-8")
    m = re.search(r"const FALLBACK = (\{.*?\});\n// __FALLBACK_SYNC_END__", src, re.DOTALL)
    if not m:
        print("ERROR: 无法回读 FALLBACK")
        return None
    return json.loads(m.group(1))


def verify(parsed):
    """规范化比对：解析后的 FALLBACK 与磁盘 JSON 逐键对比。"""
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
    return ok


def main():
    check_only = "--check" in sys.argv[1:]

    if check_only:
        parsed = read_fallback()
        if parsed is None:
            return 1
        return 0 if verify(parsed) else 1

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

    # ---- 回读验证 ----
    parsed = read_fallback()
    if parsed is None:
        return 1
    return 0 if verify(parsed) else 1


if __name__ == "__main__":
    sys.exit(main())
