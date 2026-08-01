<script setup lang="ts">
import { ref, onMounted } from "vue"
import { Plus, Trash2 } from "lucide-vue-next"
import {
  fetchMcpConfig,
  upsertMcpServer,
  deleteMcpServer,
  type McpConfig,
  type McpServerConfig,
} from "@/lib/api"

const config = ref<McpConfig>({ servers: {} })
const error = ref<string | null>(null)
const adding = ref(false)

const form = ref<{ name: string; argsText: string } & McpServerConfig>({
  name: "",
  argsText: "",
  transport: "stdio",
  command: "",
  args: [],
  env: {},
  url: "",
  enabled: true,
})

const transports = ["stdio", "streamable_http", "sse"] as const

async function refresh() {
  error.value = null
  try {
    config.value = await fetchMcpConfig()
  } catch (e) {
    error.value = e instanceof Error ? e.message : "加载失败，请确认后端已启动"
  }
}

onMounted(refresh)

function resetForm() {
  form.value = {
    name: "",
    argsText: "",
    transport: "stdio",
    command: "",
    args: [],
    env: {},
    url: "",
    enabled: true,
  }
}

async function save() {
  if (!form.value.name.trim()) return
  const cfg: McpServerConfig = {
    transport: form.value.transport,
    command: form.value.command || undefined,
    args: form.value.argsText ? form.value.argsText.split(/\s+/).filter(Boolean) : [],
    env: {},
    url: form.value.url || undefined,
    enabled: true,
  }
  try {
    config.value = await upsertMcpServer(form.value.name.trim(), cfg)
    resetForm()
    adding.value = false
  } catch (e) {
    error.value = e instanceof Error ? e.message : "保存失败"
  }
}

async function toggle(name: string, srv: McpServerConfig) {
  config.value = await upsertMcpServer(name, { ...srv, enabled: !srv.enabled })
}

async function remove(name: string) {
  config.value = await deleteMcpServer(name)
}
</script>

<template>
  <div class="flex h-full flex-col overflow-y-auto p-4">
    <div class="mb-3 flex items-center justify-between">
      <h3 class="text-xs font-medium uppercase tracking-wider text-stone-500">
        MCP Server 配置
      </h3>
      <button
        class="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-800"
        @click="adding = !adding"
      >
        <Plus :size="12" /> 添加
      </button>
    </div>

    <p v-if="error" class="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-500">
      {{ error }}
    </p>

    <div class="space-y-1">
      <div
        v-for="(srv, name) in config.servers"
        :key="name"
        class="flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2"
      >
        <button
          class="h-2 w-2 shrink-0 rounded-full"
          :class="srv.enabled ? 'bg-emerald-500' : 'bg-stone-300'"
          :title="srv.enabled ? '已启用（点击停用）' : '已停用（点击启用）'"
          @click="toggle(name as string, srv)"
        />
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-medium text-stone-800">{{ name }}</span>
          <span class="block truncate text-xs text-stone-500">
            {{ srv.transport === "stdio" ? `${srv.command ?? ""} ${(srv.args ?? []).join(" ")}` : srv.url }}
          </span>
        </span>
        <button class="shrink-0 text-stone-400 hover:text-red-500" @click="remove(name as string)">
          <Trash2 :size="14" />
        </button>
      </div>

      <p
        v-if="Object.keys(config.servers).length === 0 && !adding"
        class="px-1 py-2 text-xs text-stone-400"
      >
        暂无 MCP Server，点击右上角「添加」。
      </p>
    </div>

    <!-- 添加表单 -->
    <div v-if="adding" class="mt-3 space-y-2 rounded-lg border border-stone-200 bg-stone-50 p-3">
      <input
        v-model="form.name"
        placeholder="名称，如 filesystem"
        class="w-full rounded-md border border-stone-200 px-2 py-1.5 text-sm outline-none focus:border-primary"
      />
      <div class="flex gap-2">
        <button
          v-for="t in transports"
          :key="t"
          class="rounded-full px-2.5 py-1 text-xs"
          :class="form.transport === t ? 'bg-primary text-white' : 'bg-stone-200 text-stone-600'"
          @click="form.transport = t"
        >
          {{ t }}
        </button>
      </div>
      <template v-if="form.transport === 'stdio'">
        <input
          v-model="form.command"
          placeholder="command，如 npx / python"
          class="w-full rounded-md border border-stone-200 px-2 py-1.5 text-sm outline-none focus:border-primary"
        />
        <input
          v-model="form.argsText"
          placeholder="args（空格分隔），如 -y @modelcontextprotocol/server-filesystem ."
          class="w-full rounded-md border border-stone-200 px-2 py-1.5 text-sm outline-none focus:border-primary"
        />
      </template>
      <input
        v-else
        v-model="form.url"
        placeholder="url，如 http://localhost:3000/mcp"
        class="w-full rounded-md border border-stone-200 px-2 py-1.5 text-sm outline-none focus:border-primary"
      />
      <div class="flex justify-end gap-2">
        <button
          class="rounded-full border border-stone-200 px-3 py-1 text-xs text-stone-600"
          @click="adding = false"
        >
          取消
        </button>
        <button class="rounded-full bg-primary px-3 py-1 text-xs text-white" @click="save">
          保存
        </button>
      </div>
    </div>
  </div>
</template>
