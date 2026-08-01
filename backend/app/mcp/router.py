from __future__ import annotations

from fastapi import APIRouter

from ..schemas import ApiResult, McpConfig, McpServerConfig
from . import manager

router = APIRouter(prefix="/api/mcp", tags=["mcp"])


@router.get("/config")
def get_config() -> McpConfig:
    return manager.load_config()


@router.put("/config")
def set_config(cfg: McpConfig) -> McpConfig:
    manager.save_config(cfg)
    return cfg


@router.put("/servers/{name}")
def upsert_server(name: str, srv: McpServerConfig) -> McpConfig:
    return manager.upsert_server(name, srv)


@router.delete("/servers/{name}")
def delete_server(name: str) -> McpConfig:
    return manager.delete_server(name)


@router.get("/status")
async def status() -> ApiResult:
    return ApiResult(ok=True, data=await manager.probe_status())
