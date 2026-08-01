# 办公智能体

面向公司全员的通用 AI 办公助手。以 Chat 为核心，通过「技能」「工具」「MCP」帮助员工高效完成任务，并在对话中实时展示智能体的**思考过程与 ReAct 流程**。

## 目录结构

```
办公智能体/
├── frontend/     # 前端（Vue 3 + Vite + TS + Pinia + Tailwind）：聊天 / 技能 / 工具 / MCP
├── backend/      # 后端（FastAPI + LangGraph）：通用 Agent、工具、技能存储、MCP、SSE 流式接口
├── docs/         # 产品设计与方案文档
└── screenshots/  # 截图
```

## 快速开始

### 1. 后端

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env      # 编辑 .env：填 DEEPSEEK_API_KEY 或 MOONSHOT_API_KEY
.\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
```

后端默认 http://127.0.0.1:8000 。详见 [backend/README.md](backend/README.md)。

### 2. 前端

```powershell
cd frontend
npm install
npm run dev
```

前端默认 http://localhost:5173 。

> Windows 若提示 `npm.ps1` 被执行策略拦截，用 `npm.cmd`，或执行 `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`。

## 模型

在聊天输入框左下角切换模型，后端按模型名自动路由：

- **DeepSeek**：`deepseek-chat` / `deepseek-reasoner` → 填 `DEEPSEEK_API_KEY`
- **Kimi (Moonshot)**：`moonshot-v1-8k` / `moonshot-v1-128k` / `kimi-k2-0711-preview` → 填 `MOONSHOT_API_KEY`

## 能力

- **对话**：多轮、流式，逐步展示「思考 → 调用工具 → 观察 → 再思考 → 回答」的 ReAct 全过程。
- **工具**：读写文件、浏览目录、网页抓取(curl)、执行系统命令、联网搜索。
- **技能**：本地存储，可一句话生成、上传技能包（.json/.zip），对话中一键启用。
- **MCP**：右侧「MCP」页可视化配置 MCP Server（stdio / streamable_http / sse），运行时动态加载其工具。

## 前端界面

三栏布局：左侧对话列表，中间聊天区（含 ReAct 思考过程折叠面板），右侧工具栏三个页签 **技能 / 工具 / MCP**。前端使用 Vue 3 组合式 API，状态管理用 **Pinia**（`src/stores/chat.ts`、`src/stores/skills.ts`）。
