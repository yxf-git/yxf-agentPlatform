from __future__ import annotations

import json
from typing import Any


def sse_event(event_type: str, **data: Any) -> str:
    """构造一条 SSE 消息。前端按 data 中的 type 字段分发。"""
    payload = {"type": event_type, **data}
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
