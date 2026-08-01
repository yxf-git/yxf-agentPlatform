from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .chat.router import router as chat_router
from .config import settings
from .mcp.router import router as mcp_router
from .skills.router import router as skills_router
from .tools.router import router as tools_router

app = FastAPI(title="办公智能体 后端", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)
app.include_router(skills_router)
app.include_router(mcp_router)
app.include_router(tools_router)


@app.get("/api/health")
def health() -> dict:
    return {
        "ok": True,
        "model": settings.model_name,
        "providers": {
            "deepseek": bool(settings.deepseek_api_key),
            "kimi": bool(settings.moonshot_api_key),
        },
        "exec_enabled": settings.enable_exec,
        "web_search": bool(settings.tavily_api_key),
    }


def main() -> None:
    import uvicorn

    uvicorn.run(app, host=settings.host, port=settings.port)


if __name__ == "__main__":
    main()
