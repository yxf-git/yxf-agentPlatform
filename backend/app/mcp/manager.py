from __future__ import annotations

import json
from typing import Any

from ..config import MCP_CONFIG_FILE
from ..schemas import McpConfig, McpServerConfig


def load_config() -> McpConfig:
    if not MCP_CONFIG_FILE.exists():
        return McpConfig()
    try:
        raw = json.loads(MCP_CONFIG_FILE.read_text(encoding="utf-8"))
        return McpConfig(**raw)
    except Exception:  # noqa: BLE001
        return McpConfig()


def save_config(cfg: McpConfig) -> None:
    MCP_CONFIG_FILE.write_text(
        json.dumps(cfg.model_dump(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def _to_adapter_dict(cfg: McpConfig) -> dict[str, dict[str, Any]]:
    """转换成 langchain-mcp-adapters 需要的连接字典（仅启用的 server）。"""
    result: dict[str, dict[str, Any]] = {}
    for name, srv in cfg.servers.items():
        if not srv.enabled:
            continue
        if srv.transport == "stdio":
            if not srv.command:
                continue
            result[name] = {
                "transport": "stdio",
                "command": srv.command,
                "args": srv.args,
                "env": srv.env or None,
            }
        else:
            if not srv.url:
                continue
            result[name] = {"transport": srv.transport, "url": srv.url}
    return result


async def get_mcp_tools() -> list:
    """加载所有启用的 MCP server 暴露的工具。失败时返回已成功加载的部分。"""
    cfg = load_config()
    adapter = _to_adapter_dict(cfg)
    if not adapter:
        return []
    try:
        from langchain_mcp_adapters.client import MultiServerMCPClient

        client = MultiServerMCPClient(adapter)
        return await client.get_tools()
    except Exception:  # noqa: BLE001
        return []


async def probe_status() -> dict[str, str]:
    """探测每个已启用 server 的连通状态，返回 name -> connected|error。"""
    cfg = load_config()
    status: dict[str, str] = {}
    for name, srv in cfg.servers.items():
        if not srv.enabled:
            status[name] = "disconnected"
            continue
        single = McpConfig(servers={name: srv})
        adapter = _to_adapter_dict(single)
        if not adapter:
            status[name] = "error"
            continue
        try:
            from langchain_mcp_adapters.client import MultiServerMCPClient

            client = MultiServerMCPClient(adapter)
            await client.get_tools()
            status[name] = "connected"
        except Exception:  # noqa: BLE001
            status[name] = "error"
    return status


def upsert_server(name: str, srv: McpServerConfig) -> McpConfig:
    cfg = load_config()
    cfg.servers[name] = srv
    save_config(cfg)
    return cfg


def delete_server(name: str) -> McpConfig:
    cfg = load_config()
    cfg.servers.pop(name, None)
    save_config(cfg)
    return cfg
