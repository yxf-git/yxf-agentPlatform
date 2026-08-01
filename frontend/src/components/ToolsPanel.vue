<script setup lang="ts">
import { ref, onMounted, computed } from "vue"
import {
  RefreshCw,
  FileText,
  FileCode,
  Save,
  FolderOpen,
  Globe,
  Terminal,
  Search,
  Sparkles,
  Plug,
} from "lucide-vue-next"
import { fetchTools, type ApiTool } from "@/lib/api"

const tools = ref<ApiTool[]>([])
const error = ref<string | null>(null)

const iconMap: Record<string, unknown> = {
  FileText,
  FileCode,
  FloppyDisk: Save,
  FolderOpen,
  Globe,
  Terminal,
  MagnifyingGlass: Search,
  Sparkles,
  Plug,
}

const statusMap = {
  connected: { label: "已连接", color: "bg-emerald-500" },
  disconnected: { label: "未启用", color: "bg-stone-300" },
  error: { label: "异常", color: "bg-red-500" },
}

const builtin = computed(() => tools.value.filter((t) => t.kind === "builtin"))
const mcp = computed(() => tools.value.filter((t) => t.kind === "mcp"))

async function refresh() {
  error.value = null
  try {
    tools.value = await fetchTools()
  } catch (e) {
    error.value = e instanceof Error ? e.message : "加载失败，请确认后端已启动"
  }
}

onMounted(refresh)
</script>

<template>
  <div class="flex h-full flex-col overflow-y-auto p-4">
    <div class="mb-3 flex items-center justify-between">
      <h3 class="text-xs font-medium uppercase tracking-wider text-stone-500">
        内置工具
      </h3>
      <button class="text-stone-400 hover:text-stone-800" @click="refresh">
        <RefreshCw :size="14" />
      </button>
    </div>

    <p v-if="error" class="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-500">
      {{ error }}
    </p>

    <div class="space-y-0.5">
      <div
        v-for="tool in builtin"
        :key="tool.id"
        class="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-stone-50"
      >
        <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-100">
          <component :is="iconMap[tool.icon] ?? Plug" :size="18" class="text-stone-700" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-medium text-stone-800">{{ tool.name }}</span>
          <span class="block truncate text-xs text-stone-500">{{ tool.description }}</span>
        </span>
        <span class="flex shrink-0 items-center gap-1.5">
          <span class="h-2 w-2 rounded-full" :class="statusMap[tool.status].color" />
          <span class="text-xs text-stone-400">{{ statusMap[tool.status].label }}</span>
        </span>
      </div>
    </div>

    <template v-if="mcp.length">
      <h3 class="mb-2 mt-5 text-xs font-medium uppercase tracking-wider text-stone-500">
        MCP 工具
      </h3>
      <div class="space-y-0.5">
        <div
          v-for="tool in mcp"
          :key="tool.id"
          class="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-stone-50"
        >
          <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-100">
            <Plug :size="18" class="text-stone-700" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-medium text-stone-800">{{ tool.name }}</span>
            <span class="block truncate text-xs text-stone-500">{{ tool.description }}</span>
          </span>
          <span class="flex shrink-0 items-center gap-1.5">
            <span class="h-2 w-2 rounded-full" :class="statusMap[tool.status].color" />
            <span class="text-xs text-stone-400">{{ statusMap[tool.status].label }}</span>
          </span>
        </div>
      </div>
    </template>
  </div>
</template>
