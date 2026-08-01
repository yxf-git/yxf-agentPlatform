# 办公智能体 · 后端

基于 **FastAPI + LangGraph** 的通用智能体后端。LangGraph 负责 ReAct 主循环与工具编排，LangChain 提供模型、工具与 MCP 适配。

## 能力

- **通用 Agent（ReAct）**：思考 → 调用工具 → 观察 → 再思考 → 最终回答，全过程以 SSE 流式推送给前端展示。
- **内置工具**：读文件、写文件、浏览目录、网页抓取（curl）、执行系统命令、联网搜索。
- **技能（SKILL.md 规范）**：每个技能是 `data/skills/<id>/` 目录，含 `SKILL.md`（YAML frontmatter 元数据 + 指令正文）及可选 `references/ scripts/ assets/ templates/`。用户在前端选中候选技能，模型据其 name+description 判断使用哪个，并调用 `load_skill` 读取完整指令后执行。支持一句话生成、上传技能包（`.zip` 整个技能目录，或单个 `.md`）。
- **MCP**：可配置多个 MCP Server（stdio / streamable_http / sse），运行时动态加载其工具。
- **模型**：任意 OpenAI 兼容接口（OpenAI / DeepSeek / 通义千问兼容模式 / Moonshot / 本地 vLLM…）。

## 快速开始

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env   # 然后编辑 .env 填入 OPENAI_API_KEY
.\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000 --reload
```

或直接运行 `.\run.ps1`（会自动建环境、装依赖、生成 .env）。

## 模型供应商（DeepSeek / Kimi）

后端会根据前端所选**模型名**自动路由到对应供应商，无需手动切 base_url：

| 模型名 | 供应商 | 接口 |
|--------|--------|------|
| `deepseek-chat` / `deepseek-reasoner` | DeepSeek | `https://api.deepseek.com/v1` |
| `moonshot-v1-8k` / `moonshot-v1-128k` / `kimi-k2-0711-preview` … | Kimi(Moonshot) | `https://api.moonshot.cn/v1` |
| 其它未识别模型 | 通用兜底 | `OPENAI_BASE_URL` |

## 配置（.env）

| 变量 | 说明 |
|------|------|
| `DEEPSEEK_API_KEY` | DeepSeek 的 Key（用 deepseek-* 模型时填） |
| `MOONSHOT_API_KEY` | Kimi/Moonshot 的 Key（用 moonshot/kimi 模型时填） |
| `MODEL_NAME` | 默认模型（前端未指定时使用） |
| `OPENAI_API_KEY` / `OPENAI_BASE_URL` | 通用兜底：任意 OpenAI 兼容接口 |
| `TAVILY_API_KEY` | 联网搜索用（可选，缺省则 web_search 不可用） |
| `ENABLE_EXEC` | 是否允许执行系统命令，默认 `true` |
| `EXEC_TIMEOUT` | 命令执行超时（秒） |

> 文件读写、命令执行默认工作目录为 `backend/data/workspace`；相对路径限定其中，绝对路径按原样处理。命令执行有安全风险，仅在可信环境开启。

## HTTP 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| POST | `/api/chat/stream` | 对话，返回 SSE 事件流 |
| GET | `/api/tools` | 工具列表（内置 + MCP） |
| GET/POST/PUT/DELETE | `/api/skills[/{id}]` | 技能增删改查 |
| POST | `/api/skills/generate` | 一句话生成技能 |
| POST | `/api/skills/import` | 上传技能包 |
| GET/PUT | `/api/mcp/config` | 读取/覆盖 MCP 配置 |
| PUT/DELETE | `/api/mcp/servers/{name}` | 增改/删除单个 MCP Server |
| GET | `/api/mcp/status` | 探测各 Server 连通状态 |

## SSE 事件协议（`/api/chat/stream`）

每条为 `data: <json>\n\n`，`json.type` 取值：

- `start` — 开始
- `skill` `{names}` — 本轮启用的技能
- `token` `{content}` — 回答/思考文本增量
- `tool_start` `{id, tool, args}` — 开始调用工具
- `tool_end` `{id, tool, result}` — 工具返回
- `error` `{message}` — 出错
- `done` — 结束

前端据此还原 ReAct 流程：工具调用前累积的文本沉淀为「思考」，最后一段作为最终回答。
