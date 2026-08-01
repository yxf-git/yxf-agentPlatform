# 办公智能体可交互原型 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个精致的前端可交互原型，用Mock数据模拟办公智能体的完整用户交互流程，包括Chat对话、技能系统、技能市场、MCP工具管理等。

**Architecture:** Vue 3 + Vite 纯前端应用，所有数据使用Mock。对话消息用预设脚本模拟AI打字机效果。三栏布局组件化拆分，Vue Router管理页面路由（主界面 vs 技能市场全屏页 vs 个人中心）。Pinia做状态管理。

**Tech Stack:** Vue 3 (Composition API + `<script setup>`) / Vite / Vue Router / Pinia / TailwindCSS / markdown-it

## Global Constraints

- Vue 3.5+，使用 Composition API + `<script setup>` 语法
- TailwindCSS 做样式，不引入UI组件库，保持设计自由度
- 所有数据 Mock，不请求任何后端接口
- 中文界面
- 文件保持小而聚焦，单文件不超过 200 行

## 设计风格（参考 ElevenLabs）

参考文件：`docs/reference/elevenlabs-design.md`

**色彩体系 — 克制、温暖、无饱和色CTA：**
- 背景底色：米白 `#f5f5f5`（canvas），浅白 `#fafafa`（canvas-soft）
- 主色/文字：暖黑 `#0c0a09`（ink），次要文字 `#4e4e4e`（body），弱化文字 `#777169`（muted）
- 主按钮：暖黑填充 `#292524`，白色文字，pill形（rounded-full）
- 次按钮：透明底 + 1px `#d6d3d1` 边框，pill形
- 分隔线：`#e7e5e4`（hairline），1px
- 卡片：纯白 `#ffffff`，1px hairline 边框，hover 时加 `0 4px 16px rgba(0,0,0,0.04)` 阴影
- 装饰色（仅用于氛围装饰，不用于按钮/文字）：mint `#a7e5d3`、peach `#f4c5a8`、lavender `#c8b8e0`、sky `#a8c8e8`、rose `#e8b8c4`
- 语义色：成功 `#16a34a`，错误 `#dc2626`

**字体：**
- 展示标题：Noto Sans SC weight 300（轻盈黑体），负letter-spacing，回退微软雅黑/苹方
- 正文/按钮/导航：Noto Sans SC weight 400/500，letter-spacing +0.15px，回退微软雅黑/苹方
- 英文/数字混排：Inter 400/500
- 用户消息气泡：暖黑底 `#0c0a09` + 白色文字
- AI消息气泡：白底 + 1px hairline 边框

**圆角体系：**
- 按钮/徽章：pill 形 `rounded-full`
- 卡片：`rounded-xl`（16px）
- 表单输入：`rounded-lg`（8px）

**间距：**
- 基础单位 4px
- section间距 96px（市场页等大模块之间）
- 卡片间距 16-24px
- 整体留白充足，追求杂志感呼吸感

---

## 文件结构

```
src/
├── App.vue                         # 根组件，路由出口
├── main.js                         # 入口，挂载 app/router/pinia
├── router/
│   └── index.js                    # 路由配置
├── stores/
│   ├── chat.js                     # 对话状态管理
│   ├── skill.js                    # 技能状态管理
│   └── user.js                     # 用户状态管理
├── mock/
│   ├── conversations.js            # 预设对话数据
│   ├── skills.js                   # 预设技能数据
│   ├── tools.js                    # MCP工具数据
│   └── simulate.js                 # 模拟AI回复逻辑（打字机效果）
├── components/
│   ├── layout/
│   │   ├── AppLayout.vue           # 三栏主布局
│   │   ├── LeftSidebar.vue         # 左栏：对话列表
│   │   └── RightToolbar.vue        # 右栏：工具栏容器 + subtab切换
│   ├── chat/
│   │   ├── ChatView.vue            # 中栏：对话主区域
│   │   ├── MessageList.vue         # 消息列表
│   │   ├── MessageBubble.vue       # 单条消息气泡（用户/AI）
│   │   ├── ChatInput.vue           # 输入框 + 附件按钮
│   │   ├── ToolCallBlock.vue       # 工具调用展示块（联网搜索/沙箱等）
│   │   └── CodeSandbox.vue         # 沙箱代码执行结果展示
│   ├── skill/
│   │   ├── SkillPanel.vue          # 右栏"技能"tab：我的技能列表
│   │   ├── SkillCard.vue           # 技能卡片（市场用）
│   │   ├── SkillForm.vue           # 技能输入表单（使用技能时弹出）
│   │   └── SkillCreator.vue        # 创建技能表单
│   ├── market/
│   │   ├── MarketPanel.vue         # 右栏"市场"tab：缩略展示
│   │   └── MarketFullPage.vue      # 技能市场全屏页
│   ├── tools/
│   │   └── ToolsPanel.vue          # 右栏"工具"tab：MCP工具列表
│   ├── docs/
│   │   └── DocsPanel.vue           # 右栏"文档"tab：当前对话文件
│   └── user/
│       ├── UserMenu.vue            # 头像下拉菜单
│       └── ProfilePage.vue         # 个人中心页
└── utils/
    └── markdown.js                 # Markdown渲染配置
```

---

## Task 1: 项目脚手架与基础配置

**Files:**
- Create: `package.json`, `vite.config.js`, `tailwind.config.js`, `postcss.config.js`, `index.html`
- Create: `src/main.js`, `src/App.vue`
- Create: `src/router/index.js`

**Interfaces:**
- Produces: 可运行的空白Vue应用，路由配置包含三个路由 `/`（主界面）、`/market`（技能市场全屏页）、`/profile`（个人中心）

- [ ] **Step 1: 初始化项目**

```bash
cd /Users/lizhiqian/Documents/国创/办公智能体
npm create vite@latest . -- --template vue
```

选择当前目录，Vue模板。如果提示目录非空，选择忽略已有文件。

- [ ] **Step 2: 安装依赖**

```bash
npm install
npm install vue-router@4 pinia markdown-it
npm install -D tailwindcss @tailwindcss/vite
```

- [ ] **Step 3: 配置 Vite + TailwindCSS**

`vite.config.js`:
```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
})
```

`src/main.css`（替换默认style.css）:
```css
@import "tailwindcss";

@theme {
  --color-canvas: #f5f5f5;
  --color-canvas-soft: #fafafa;
  --color-ink: #0c0a09;
  --color-primary: #292524;
  --color-body: #4e4e4e;
  --color-muted: #777169;
  --color-muted-soft: #a8a29e;
  --color-hairline: #e7e5e4;
  --color-hairline-strong: #d6d3d1;
  --color-surface-card: #ffffff;
  --color-surface-strong: #f0efed;
  --font-family-display: 'Noto Sans SC', 'Microsoft YaHei', 'PingFang SC', sans-serif;
  --font-family-body: 'Noto Sans SC', 'Microsoft YaHei', 'PingFang SC', 'Inter', sans-serif;
}
```

在 `index.html` 的 `<head>` 中添加 Google Fonts：
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Noto+Sans+SC:wght@300;400;500&display=swap" rel="stylesheet">
```

- [ ] **Step 4: 配置路由**

`src/router/index.js`:
```js
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('../components/layout/AppLayout.vue') },
    { path: '/market', name: 'market', component: () => import('../components/market/MarketFullPage.vue') },
    { path: '/profile', name: 'profile', component: () => import('../components/user/ProfilePage.vue') },
  ],
})

export default router
```

- [ ] **Step 5: 配置入口文件**

`src/main.js`:
```js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './main.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
```

`src/App.vue`:
```vue
<template>
  <router-view />
</template>
```

- [ ] **Step 6: 创建占位组件并验证启动**

创建 `src/components/layout/AppLayout.vue`、`src/components/market/MarketFullPage.vue`、`src/components/user/ProfilePage.vue` 三个占位组件，每个只显示页面名称。

```bash
npm run dev
```

验证：浏览器访问 `http://localhost:5173`，能看到页面名称。切换路由 `/market`、`/profile` 都能正常显示。

- [ ] **Step 7: Commit**

```bash
git init
git add .
git commit -m "feat: 项目脚手架 — Vue 3 + Vite + TailwindCSS + Router + Pinia"
```

---

## Task 2: Mock数据层

**Files:**
- Create: `src/mock/conversations.js`
- Create: `src/mock/skills.js`
- Create: `src/mock/tools.js`
- Create: `src/mock/simulate.js`

**Interfaces:**
- Produces: `mockConversations` 对话列表数组、`mockSkills` 技能列表数组、`mockTools` 工具列表数组、`simulateReply(userMessage)` 模拟AI回复函数

- [ ] **Step 1: 创建对话Mock数据**

`src/mock/conversations.js`:
```js
export const mockConversations = [
  {
    id: '1',
    title: '帮我写一份周报',
    pinned: true,
    updatedAt: '2026-07-30 14:30',
    messages: [
      { id: 'm1', role: 'user', content: '帮我写一份本周的工作周报，我这周主要做了以下事情：\n1. 完成了智能家电控制协议的v2版本设计\n2. 参加了与海尔团队的技术对接会\n3. 修复了芯片测试平台的3个bug' },
      { id: 'm2', role: 'assistant', content: '# 工作周报\n\n**报告人：** 张三  \n**日期：** 2026年7月27日 — 7月30日\n\n---\n\n## 本周工作完成情况\n\n### 1. 智能家电控制协议 V2 版本设计\n- 完成了控制协议 V2 版本的整体架构设计\n- 新增了多设备联动控制、低功耗通信模式等核心特性\n- 输出设计文档并完成内部评审\n\n### 2. 海尔团队技术对接\n- 参加与海尔技术团队的对接会议\n- 就协议兼容性和数据格式标准达成一致\n- 明确了下一步联调计划和时间节点\n\n### 3. 芯片测试平台维护\n- 修复了测试平台中 3 个已知 Bug\n- 提升了测试流程的稳定性\n\n## 下周工作计划\n- 启动控制协议 V2 的原型开发\n- 准备海尔联调环境\n- 继续优化测试平台', toolCalls: [] },
    ],
  },
  {
    id: '2',
    title: '竞品分析：智能音箱市场',
    pinned: false,
    updatedAt: '2026-07-29 10:15',
    messages: [
      { id: 'm3', role: 'user', content: '帮我分析一下2026年国内智能音箱市场的主要竞品情况' },
      { id: 'm4', role: 'assistant', content: '正在为您搜索最新的智能音箱市场数据...', toolCalls: [{ type: 'web_search', query: '2026年中国智能音箱市场份额 竞品分析', status: 'done', sources: ['艾瑞咨询', 'IDC中国'] }] },
      { id: 'm5', role: 'assistant', content: '## 2026年国内智能音箱市场竞品分析\n\n### 市场格局\n\n| 品牌 | 市场份额 | 核心产品 | 差异化优势 |\n|------|---------|---------|----------|\n| 小米 | 28.5% | 小爱音箱 Pro 2 | 全屋智能生态链 |\n| 百度 | 22.1% | 小度添添 | 屏幕交互+AI能力 |\n| 天猫精灵 | 18.3% | 天猫精灵 X6 | 电商+生活服务 |\n| 华为 | 15.7% | Sound X 2 | HarmonyOS生态 |\n| 其他 | 15.4% | — | — |\n\n### 关键趋势\n1. **大模型集成成标配** — 各品牌均接入自研大模型\n2. **屏幕化趋势** — 带屏音箱占比升至62%\n3. **全屋智能入口** — 从单品转向中控定位', toolCalls: [] },
    ],
  },
  {
    id: '3',
    title: '分析销售数据',
    pinned: false,
    updatedAt: '2026-07-28 16:45',
    messages: [
      { id: 'm6', role: 'user', content: '帮我分析一下这份Q2的销售数据，看看有什么趋势', attachments: [{ name: 'Q2销售数据.xlsx', size: '245KB' }] },
      { id: 'm7', role: 'assistant', content: '我来分析这份Q2销售数据。先用代码处理一下...', toolCalls: [{ type: 'sandbox', language: 'python', code: 'import pandas as pd\n\ndf = pd.read_excel("Q2销售数据.xlsx")\nprint(f"数据行数: {len(df)}")\nprint(f"列: {list(df.columns)}")\nprint(df.describe())', status: 'done', output: '数据行数: 1260\n列: [日期, 产品线, 区域, 销售额, 销量]\n...' }] },
      { id: 'm8', role: 'assistant', content: '## Q2 销售数据分析\n\n### 整体表现\n- Q2 总销售额：**2,380万元**，环比增长 **12.5%**\n- 总销量：**15,600台**，环比增长 **8.2%**\n\n### 按产品线\n| 产品线 | 销售额 | 环比 |\n|-------|--------|-----|\n| 智能面板 | 980万 | +18% |\n| 传感器 | 720万 | +15% |\n| 控制模组 | 680万 | +3% |\n\n### 关键发现\n1. 智能面板增速最快，主要受新楼盘精装修需求拉动\n2. 华东区域贡献了 45% 的销售额\n3. 6月份出现明显增长拐点，建议关注', toolCalls: [] },
    ],
  },
]

export function getConversation(id) {
  return mockConversations.find(c => c.id === id)
}
```

- [ ] **Step 2: 创建技能Mock数据**

`src/mock/skills.js`:
```js
export const mockSkills = [
  {
    id: 's1',
    name: '周报助手',
    icon: '📝',
    description: '输入本周工作内容，自动生成规范周报',
    category: '写作',
    author: '张三',
    usageCount: 832,
    isFavorite: true,
    systemPrompt: '你是一个专业的周报撰写助手...',
    fields: [
      { key: 'work_items', label: '本周完成的工作', type: 'textarea', placeholder: '请列出本周主要完成的工作...' },
      { key: 'next_plan', label: '下周计划', type: 'textarea', placeholder: '请列出下周计划...' },
      { key: 'issues', label: '遇到的问题（选填）', type: 'textarea', placeholder: '如有需要协调的问题请填写', required: false },
    ],
    tools: [],
  },
  {
    id: 's2',
    name: '竞品分析',
    icon: '📊',
    description: '输入竞品名称，生成结构化分析报告',
    category: '分析',
    author: '李四',
    usageCount: 567,
    isFavorite: true,
    systemPrompt: '你是一个市场分析专家...',
    fields: [
      { key: 'competitors', label: '竞品名称', type: 'text', placeholder: '请输入竞品名称，多个用逗号分隔' },
      { key: 'focus', label: '分析维度', type: 'select', options: ['市场份额', '产品功能', '技术路线', '综合分析'] },
    ],
    tools: ['web_search'],
  },
  {
    id: 's3',
    name: '英文邮件润色',
    icon: '✉️',
    description: '粘贴中文邮件，翻译并润色为商务英文',
    category: '翻译',
    author: '王五',
    usageCount: 445,
    isFavorite: false,
    systemPrompt: '你是一个商务英文邮件专家...',
    fields: [
      { key: 'content', label: '中文邮件内容', type: 'textarea', placeholder: '请粘贴中文邮件内容...' },
      { key: 'tone', label: '语气', type: 'select', options: ['正式', '半正式', '友好'] },
    ],
    tools: [],
  },
  {
    id: 's4',
    name: '数据可视化',
    icon: '📈',
    description: '上传数据文件，自动生成图表和分析',
    category: '数据处理',
    author: '赵六',
    usageCount: 312,
    isFavorite: true,
    systemPrompt: '你是一个数据分析和可视化专家...',
    fields: [
      { key: 'file', label: '数据文件', type: 'file', accept: '.xlsx,.csv' },
      { key: 'chart_type', label: '图表类型', type: 'select', options: ['自动推荐', '柱状图', '折线图', '饼图', '散点图'] },
    ],
    tools: ['sandbox'],
  },
  {
    id: 's5',
    name: '会议纪要',
    icon: '🎙️',
    description: '输入会议要点，生成结构化会议纪要',
    category: '写作',
    author: '张三',
    usageCount: 289,
    isFavorite: false,
    systemPrompt: '你是一个会议纪要整理专家...',
    fields: [
      { key: 'topic', label: '会议主题', type: 'text', placeholder: '请输入会议主题' },
      { key: 'attendees', label: '参会人员', type: 'text', placeholder: '请输入参会人员' },
      { key: 'content', label: '会议要点', type: 'textarea', placeholder: '请输入会议讨论的要点...' },
      { key: 'decisions', label: '决议事项（选填）', type: 'textarea', required: false },
    ],
    tools: [],
  },
  {
    id: 's6',
    name: '技术方案撰写',
    icon: '🛠️',
    description: '输入需求描述，生成技术方案文档框架',
    category: '写作',
    author: '李四',
    usageCount: 198,
    isFavorite: false,
    systemPrompt: '你是一个资深技术架构师...',
    fields: [
      { key: 'requirement', label: '需求描述', type: 'textarea', placeholder: '请描述技术需求...' },
      { key: 'constraints', label: '技术约束（选填）', type: 'textarea', required: false },
    ],
    tools: ['web_search'],
  },
]

export const skillCategories = ['全部', '写作', '分析', '翻译', '数据处理', '办公']
```

- [ ] **Step 3: 创建工具Mock数据**

`src/mock/tools.js`:
```js
export const mockTools = [
  { id: 't1', name: '联网搜索', icon: '🔍', description: '搜索互联网获取最新信息', status: 'active' },
  { id: 't2', name: '文档解析', icon: '📄', description: '解析PDF、Word、Excel、PPT文件', status: 'active' },
  { id: 't3', name: '沙箱执行', icon: '⚡', description: '执行Python/JS代码并返回结果', status: 'active' },
  { id: 't4', name: '图片生成', icon: '🖼️', description: '根据描述生成图片', status: 'inactive' },
  { id: 't5', name: '实验室管理系统', icon: '🧪', description: '查询实验数据和设备状态', status: 'active' },
]
```

- [ ] **Step 4: 创建模拟AI回复逻辑**

`src/mock/simulate.js`:
```js
const replies = {
  default: '好的，我来帮您处理这个问题。\n\n根据您的描述，我有以下几点建议：\n\n1. **首先**，我们需要明确目标和范围\n2. **其次**，梳理现有资源和约束条件\n3. **最后**，制定具体的执行方案\n\n需要我展开说明某一点吗？',
  周报: '# 工作周报\n\n**报告人：** 当前用户  \n**日期：** 2026年7月27日 — 7月30日\n\n---\n\n## 本周工作完成情况\n\n根据您提供的工作内容，已为您整理为规范的周报格式。\n\n## 下周工作计划\n\n请根据实际情况补充下周计划。',
  分析: '## 分析报告\n\n基于您提供的信息，以下是详细分析：\n\n| 维度 | 现状 | 建议 |\n|------|------|------|\n| 市场 | 增长中 | 加大投入 |\n| 技术 | 领先 | 保持优势 |\n| 运营 | 稳定 | 优化效率 |',
}

export function simulateReply(userMessage) {
  for (const [keyword, reply] of Object.entries(replies)) {
    if (keyword !== 'default' && userMessage.includes(keyword)) {
      return reply
    }
  }
  return replies.default
}

export function createTypingEffect(text, onChar) {
  return new Promise((resolve) => {
    let i = 0
    const interval = setInterval(() => {
      if (i < text.length) {
        onChar(text.slice(0, i + 1))
        i++
      } else {
        clearInterval(interval)
        resolve()
      }
    }, 20)
  })
}
```

- [ ] **Step 5: Commit**

```bash
git add src/mock/
git commit -m "feat: 添加Mock数据层 — 对话、技能、工具、模拟AI回复"
```

---

## Task 3: 状态管理 (Pinia Stores)

**Files:**
- Create: `src/stores/chat.js`
- Create: `src/stores/skill.js`
- Create: `src/stores/user.js`

**Interfaces:**
- Consumes: `mockConversations` from `mock/conversations.js`, `mockSkills` from `mock/skills.js`
- Produces: `useChatStore()` 提供对话CRUD和消息管理, `useSkillStore()` 提供技能管理和收藏, `useUserStore()` 提供用户信息

- [ ] **Step 1: 创建Chat Store**

`src/stores/chat.js`:
```js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { mockConversations } from '../mock/conversations'
import { simulateReply, createTypingEffect } from '../mock/simulate'

export const useChatStore = defineStore('chat', () => {
  const conversations = ref([...mockConversations])
  const activeId = ref('1')
  const isReplying = ref(false)

  const activeConversation = computed(() =>
    conversations.value.find(c => c.id === activeId.value)
  )

  const sortedConversations = computed(() =>
    [...conversations.value].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return new Date(b.updatedAt) - new Date(a.updatedAt)
    })
  )

  function setActive(id) {
    activeId.value = id
  }

  function createConversation() {
    const newConv = {
      id: String(Date.now()),
      title: '新对话',
      pinned: false,
      updatedAt: new Date().toLocaleString('zh-CN'),
      messages: [],
    }
    conversations.value.unshift(newConv)
    activeId.value = newConv.id
  }

  function deleteConversation(id) {
    conversations.value = conversations.value.filter(c => c.id !== id)
    if (activeId.value === id && conversations.value.length > 0) {
      activeId.value = conversations.value[0].id
    }
  }

  function togglePin(id) {
    const conv = conversations.value.find(c => c.id === id)
    if (conv) conv.pinned = !conv.pinned
  }

  function renameConversation(id, title) {
    const conv = conversations.value.find(c => c.id === id)
    if (conv) conv.title = title
  }

  async function sendMessage(content, attachments = []) {
    const conv = activeConversation.value
    if (!conv) return

    const userMsg = {
      id: String(Date.now()),
      role: 'user',
      content,
      attachments: attachments.length > 0 ? attachments : undefined,
    }
    conv.messages.push(userMsg)

    if (conv.title === '新对话') {
      conv.title = content.slice(0, 20) + (content.length > 20 ? '...' : '')
    }

    isReplying.value = true
    const aiMsg = { id: String(Date.now() + 1), role: 'assistant', content: '', toolCalls: [] }
    conv.messages.push(aiMsg)

    const fullReply = simulateReply(content)
    await createTypingEffect(fullReply, (partial) => {
      aiMsg.content = partial
    })

    conv.updatedAt = new Date().toLocaleString('zh-CN')
    isReplying.value = false
  }

  return {
    conversations, activeId, isReplying,
    activeConversation, sortedConversations,
    setActive, createConversation, deleteConversation,
    togglePin, renameConversation, sendMessage,
  }
})
```

- [ ] **Step 2: 创建Skill Store**

`src/stores/skill.js`:
```js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { mockSkills, skillCategories } from '../mock/skills'

export const useSkillStore = defineStore('skill', () => {
  const skills = ref([...mockSkills])
  const categories = ref(skillCategories)
  const activeCategory = ref('全部')
  const searchQuery = ref('')

  const favoriteSkills = computed(() =>
    skills.value.filter(s => s.isFavorite)
  )

  const filteredSkills = computed(() => {
    let result = skills.value
    if (activeCategory.value !== '全部') {
      result = result.filter(s => s.category === activeCategory.value)
    }
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
      )
    }
    return result
  })

  function toggleFavorite(id) {
    const skill = skills.value.find(s => s.id === id)
    if (skill) skill.isFavorite = !skill.isFavorite
  }

  function setCategory(cat) {
    activeCategory.value = cat
  }

  function setSearch(query) {
    searchQuery.value = query
  }

  function createSkill(skillData) {
    const newSkill = {
      id: String(Date.now()),
      ...skillData,
      author: '当前用户',
      usageCount: 0,
      isFavorite: false,
    }
    skills.value.push(newSkill)
    return newSkill
  }

  return {
    skills, categories, activeCategory, searchQuery,
    favoriteSkills, filteredSkills,
    toggleFavorite, setCategory, setSearch, createSkill,
  }
})
```

- [ ] **Step 3: 创建User Store**

`src/stores/user.js`:
```js
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  const user = ref({
    id: 'u1',
    name: '张三',
    avatar: '',
    department: '技术研发部',
  })

  return { user }
})
```

- [ ] **Step 4: Commit**

```bash
git add src/stores/
git commit -m "feat: 添加Pinia状态管理 — chat/skill/user stores"
```

---

## Task 4: 三栏主布局

**Files:**
- Create: `src/components/layout/AppLayout.vue`
- Create: `src/components/layout/LeftSidebar.vue`
- Create: `src/components/layout/RightToolbar.vue`

**Interfaces:**
- Consumes: `useChatStore()`, `useUserStore()`
- Produces: 三栏布局框架，左栏对话列表可交互，右栏subtab可切换，中栏为slot留给ChatView

- [ ] **Step 1: 实现AppLayout三栏布局**

`src/components/layout/AppLayout.vue`:
```vue
<script setup>
import LeftSidebar from './LeftSidebar.vue'
import RightToolbar from './RightToolbar.vue'
import ChatView from '../chat/ChatView.vue'
</script>

<template>
  <div class="h-screen flex bg-canvas font-body">
    <LeftSidebar class="w-64 shrink-0" />
    <ChatView class="flex-1 min-w-0" />
    <RightToolbar class="w-72 shrink-0" />
  </div>
</template>
```

- [ ] **Step 2: 实现LeftSidebar**

`src/components/layout/LeftSidebar.vue`:
```vue
<script setup>
import { useChatStore } from '../../stores/chat'
import { useUserStore } from '../../stores/user'
import { ref } from 'vue'

const chatStore = useChatStore()
const userStore = useUserStore()
const editingId = ref(null)
const editTitle = ref('')

function startRename(conv) {
  editingId.value = conv.id
  editTitle.value = conv.title
}

function finishRename(id) {
  if (editTitle.value.trim()) {
    chatStore.renameConversation(id, editTitle.value.trim())
  }
  editingId.value = null
}
</script>

<template>
  <div class="h-full flex flex-col border-r border-hairline bg-surface-card">
    <div class="p-4 border-b border-hairline flex items-center justify-between">
      <span class="font-display text-xl font-light tracking-tight text-ink">办公智能体</span>
      <div class="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm cursor-pointer"
           @click="$router.push('/profile')">
        {{ userStore.user.name[0] }}
      </div>
    </div>

    <button
      class="mx-4 mt-4 px-4 py-2.5 bg-primary text-white rounded-full hover:bg-ink transition text-sm font-medium tracking-wide"
      @click="chatStore.createConversation()"
    >
      + 新建对话
    </button>

    <div class="flex-1 overflow-y-auto mt-2 px-2">
      <div
        v-for="conv in chatStore.sortedConversations"
        :key="conv.id"
        class="group flex items-center px-3 py-2.5 rounded-lg cursor-pointer mb-0.5 text-sm transition"
        :class="conv.id === chatStore.activeId ? 'bg-surface-strong text-ink' : 'text-body hover:bg-canvas-soft'"
        @click="chatStore.setActive(conv.id)"
      >
        <span v-if="conv.pinned" class="mr-1 text-xs">📌</span>
        <input
          v-if="editingId === conv.id"
          v-model="editTitle"
          class="flex-1 bg-surface-card border border-hairline rounded-lg px-1 text-sm"
          @blur="finishRename(conv.id)"
          @keyup.enter="finishRename(conv.id)"
          @click.stop
          autofocus
        />
        <span v-else class="flex-1 truncate">{{ conv.title }}</span>
        <div class="hidden group-hover:flex items-center gap-1 ml-1">
          <button class="text-xs text-muted-soft hover:text-ink" @click.stop="startRename(conv)" title="重命名">✏️</button>
          <button class="text-xs text-muted-soft hover:text-ink" @click.stop="chatStore.togglePin(conv.id)" title="置顶">📌</button>
          <button class="text-xs text-muted-soft hover:text-red-500" @click.stop="chatStore.deleteConversation(conv.id)" title="删除">🗑️</button>
        </div>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 3: 实现RightToolbar**

`src/components/layout/RightToolbar.vue`:
```vue
<script setup>
import { ref } from 'vue'
import SkillPanel from '../skill/SkillPanel.vue'
import MarketPanel from '../market/MarketPanel.vue'
import ToolsPanel from '../tools/ToolsPanel.vue'
import DocsPanel from '../docs/DocsPanel.vue'

const tabs = [
  { key: 'skill', label: '技能' },
  { key: 'market', label: '市场' },
  { key: 'tools', label: '工具' },
  { key: 'docs', label: '文档' },
]
const activeTab = ref('skill')
</script>

<template>
  <div class="h-full flex flex-col border-l border-hairline bg-surface-card">
    <div class="flex border-b border-hairline">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="flex-1 py-3 text-sm font-medium transition"
        :class="activeTab === tab.key
          ? 'text-ink border-b-2 border-ink'
          : 'text-muted hover:text-body'"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="flex-1 overflow-y-auto">
      <SkillPanel v-if="activeTab === 'skill'" />
      <MarketPanel v-if="activeTab === 'market'" />
      <ToolsPanel v-if="activeTab === 'tools'" />
      <DocsPanel v-if="activeTab === 'docs'" />
    </div>
  </div>
</template>
```

- [ ] **Step 4: 创建右栏4个tab的占位组件**

分别创建 `SkillPanel.vue`、`MarketPanel.vue`、`ToolsPanel.vue`、`DocsPanel.vue` 和 `ChatView.vue` 的占位版本，显示tab名称即可。

- [ ] **Step 5: 验证布局**

```bash
npm run dev
```

验证：三栏布局正确渲染，左栏对话列表可点击切换高亮，可新建/删除/重命名/置顶对话，右栏4个subtab可切换。

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/ src/components/chat/ src/components/skill/ src/components/market/ src/components/tools/ src/components/docs/
git commit -m "feat: 三栏主布局 — 左对话列表/中Chat占位/右工具栏subtab"
```

---

## Task 5: 对话主区域 (Chat)

**Files:**
- Create: `src/components/chat/ChatView.vue`
- Create: `src/components/chat/MessageList.vue`
- Create: `src/components/chat/MessageBubble.vue`
- Create: `src/components/chat/ChatInput.vue`
- Create: `src/components/chat/ToolCallBlock.vue`
- Create: `src/components/chat/CodeSandbox.vue`
- Create: `src/utils/markdown.js`

**Interfaces:**
- Consumes: `useChatStore()` 的 `activeConversation`, `sendMessage`, `isReplying`
- Produces: 完整的Chat交互界面，包含消息渲染、打字机效果、工具调用展示、文件附件、代码沙箱结果

- [ ] **Step 1: 配置Markdown渲染**

`src/utils/markdown.js`:
```js
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
})

export function renderMarkdown(text) {
  return md.render(text)
}
```

- [ ] **Step 2: 实现ToolCallBlock**

`src/components/chat/ToolCallBlock.vue`:
```vue
<script setup>
defineProps({
  toolCall: { type: Object, required: true },
})
</script>

<template>
  <div class="my-2 rounded-lg border border-hairline bg-canvas text-sm overflow-hidden">
    <div class="flex items-center gap-2 px-3 py-2 bg-surface-strong">
      <span v-if="toolCall.type === 'web_search'">🔍</span>
      <span v-else-if="toolCall.type === 'sandbox'">⚡</span>
      <span v-else>🔧</span>
      <span class="font-medium text-ink">
        {{ toolCall.type === 'web_search' ? '联网搜索' : toolCall.type === 'sandbox' ? '代码执行' : toolCall.type }}
      </span>
      <span class="ml-auto text-xs text-green-600" v-if="toolCall.status === 'done'">✓ 完成</span>
    </div>
    <div class="px-3 py-2 text-body">
      <template v-if="toolCall.type === 'web_search'">
        <div class="text-xs text-muted">搜索：{{ toolCall.query }}</div>
        <div v-if="toolCall.sources" class="mt-1 flex gap-2">
          <span v-for="src in toolCall.sources" :key="src"
                class="text-xs px-2 py-0.5 bg-surface-strong text-ink rounded">{{ src }}</span>
        </div>
      </template>
      <template v-else-if="toolCall.type === 'sandbox'">
        <pre class="text-xs bg-gray-900 text-green-400 p-2 rounded mt-1 overflow-x-auto">{{ toolCall.code }}</pre>
        <div v-if="toolCall.output" class="mt-1 text-xs bg-surface-card border rounded p-2 font-mono">{{ toolCall.output }}</div>
      </template>
    </div>
  </div>
</template>
```

- [ ] **Step 3: 实现MessageBubble**

`src/components/chat/MessageBubble.vue`:
```vue
<script setup>
import { renderMarkdown } from '../../utils/markdown'
import ToolCallBlock from './ToolCallBlock.vue'

defineProps({
  message: { type: Object, required: true },
})
</script>

<template>
  <div class="flex gap-3 py-4" :class="message.role === 'user' ? 'flex-row-reverse' : ''">
    <div class="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-sm"
         :class="message.role === 'user' ? 'bg-primary text-white' : 'bg-surface-strong text-ink'">
      {{ message.role === 'user' ? '我' : 'AI' }}
    </div>
    <div class="max-w-[75%] min-w-0">
      <div v-if="message.attachments" class="mb-2 flex flex-wrap gap-2">
        <div v-for="file in message.attachments" :key="file.name"
             class="flex items-center gap-1 px-3 py-1.5 bg-surface-strong rounded-full text-sm text-body">
          📎 {{ file.name }} <span class="text-xs text-muted-soft">{{ file.size }}</span>
        </div>
      </div>
      <div v-if="message.toolCalls?.length" v-for="tc in message.toolCalls" :key="tc.type">
        <ToolCallBlock :tool-call="tc" />
      </div>
      <div v-if="message.content"
           class="prose prose-sm max-w-none rounded-2xl px-4 py-3"
           :class="message.role === 'user'
             ? 'bg-ink text-white prose-invert'
             : 'bg-surface-card border border-hairline'"
           v-html="message.role === 'assistant' ? renderMarkdown(message.content) : undefined">
        <template v-if="message.role === 'user'">{{ message.content }}</template>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 4: 实现MessageList**

`src/components/chat/MessageList.vue`:
```vue
<script setup>
import { ref, watch, nextTick } from 'vue'
import MessageBubble from './MessageBubble.vue'

const props = defineProps({
  messages: { type: Array, default: () => [] },
})

const listRef = ref(null)

watch(
  () => props.messages.length,
  async () => {
    await nextTick()
    if (listRef.value) {
      listRef.value.scrollTop = listRef.value.scrollHeight
    }
  },
)
</script>

<template>
  <div ref="listRef" class="flex-1 overflow-y-auto px-6">
    <div class="max-w-3xl mx-auto">
      <div v-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-muted-soft py-20">
        <div class="text-4xl mb-4">💬</div>
        <div class="text-lg">开始新的对话</div>
        <div class="text-sm mt-1">输入问题，或从右侧选择一个技能</div>
      </div>
      <MessageBubble v-for="msg in messages" :key="msg.id" :message="msg" />
    </div>
  </div>
</template>
```

- [ ] **Step 5: 实现ChatInput**

`src/components/chat/ChatInput.vue`:
```vue
<script setup>
import { ref } from 'vue'

const emit = defineEmits(['send'])
const input = ref('')
const attachments = ref([])

function handleSend() {
  if (!input.value.trim() && attachments.value.length === 0) return
  emit('send', input.value.trim(), [...attachments.value])
  input.value = ''
  attachments.value = []
}

function handleKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function handleFile(e) {
  const files = Array.from(e.target.files || [])
  for (const f of files) {
    attachments.value.push({ name: f.name, size: (f.size / 1024).toFixed(0) + 'KB' })
  }
  e.target.value = ''
}

function removeAttachment(index) {
  attachments.value.splice(index, 1)
}
</script>

<template>
  <div class="border-t border-hairline bg-surface-card px-6 py-4">
    <div class="max-w-3xl mx-auto">
      <div v-if="attachments.length" class="flex flex-wrap gap-2 mb-2">
        <div v-for="(file, i) in attachments" :key="i"
             class="flex items-center gap-1 px-2 py-1 bg-surface-strong rounded text-sm text-body">
          📎 {{ file.name }}
          <button class="text-muted-soft hover:text-red-500 ml-1" @click="removeAttachment(i)">×</button>
        </div>
      </div>
      <div class="flex items-end gap-2 bg-canvas-soft rounded-2xl border border-hairline px-4 py-3">
        <label class="cursor-pointer text-muted hover:text-ink shrink-0 pb-0.5">
          📎
          <input type="file" class="hidden" multiple @change="handleFile" />
        </label>
        <textarea
          v-model="input"
          rows="1"
          class="flex-1 bg-transparent border-none outline-none resize-none text-sm leading-6 max-h-32 font-body tracking-wide"
          placeholder="输入消息... (Shift+Enter 换行)"
          @keydown="handleKeydown"
        />
        <button
          class="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition"
          :class="input.trim() || attachments.length
            ? 'bg-primary text-white hover:bg-ink'
            : 'bg-surface-strong text-muted-soft'"
          @click="handleSend"
        >
          ↑
        </button>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 6: 组装ChatView**

`src/components/chat/ChatView.vue`:
```vue
<script setup>
import { useChatStore } from '../../stores/chat'
import MessageList from './MessageList.vue'
import ChatInput from './ChatInput.vue'

const chatStore = useChatStore()

function handleSend(content, attachments) {
  chatStore.sendMessage(content, attachments)
}
</script>

<template>
  <div class="h-full flex flex-col bg-canvas">
    <MessageList :messages="chatStore.activeConversation?.messages || []" />
    <ChatInput @send="handleSend" />
  </div>
</template>
```

- [ ] **Step 7: 验证对话功能**

```bash
npm run dev
```

验证：点击左栏对话可查看历史消息，Markdown正确渲染（表格、标题、列表），工具调用块（联网搜索、沙箱执行）正确展示，输入消息后AI有打字机效果回复，文件附件可添加/移除，空对话显示欢迎提示。

- [ ] **Step 8: Commit**

```bash
git add src/components/chat/ src/utils/
git commit -m "feat: 对话主区域 — 消息渲染/Markdown/工具调用/打字机回复/文件附件"
```

---

## Task 6: 右栏四个Tab面板

**Files:**
- Replace: `src/components/skill/SkillPanel.vue`（替换占位版本）
- Create: `src/components/skill/SkillForm.vue`
- Replace: `src/components/market/MarketPanel.vue`
- Replace: `src/components/tools/ToolsPanel.vue`
- Replace: `src/components/docs/DocsPanel.vue`

**Interfaces:**
- Consumes: `useSkillStore()`, `useChatStore()`, `mockTools`
- Produces: 四个可交互的右栏面板，技能可选择使用，市场有"查看全部"入口

- [ ] **Step 1: 实现SkillPanel**

`src/components/skill/SkillPanel.vue`:
```vue
<script setup>
import { useSkillStore } from '../../stores/skill'
import { ref } from 'vue'
import SkillForm from './SkillForm.vue'

const skillStore = useSkillStore()
const activeSkill = ref(null)

function useSkill(skill) {
  activeSkill.value = skill
}

function closeForm() {
  activeSkill.value = null
}
</script>

<template>
  <div class="p-3">
    <div class="text-xs text-muted mb-2 px-1">我的技能</div>
    <div v-for="skill in skillStore.favoriteSkills" :key="skill.id"
         class="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-canvas transition text-sm"
         @click="useSkill(skill)">
      <span>{{ skill.icon }}</span>
      <span class="flex-1 truncate">{{ skill.name }}</span>
      <button class="text-xs text-gray-300 hover:text-yellow-500" @click.stop="skillStore.toggleFavorite(skill.id)">⭐</button>
    </div>
    <div v-if="skillStore.favoriteSkills.length === 0" class="text-sm text-muted-soft text-center py-4">
      暂无收藏技能，去市场看看
    </div>

    <SkillForm v-if="activeSkill" :skill="activeSkill" @close="closeForm" />
  </div>
</template>
```

- [ ] **Step 2: 实现SkillForm**

`src/components/skill/SkillForm.vue`:
```vue
<script setup>
import { ref } from 'vue'
import { useChatStore } from '../../stores/chat'

const props = defineProps({
  skill: { type: Object, required: true },
})
const emit = defineEmits(['close'])
const chatStore = useChatStore()
const formData = ref({})

function handleSubmit() {
  const content = Object.entries(formData.value)
    .filter(([, v]) => v)
    .map(([k, v]) => {
      const field = props.skill.fields.find(f => f.key === k)
      return `**${field?.label || k}：** ${v}`
    })
    .join('\n\n')

  chatStore.sendMessage(`[使用技能：${props.skill.name}]\n\n${content}`)
  emit('close')
}
</script>

<template>
  <div class="fixed inset-0 bg-black/30 flex items-center justify-center z-50" @click.self="emit('close')">
    <div class="bg-surface-card rounded-xl shadow-xl w-[480px] max-h-[80vh] overflow-y-auto">
      <div class="flex items-center justify-between px-5 py-4 border-b border-hairline">
        <div class="flex items-center gap-2">
          <span class="text-xl">{{ skill.icon }}</span>
          <span class="font-medium">{{ skill.name }}</span>
        </div>
        <button class="text-muted-soft hover:text-body" @click="emit('close')">✕</button>
      </div>

      <div class="px-5 py-4 space-y-4">
        <div v-for="field in skill.fields" :key="field.key">
          <label class="block text-sm font-medium text-ink mb-1">
            {{ field.label }}
            <span v-if="field.required === false" class="text-xs text-muted-soft ml-1">选填</span>
          </label>
          <textarea v-if="field.type === 'textarea'"
                    v-model="formData[field.key]"
                    class="w-full border border-hairline rounded-lg px-3 py-2 text-sm resize-none"
                    rows="3" :placeholder="field.placeholder" />
          <input v-else-if="field.type === 'text'"
                 v-model="formData[field.key]"
                 class="w-full border border-hairline rounded-lg px-3 py-2 text-sm"
                 :placeholder="field.placeholder" />
          <select v-else-if="field.type === 'select'"
                  v-model="formData[field.key]"
                  class="w-full border border-hairline rounded-lg px-3 py-2 text-sm">
            <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
          </select>
          <input v-else-if="field.type === 'file'" type="file" :accept="field.accept"
                 class="w-full text-sm text-muted" />
        </div>
      </div>

      <div class="px-5 py-4 border-t border-hairline flex justify-end gap-2">
        <button class="px-4 py-2 text-sm text-body hover:bg-surface-strong rounded-lg" @click="emit('close')">取消</button>
        <button class="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-ink" @click="handleSubmit">使用技能</button>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 3: 实现MarketPanel**

`src/components/market/MarketPanel.vue`:
```vue
<script setup>
import { useSkillStore } from '../../stores/skill'
import { useRouter } from 'vue-router'

const skillStore = useSkillStore()
const router = useRouter()
</script>

<template>
  <div class="p-3">
    <div class="text-xs text-muted mb-2 px-1">技能推荐</div>
    <div v-for="skill in skillStore.skills.slice(0, 4)" :key="skill.id"
         class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-canvas transition text-sm cursor-pointer">
      <span>{{ skill.icon }}</span>
      <div class="flex-1 min-w-0">
        <div class="truncate">{{ skill.name }}</div>
        <div class="text-xs text-muted-soft truncate">{{ skill.description }}</div>
      </div>
    </div>
    <button
      class="w-full mt-3 py-2 text-sm text-ink hover:bg-surface-strong rounded-lg transition"
      @click="router.push('/market')"
    >
      查看全部 →
    </button>
  </div>
</template>
```

- [ ] **Step 4: 实现ToolsPanel**

`src/components/tools/ToolsPanel.vue`:
```vue
<script setup>
import { mockTools } from '../../mock/tools'
</script>

<template>
  <div class="p-3">
    <div class="text-xs text-muted mb-2 px-1">可用工具</div>
    <div v-for="tool in mockTools" :key="tool.id"
         class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm">
      <span class="text-lg">{{ tool.icon }}</span>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span>{{ tool.name }}</span>
          <span class="w-1.5 h-1.5 rounded-full"
                :class="tool.status === 'active' ? 'bg-green-400' : 'bg-gray-300'" />
        </div>
        <div class="text-xs text-muted-soft truncate">{{ tool.description }}</div>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 5: 实现DocsPanel**

`src/components/docs/DocsPanel.vue`:
```vue
<script setup>
import { useChatStore } from '../../stores/chat'
import { computed } from 'vue'

const chatStore = useChatStore()

const currentDocs = computed(() => {
  const msgs = chatStore.activeConversation?.messages || []
  return msgs.flatMap(m => m.attachments || [])
})
</script>

<template>
  <div class="p-3">
    <div class="text-xs text-muted mb-2 px-1">当前对话文档</div>
    <div v-if="currentDocs.length === 0" class="text-sm text-muted-soft text-center py-4">
      当前对话暂无文档
    </div>
    <div v-for="doc in currentDocs" :key="doc.name"
         class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-canvas text-sm">
      <span>📄</span>
      <span class="flex-1 truncate">{{ doc.name }}</span>
      <span class="text-xs text-muted-soft">{{ doc.size }}</span>
    </div>
  </div>
</template>
```

- [ ] **Step 6: 验证右栏四个tab**

```bash
npm run dev
```

验证：技能tab显示收藏的技能，点击弹出表单弹窗，填写后提交能在对话中显示。市场tab显示部分技能和"查看全部"按钮。工具tab显示MCP工具列表和状态。文档tab显示当前对话的附件。

- [ ] **Step 7: Commit**

```bash
git add src/components/skill/ src/components/market/ src/components/tools/ src/components/docs/
git commit -m "feat: 右栏四个Tab面板 — 技能/市场/工具/文档"
```

---

## Task 7: 技能市场全屏页

**Files:**
- Replace: `src/components/market/MarketFullPage.vue`
- Create: `src/components/skill/SkillCard.vue`
- Create: `src/components/skill/SkillCreator.vue`

**Interfaces:**
- Consumes: `useSkillStore()` 的 `filteredSkills`, `categories`, `setCategory`, `setSearch`, `toggleFavorite`, `createSkill`
- Produces: 完整的技能市场全屏浏览页，含搜索、分类筛选、技能卡片、创建技能弹窗

- [ ] **Step 1: 实现SkillCard**

`src/components/skill/SkillCard.vue`:
```vue
<script setup>
import { useSkillStore } from '../../stores/skill'

const props = defineProps({
  skill: { type: Object, required: true },
})

const skillStore = useSkillStore()
</script>

<template>
  <div class="bg-surface-card border border-hairline rounded-xl p-5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition cursor-pointer flex flex-col">
    <div class="flex items-center gap-2 mb-2">
      <span class="text-2xl">{{ skill.icon }}</span>
      <span class="font-medium text-ink">{{ skill.name }}</span>
    </div>
    <p class="text-sm text-body flex-1 mb-3 line-clamp-2 tracking-wide">{{ skill.description }}</p>
    <div class="flex items-center justify-between text-xs text-muted">
      <span>{{ skill.author }} 创建</span>
      <div class="flex items-center gap-3">
        <span>调用 {{ skill.usageCount }}</span>
        <button class="hover:text-ink transition" @click.stop="skillStore.toggleFavorite(skill.id)">
          {{ skill.isFavorite ? '⭐' : '☆' }}
        </button>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: 实现SkillCreator**

`src/components/skill/SkillCreator.vue`:
```vue
<script setup>
import { ref } from 'vue'
import { useSkillStore } from '../../stores/skill'

const emit = defineEmits(['close'])
const skillStore = useSkillStore()

const form = ref({
  name: '',
  icon: '🔧',
  description: '',
  category: '办公',
  systemPrompt: '',
  fields: [{ key: 'input', label: '输入内容', type: 'textarea', placeholder: '' }],
})

const icons = ['📝', '📊', '✉️', '📈', '🎙️', '🛠️', '🔍', '💡', '📋', '🧮']

function addField() {
  form.value.fields.push({ key: `field_${Date.now()}`, label: '', type: 'text', placeholder: '' })
}

function removeField(index) {
  form.value.fields.splice(index, 1)
}

function handleCreate() {
  if (!form.value.name || !form.value.systemPrompt) return
  skillStore.createSkill({ ...form.value, tools: [] })
  emit('close')
}
</script>

<template>
  <div class="fixed inset-0 bg-black/30 flex items-center justify-center z-50" @click.self="emit('close')">
    <div class="bg-surface-card rounded-xl shadow-xl w-[560px] max-h-[85vh] overflow-y-auto">
      <div class="flex items-center justify-between px-5 py-4 border-b border-hairline">
        <span class="font-medium">创建技能</span>
        <button class="text-muted-soft hover:text-body" @click="emit('close')">✕</button>
      </div>

      <div class="px-5 py-4 space-y-4">
        <div>
          <label class="block text-sm font-medium text-ink mb-1">图标</label>
          <div class="flex gap-2 flex-wrap">
            <button v-for="icon in icons" :key="icon"
                    class="w-9 h-9 rounded-lg border text-lg flex items-center justify-center transition"
                    :class="form.icon === icon ? 'border-ink bg-surface-strong' : 'border-hairline hover:border-hairline-strong'"
                    @click="form.icon = icon">{{ icon }}</button>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-ink mb-1">技能名称</label>
          <input v-model="form.name" class="w-full border border-hairline rounded-lg px-3 py-2 text-sm" placeholder="例如：周报助手" />
        </div>

        <div>
          <label class="block text-sm font-medium text-ink mb-1">简介</label>
          <input v-model="form.description" class="w-full border border-hairline rounded-lg px-3 py-2 text-sm" placeholder="一句话介绍技能的用途" />
        </div>

        <div>
          <label class="block text-sm font-medium text-ink mb-1">分类</label>
          <select v-model="form.category" class="w-full border border-hairline rounded-lg px-3 py-2 text-sm">
            <option v-for="cat in ['写作', '分析', '翻译', '数据处理', '办公']" :key="cat">{{ cat }}</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-ink mb-1">系统提示词</label>
          <textarea v-model="form.systemPrompt" rows="4"
                    class="w-full border border-hairline rounded-lg px-3 py-2 text-sm resize-none"
                    placeholder="定义AI的角色和行为，例如：你是一个专业的周报撰写助手..." />
        </div>

        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="text-sm font-medium text-ink">输入字段</label>
            <button class="text-xs text-ink hover:text-ink" @click="addField">+ 添加字段</button>
          </div>
          <div v-for="(field, i) in form.fields" :key="i" class="flex gap-2 mb-2">
            <input v-model="field.label" class="flex-1 border border-hairline rounded-lg px-2 py-1.5 text-sm" placeholder="字段名称" />
            <select v-model="field.type" class="border border-hairline rounded-lg px-2 py-1.5 text-sm">
              <option value="text">文本</option>
              <option value="textarea">多行文本</option>
              <option value="select">下拉选择</option>
              <option value="file">文件上传</option>
            </select>
            <button v-if="form.fields.length > 1" class="text-muted-soft hover:text-red-500 text-sm" @click="removeField(i)">✕</button>
          </div>
        </div>
      </div>

      <div class="px-5 py-4 border-t border-hairline flex justify-end gap-2">
        <button class="px-4 py-2 text-sm text-body hover:bg-surface-strong rounded-lg" @click="emit('close')">取消</button>
        <button class="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-ink" @click="handleCreate">创建并发布</button>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 3: 实现MarketFullPage**

`src/components/market/MarketFullPage.vue`:
```vue
<script setup>
import { useSkillStore } from '../../stores/skill'
import { useRouter } from 'vue-router'
import { ref } from 'vue'
import SkillCard from '../skill/SkillCard.vue'
import SkillCreator from '../skill/SkillCreator.vue'
import SkillForm from '../skill/SkillForm.vue'

const skillStore = useSkillStore()
const router = useRouter()
const showCreator = ref(false)
const selectedSkill = ref(null)
</script>

<template>
  <div class="h-screen flex flex-col bg-canvas">
    <div class="bg-surface-card border-b border-hairline px-6 py-4 flex items-center justify-between">
      <button class="text-sm text-muted hover:text-ink flex items-center gap-1" @click="router.push('/')">
        ← 返回对话
      </button>
      <span class="font-display text-xl font-light tracking-tight text-ink">技能市场</span>
      <button class="px-5 py-2.5 text-sm bg-primary text-white rounded-full hover:bg-ink transition font-medium" @click="showCreator = true">
        创建技能
      </button>
    </div>

    <div class="px-6 py-4 bg-surface-card border-b border-hairline">
      <div class="max-w-4xl mx-auto flex items-center gap-4">
        <div class="relative flex-1">
          <input
            :value="skillStore.searchQuery"
            @input="skillStore.setSearch($event.target.value)"
            class="w-full border border-hairline-strong rounded-lg pl-9 pr-3 py-2 text-sm focus:border-ink focus:border-2 transition"
            placeholder="搜索技能..."
          />
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">🔍</span>
        </div>
        <div class="flex gap-2">
          <button
            v-for="cat in skillStore.categories"
            :key="cat"
            class="px-3 py-1 text-sm rounded-full transition"
            :class="skillStore.activeCategory === cat
              ? 'bg-primary text-white'
              : 'bg-surface-strong text-body hover:bg-hairline'"
            @click="skillStore.setCategory(cat)"
          >
            {{ cat }}
          </button>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto px-6 py-6">
      <div class="max-w-4xl mx-auto grid grid-cols-3 gap-4">
        <SkillCard
          v-for="skill in skillStore.filteredSkills"
          :key="skill.id"
          :skill="skill"
          @click="selectedSkill = skill"
        />
      </div>
      <div v-if="skillStore.filteredSkills.length === 0" class="text-center text-muted-soft py-12">
        没有找到匹配的技能
      </div>
    </div>

    <SkillCreator v-if="showCreator" @close="showCreator = false" />
    <SkillForm v-if="selectedSkill" :skill="selectedSkill" @close="selectedSkill = null" />
  </div>
</template>
```

- [ ] **Step 4: 验证技能市场**

```bash
npm run dev
```

验证：从右栏点"查看全部"跳转到全屏市场页，搜索和分类筛选正常工作，卡片一排三张，点击卡片弹出使用表单，"创建技能"弹窗可填写并发布新技能，"返回对话"可回到主界面。收藏/取消收藏正常工作。

- [ ] **Step 5: Commit**

```bash
git add src/components/market/ src/components/skill/
git commit -m "feat: 技能市场全屏页 — 搜索/筛选/卡片/创建技能"
```

---

## Task 8: 个人中心页

**Files:**
- Replace: `src/components/user/ProfilePage.vue`
- Create: `src/components/user/UserMenu.vue`

**Interfaces:**
- Consumes: `useUserStore()`, `useSkillStore()`, `useChatStore()`
- Produces: 个人中心页面和头像下拉菜单

- [ ] **Step 1: 实现ProfilePage**

`src/components/user/ProfilePage.vue`:
```vue
<script setup>
import { useRouter } from 'vue-router'
import { useUserStore } from '../../stores/user'
import { useSkillStore } from '../../stores/skill'
import { useChatStore } from '../../stores/chat'
import { computed } from 'vue'

const router = useRouter()
const userStore = useUserStore()
const skillStore = useSkillStore()
const chatStore = useChatStore()

const mySkills = computed(() =>
  skillStore.skills.filter(s => s.author === userStore.user.name)
)
const favoriteSkills = computed(() => skillStore.favoriteSkills)

const tabs = ['我创建的技能', '我收藏的技能', '对话记录', '基础设置']
const activeTab = ref('我创建的技能')

import { ref } from 'vue'
</script>

<template>
  <div class="h-screen flex flex-col bg-canvas">
    <div class="bg-surface-card border-b border-hairline px-6 py-4 flex items-center justify-between">
      <button class="text-sm text-muted hover:text-ink" @click="router.push('/')">← 返回对话</button>
      <span class="font-semibold text-ink">个人中心</span>
      <div class="w-16" />
    </div>

    <div class="flex-1 overflow-y-auto px-6 py-6">
      <div class="max-w-3xl mx-auto">
        <div class="bg-surface-card rounded-xl p-6 mb-6 flex items-center gap-4">
          <div class="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center text-2xl">
            {{ userStore.user.name[0] }}
          </div>
          <div>
            <div class="text-lg font-medium">{{ userStore.user.name }}</div>
            <div class="text-sm text-muted">{{ userStore.user.department }}</div>
          </div>
        </div>

        <div class="flex gap-1 mb-4">
          <button v-for="tab in tabs" :key="tab"
                  class="px-4 py-2 text-sm rounded-lg transition"
                  :class="activeTab === tab ? 'bg-primary text-white' : 'text-body hover:bg-surface-strong'"
                  @click="activeTab = tab">{{ tab }}</button>
        </div>

        <div v-if="activeTab === '我创建的技能'" class="space-y-3">
          <div v-for="skill in mySkills" :key="skill.id"
               class="bg-surface-card rounded-xl p-4 flex items-center gap-3">
            <span class="text-xl">{{ skill.icon }}</span>
            <div class="flex-1">
              <div class="font-medium">{{ skill.name }}</div>
              <div class="text-sm text-muted">{{ skill.description }}</div>
            </div>
            <div class="text-sm text-muted-soft">调用 {{ skill.usageCount }}</div>
          </div>
          <div v-if="mySkills.length === 0" class="text-center text-muted-soft py-8">暂无创建的技能</div>
        </div>

        <div v-if="activeTab === '我收藏的技能'" class="space-y-3">
          <div v-for="skill in favoriteSkills" :key="skill.id"
               class="bg-surface-card rounded-xl p-4 flex items-center gap-3">
            <span class="text-xl">{{ skill.icon }}</span>
            <div class="flex-1">
              <div class="font-medium">{{ skill.name }}</div>
              <div class="text-sm text-muted">{{ skill.description }}</div>
            </div>
            <button class="text-sm text-muted-soft hover:text-red-500" @click="skillStore.toggleFavorite(skill.id)">取消收藏</button>
          </div>
        </div>

        <div v-if="activeTab === '对话记录'" class="space-y-2">
          <div v-for="conv in chatStore.conversations" :key="conv.id"
               class="bg-surface-card rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:shadow-sm transition"
               @click="chatStore.setActive(conv.id); router.push('/')">
            <div class="flex-1">
              <div class="font-medium">{{ conv.title }}</div>
              <div class="text-xs text-muted-soft">{{ conv.updatedAt }} · {{ conv.messages.length }} 条消息</div>
            </div>
          </div>
        </div>

        <div v-if="activeTab === '基础设置'" class="bg-surface-card rounded-xl p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-ink mb-1">昵称</label>
            <input v-model="userStore.user.name" class="w-full border border-hairline rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-ink mb-1">部门</label>
            <input v-model="userStore.user.department" class="w-full border border-hairline rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: 验证个人中心**

```bash
npm run dev
```

验证：点击左上角头像进入个人中心，四个tab正常切换。我创建的技能/收藏的技能正确展示，对话记录点击可跳回对话页，基础设置可编辑。

- [ ] **Step 3: Commit**

```bash
git add src/components/user/
git commit -m "feat: 个人中心页 — 技能管理/收藏/对话记录/设置"
```

---

## Task 9: 收尾打磨

**Files:**
- Modify: 各组件的样式细节
- Modify: `src/components/layout/AppLayout.vue` — 右栏折叠功能

**Interfaces:**
- Consumes: 所有已有组件
- Produces: 右栏可折叠、响应式适配、整体视觉统一

- [ ] **Step 1: 添加右栏折叠功能**

修改 `AppLayout.vue`，给右栏加一个折叠按钮：

```vue
<script setup>
import { ref } from 'vue'
import LeftSidebar from './LeftSidebar.vue'
import RightToolbar from './RightToolbar.vue'
import ChatView from '../chat/ChatView.vue'

const rightCollapsed = ref(false)
</script>

<template>
  <div class="h-screen flex bg-canvas">
    <LeftSidebar class="w-64 shrink-0" />
    <div class="flex-1 min-w-0 relative">
      <ChatView />
      <button
        class="absolute top-3 right-3 w-8 h-8 rounded-full bg-surface-card border border-hairline shadow-sm flex items-center justify-center text-muted-soft hover:text-body z-10"
        @click="rightCollapsed = !rightCollapsed"
      >
        {{ rightCollapsed ? '◀' : '▶' }}
      </button>
    </div>
    <RightToolbar v-show="!rightCollapsed" class="w-72 shrink-0" />
  </div>
</template>
```

- [ ] **Step 2: 验证完整流程**

```bash
npm run dev
```

完整验证清单：
1. 左栏：新建对话、切换对话、重命名、置顶、删除
2. 中栏：查看历史消息、发送消息有打字机回复、文件附件、Markdown渲染、工具调用块
3. 右栏：四个subtab切换、技能点击弹出表单、市场跳转全屏页、工具列表、文档列表
4. 技能市场：搜索、分类筛选、卡片展示、创建技能、收藏
5. 个人中心：查看技能、收藏管理、对话记录、基础设置
6. 右栏折叠/展开

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: 收尾打磨 — 右栏折叠/视觉统一/完整交互流程"
```
