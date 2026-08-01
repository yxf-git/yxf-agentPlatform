<script setup lang="ts">
import { ref, computed } from "vue"
import {
  Brain,
  ChevronDown,
  Loader2,
  CheckCircle2,
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
import type { ReActStep } from "@/types"

const props = defineProps<{ steps: ReActStep[]; live?: boolean }>()

const open = ref(true)
const expandedTools = ref<Record<string, boolean>>({})

const toolCount = computed(
  () => props.steps.filter((s) => s.kind === "tool").length
)

const toolMeta: Record<string, { icon: unknown; label: string }> = {
  read_file: { icon: FileText, label: "读取文件" },
  write_file: { icon: Save, label: "写入文件" },
  list_dir: { icon: FolderOpen, label: "浏览目录" },
  http_fetch: { icon: Globe, label: "网页抓取" },
  run_python: { icon: FileCode, label: "运行 Python" },
  exec_command: { icon: Terminal, label: "执行命令" },
  web_search: { icon: Search, label: "联网搜索" },
  load_skill: { icon: Sparkles, label: "加载技能" },
}

function iconFor(tool: string): unknown {
  return toolMeta[tool]?.icon ?? Plug
}
function labelFor(tool: string): string {
  return toolMeta[tool]?.label ?? tool
}
function summary(args: Record<string, unknown>): string {
  const pick = (k: string) =>
    typeof args[k] === "string" ? (args[k] as string) : undefined
  const val =
    pick("query") ??
    pick("command") ??
    pick("url") ??
    pick("path") ??
    Object.values(args)
      .filter((v) => typeof v === "string")
      .join(" ")
  if (!val) return ""
  return val.length > 120 ? val.slice(0, 120) + "…" : val
}
function toggleTool(id: string) {
  expandedTools.value[id] = !expandedTools.value[id]
}
</script>

<template>
  <div class="mb-2 rounded-xl border border-stone-200 bg-stone-50/70">
    <button
      class="flex w-full items-center gap-2 px-3 py-2 text-xs text-stone-500 hover:text-stone-800"
      @click="open = !open"
    >
      <Brain :size="14" class="text-primary" />
      <span class="font-medium">
        思考过程{{ toolCount > 0 ? ` · 调用 ${toolCount} 次工具` : "" }}
      </span>
      <Loader2 v-if="live" :size="12" class="animate-spin text-primary" />
      <ChevronDown
        :size="12"
        class="ml-auto transition-transform"
        :class="open ? 'rotate-180' : ''"
      />
    </button>

    <div v-if="open" class="space-y-2 px-3 pb-3">
      <template v-for="step in steps" :key="step.id">
        <!-- 思考 -->
        <div
          v-if="step.kind === 'reasoning'"
          class="flex gap-2 text-xs leading-relaxed text-stone-600"
        >
          <Brain :size="13" class="mt-0.5 shrink-0 text-stone-400" />
          <span class="whitespace-pre-wrap">{{ step.content }}</span>
        </div>

        <!-- 工具调用 -->
        <div
          v-else
          class="rounded-lg border border-stone-200 bg-white px-2.5 py-2"
        >
          <button
            class="flex w-full items-center gap-2 text-xs"
            @click="toggleTool(step.id)"
          >
            <component :is="iconFor(step.tool)" :size="14" class="shrink-0 text-primary" />
            <span class="font-medium text-stone-800">{{ labelFor(step.tool) }}</span>
            <span v-if="summary(step.args)" class="truncate text-stone-500">
              {{ summary(step.args) }}
            </span>
            <span class="ml-auto shrink-0">
              <Loader2
                v-if="step.status === 'running'"
                :size="13"
                class="animate-spin text-primary"
              />
              <CheckCircle2 v-else :size="13" class="text-emerald-500" />
            </span>
          </button>

          <div v-if="expandedTools[step.id]" class="mt-2 space-y-1.5">
            <pre
              class="overflow-x-auto rounded bg-stone-100 px-2 py-1.5 text-[11px] leading-relaxed text-stone-600"
              >{{ JSON.stringify(step.args, null, 2) }}</pre
            >
            <pre
              v-if="step.result !== undefined"
              class="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-stone-100 px-2 py-1.5 font-mono text-[11px] leading-relaxed text-stone-600"
              >{{ step.result }}</pre
            >
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
