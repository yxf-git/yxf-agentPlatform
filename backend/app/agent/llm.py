from __future__ import annotations

from langchain_openai import ChatOpenAI

from ..config import settings

# 供应商 → 兼容接口地址
PROVIDER_BASE_URL = {
    "deepseek": "https://api.deepseek.com/v1",
    "kimi": "https://api.moonshot.cn/v1",
}

# 模型 → 供应商
MODEL_PROVIDER = {
    # DeepSeek
    "deepseek-chat": "deepseek",
    "deepseek-reasoner": "deepseek",
    # Kimi / Moonshot
    "moonshot-v1-8k": "kimi",
    "moonshot-v1-32k": "kimi",
    "moonshot-v1-128k": "kimi",
    "kimi-k2-0711-preview": "kimi",
    "kimi-latest": "kimi",
}


def _provider_of(model: str) -> str | None:
    if model in MODEL_PROVIDER:
        return MODEL_PROVIDER[model]
    if model.startswith("deepseek"):
        return "deepseek"
    if model.startswith(("moonshot", "kimi")):
        return "kimi"
    return None


def _resolve(model: str | None) -> tuple[str, str, str | None]:
    """返回 (model, api_key, base_url)。按模型名路由到 DeepSeek / Kimi，
    未识别时回退到 .env 中的通用 OPENAI_* 配置。"""
    model = model or settings.model_name
    provider = _provider_of(model)

    if provider == "deepseek":
        return model, (settings.deepseek_api_key or settings.openai_api_key), PROVIDER_BASE_URL["deepseek"]
    if provider == "kimi":
        return model, (settings.moonshot_api_key or settings.openai_api_key), PROVIDER_BASE_URL["kimi"]

    # 通用兜底（任意 OpenAI 兼容接口）
    return model, settings.openai_api_key, settings.openai_base_url


def make_llm(model: str | None = None, streaming: bool = True) -> ChatOpenAI:
    resolved_model, api_key, base_url = _resolve(model)
    return ChatOpenAI(
        model=resolved_model,
        api_key=api_key,
        base_url=base_url,
        temperature=settings.temperature,
        streaming=streaming,
    )
