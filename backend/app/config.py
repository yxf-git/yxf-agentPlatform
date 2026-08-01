from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
SKILLS_DIR = DATA_DIR / "skills"
WORKSPACE_DIR = DATA_DIR / "workspace"
MCP_CONFIG_FILE = DATA_DIR / "mcp.json"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # LLM —— 按模型名自动路由到对应供应商
    deepseek_api_key: str = ""
    moonshot_api_key: str = ""  # Kimi
    # 通用兜底（任意 OpenAI 兼容接口，模型名未识别时使用）
    openai_api_key: str = "sk-none"
    openai_base_url: str | None = None
    model_name: str = "deepseek-chat"
    temperature: float = 0.3

    # tools
    tavily_api_key: str = ""
    enable_exec: bool = True
    exec_timeout: int = 60

    # server
    host: str = "127.0.0.1"
    port: int = 8000
    frontend_origin: str = "http://localhost:5173"

    def ensure_dirs(self) -> None:
        for d in (DATA_DIR, SKILLS_DIR, WORKSPACE_DIR):
            d.mkdir(parents=True, exist_ok=True)


settings = Settings()
settings.ensure_dirs()
