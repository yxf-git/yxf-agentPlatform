import { ChatAnthropic } from "@langchain/anthropic"
import { ChatOpenAI } from "@langchain/openai"
import type { BaseChatModel } from "@langchain/core/language_models/chat_models"
import { getSettings, type ApiProviderKind } from "./config"

const PROVIDER_BASE_URL: Record<string, string> = {
  deepseek: "https://api.deepseek.com/v1",
  kimi: "https://api.moonshot.cn/v1",
}

const MODEL_PROVIDER: Record<string, string> = {
  "deepseek-chat": "deepseek",
  "deepseek-reasoner": "deepseek",
  "moonshot-v1-8k": "kimi",
  "moonshot-v1-32k": "kimi",
  "moonshot-v1-128k": "kimi",
  "kimi-k2-0711-preview": "kimi",
  "kimi-latest": "kimi",
}

function builtinProviderOf(model: string): string | null {
  if (model in MODEL_PROVIDER) return MODEL_PROVIDER[model]
  if (model.startsWith("deepseek")) return "deepseek"
  if (model.startsWith("moonshot") || model.startsWith("kimi")) return "kimi"
  return null
}

function looksLikeClaude(model: string): boolean {
  const m = model.toLowerCase()
  return m.includes("claude") || m.startsWith("anthropic")
}

function resolveChannel(model: string, preferred: ApiProviderKind): ApiProviderKind {
  // 预设 DeepSeek/Kimi 始终走 OpenAI 兼容官方地址
  if (builtinProviderOf(model)) return "openai_compatible"
  if (preferred === "anthropic" || looksLikeClaude(model)) return "anthropic"
  return "openai_compatible"
}

export function makeLlm(model?: string, streaming = true): BaseChatModel {
  const s = getSettings()
  const resolvedModel = model || s.modelName
  const builtin = builtinProviderOf(resolvedModel)
  const channel = resolveChannel(resolvedModel, s.apiProvider)

  if (channel === "anthropic") {
    return new ChatAnthropic({
      model: resolvedModel,
      apiKey: s.anthropicApiKey || s.openaiApiKey || "sk-none",
      temperature: s.temperature,
      streaming,
      anthropicApiUrl: s.anthropicBaseUrl?.replace(/\/+$/, "") || undefined,
    })
  }

  let apiKey = s.openaiApiKey || "sk-none"
  let baseURL = s.openaiBaseUrl || undefined

  if (builtin === "deepseek") {
    apiKey = s.deepseekApiKey || s.openaiApiKey || "sk-none"
    baseURL = PROVIDER_BASE_URL.deepseek
  } else if (builtin === "kimi") {
    apiKey = s.moonshotApiKey || s.openaiApiKey || "sk-none"
    baseURL = PROVIDER_BASE_URL.kimi
  }

  return new ChatOpenAI({
    model: resolvedModel,
    apiKey,
    temperature: s.temperature,
    streaming,
    configuration: baseURL ? { baseURL } : undefined,
  })
}
