from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class ActiveSkill(BaseModel):
    """用户为本次对话选中的候选技能（只需 id/name，其余由后端 registry 解析）。"""

    id: str
    name: str = ""


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    skills: list[ActiveSkill] = Field(default_factory=list)
    web_search: bool = True
    model: Optional[str] = None


class SkillMeta(BaseModel):
    """技能元数据（来自 SKILL.md 的 frontmatter），用于技能列表。"""

    id: str = ""
    name: str
    description: str = ""
    icon: str = "Sparkles"
    category: str = "办公"
    author: str = "我"
    usageCount: int = 0
    tools: list[str] = Field(default_factory=list)


class SkillDetail(SkillMeta):
    """技能详情：元数据 + SKILL.md 正文 + 附带文件相对路径。"""

    instructions: str = ""
    files: list[str] = Field(default_factory=list)


class SkillCreate(BaseModel):
    name: str
    description: str = ""
    icon: str = "Sparkles"
    category: str = "办公"
    author: str = "我"
    tools: list[str] = Field(default_factory=list)
    instructions: str = ""


class GenerateSkillRequest(BaseModel):
    intent: str


class ToolInfo(BaseModel):
    id: str
    name: str
    description: str
    icon: str = "Plug"
    status: Literal["connected", "disconnected", "error"] = "connected"
    kind: Literal["builtin", "mcp"] = "builtin"


class McpServerConfig(BaseModel):
    """一个 MCP Server 的连接配置。

    stdio 方式：command + args；streamable_http/sse 方式：url。
    """

    transport: Literal["stdio", "streamable_http", "sse"] = "stdio"
    command: Optional[str] = None
    args: list[str] = Field(default_factory=list)
    env: dict[str, str] = Field(default_factory=dict)
    url: Optional[str] = None
    enabled: bool = True


class McpConfig(BaseModel):
    servers: dict[str, McpServerConfig] = Field(default_factory=dict)


class ApiResult(BaseModel):
    ok: bool = True
    message: str = ""
    data: Any = None
