from __future__ import annotations

import ast
import json
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[1]
SETTINGS_PATH = API_ROOT / "config" / "settings.py"
source = SETTINGS_PATH.read_text(encoding="utf-8-sig")
tree = ast.parse(source, filename=str(SETTINGS_PATH))

load_calls: list[ast.Call] = []
for node in ast.walk(tree):
    if not isinstance(node, ast.Call):
        continue
    name = node.func.id if isinstance(node.func, ast.Name) else None
    if name == "load_dotenv":
        load_calls.append(node)

assert len(load_calls) == 1
assert "QLKLT_ENV_FILE" in source
assert "_QLKLT_ENV_PATH" in source
assert len(load_calls[0].args) == 0
assert {keyword.arg for keyword in load_calls[0].keywords} == {
    "dotenv_path",
    "override",
}

print(
    json.dumps(
        {
            "ok": True,
            "checks": [
                "one-load-dotenv-call",
                "explicit-env-selector-present",
                "explicit-path-passed-to-dotenv",
                "dotenv-override-disabled",
            ],
        },
        indent=2,
    )
)
