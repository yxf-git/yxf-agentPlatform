from __future__ import annotations

from fastapi import APIRouter

from ..config import settings
from ..mcp.manager import get_mcp_tools, probe_status
from ..schemas import ToolInfo
from .builtin import BUILTIN_TOOL_META

router = APIRouter(prefix="/api/tools", tags=["tools"])


@router.get("")
async def list_tools() -> list[ToolInfo]:
    result: list[ToolInfo] = []

    for meta in BUILTIN_TOOL_META:
        status = "connected"
        if meta["id"] == "exec_command" and not settings.enable_exec:
            status = "disconnected"
        if meta["id"] == "web_search" and not settings.tavily_api_key:
            status = "disconnected"
        result.append(
            ToolInfo(
                id=meta["id"],
                name=meta["name"],
                description=meta["description"],
                icon=meta["icon"],
                status=status,  # type: ignore[arg-type]
                kind="builtin",
            )
        )

    # MCP 工具
    try:
        mcp_tools = await get_mcp_tools()
        for t in mcp_tools:
            result.append(
                ToolInfo(
                    id=f"mcp:{t.name}",
                    name=t.name,
                    description=(getattr(t, "description", "") or "MCP 工具")[:80],
                    icon="Plug",
                    status="connected",
                    kind="mcp",
                )
            )
    except Exception:  # noqa: BLE001
        pass

    # 连接失败的 server 也展示出来
    try:
        for name, st in (await probe_status()).items():
            if st == "error":
                result.append(
                    ToolInfo(
                        id=f"mcp-server:{name}",
                        name=name,
                        description="MCP Server 连接失败",
                        icon="Plug",
                        status="error",
                        kind="mcp",
                    )
                )
    except Exception:  # noqa: BLE001
        pass

    return result
