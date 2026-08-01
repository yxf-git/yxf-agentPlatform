<script setup lang="ts">
import { ref, watch } from "vue"
import { X, Loader2, FolderOpen } from "lucide-vue-next"
import {
  fetchSettings,
  saveSettings,
  pickDirectory,
  type AppSettings,
  type ApiProviderKind,
} from "@/lib/api"

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: "close"): void }>()

type Tab = "model" | "search" | "workspace"

const presetModels = [
  { label: "Kimi (8k)", value: "moonshot-v1-8k" },
  { label: "Kimi (128k)", value: "moonshot-v1-128k" },
  { label: "Kimi K2", value: "kimi-k2-0711-preview" },
  { label: "DeepSeek Chat", value: "deepseek-chat" },
  { label: "DeepSeek Reasoner", value: "deepseek-reasoner" },
]

const tab = ref<Tab>("model")
const form = ref<AppSettings | null>(null)
const loading = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    form.value = await fetchSettings()
  } finally {
    loading.value = false
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      tab.value = "model"
      void load()
    }
  }
)

async function save() {
  if (!form.value) return
  saving.value = true
  error.value = null
  try {
    // 不把只读解析字段写回
    const {
      resolvedSkillsDir: _s,
      resolvedWorkspaceDir: _w,
      installDir: _i,
      ...patch
    } = form.value
    await saveSettings(patch)
    emit("close")
  } catch (e) {
    error.value = e instanceof Error ? e.message : "保存失败"
  } finally {
    saving.value = false
  }
}

async function browseWorkspace() {
  if (!form.value) return
  const picked = await pickDirectory(
    form.value.workspaceDir || form.value.resolvedWorkspaceDir || form.value.installDir
  )
  if (picked) form.value.workspaceDir = picked
}

async function browseSkills() {
  if (!form.value) return
  const picked = await pickDirectory(
    form.value.skillsDir || form.value.resolvedSkillsDir || form.value.installDir
  )
  if (picked) form.value.skillsDir = picked
}

function setProvider(p: ApiProviderKind) {
  if (form.value) form.value.apiProvider = p
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      @click.self="emit('close')"
    >
      <div class="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div class="flex items-center justify-between border-b border-stone-100 px-5 py-3.5">
          <h2 class="text-base font-semibold text-stone-800">设置</h2>
          <button class="rounded-lg p-1 text-stone-400 hover:bg-stone-100" @click="emit('close')">
            <X :size="18" />
          </button>
        </div>

        <div class="flex gap-1 border-b border-stone-100 px-4 pt-2">
          <button
            v-for="t in [
              { id: 'model', label: '模型配置' },
              { id: 'search', label: '搜索配置' },
              { id: 'workspace', label: '工作区 / 技能' },
            ] as const"
            :key="t.id"
            class="rounded-t-lg px-3 py-2 text-sm transition-colors"
            :class="
              tab === t.id
                ? 'border-b-2 border-stone-800 font-medium text-stone-900'
                : 'text-stone-500 hover:text-stone-800'
            "
            @click="tab = t.id"
          >
            {{ t.label }}
          </button>
        </div>

        <div v-if="loading || !form" class="flex items-center justify-center py-16 text-stone-400">
          <Loader2 :size="20" class="animate-spin" />
        </div>

        <div v-else class="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <!-- 模型 -->
          <template v-if="tab === 'model'">
            <section class="space-y-3">
              <h3 class="text-xs font-semibold uppercase tracking-wide text-stone-400">快捷厂商</h3>
              <label class="block">
                <span class="text-sm text-stone-600">DeepSeek API Key</span>
                <input
                  v-model="form.deepseekApiKey"
                  type="password"
                  placeholder="sk-..."
                  class="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
                />
              </label>
              <label class="block">
                <span class="text-sm text-stone-600">Moonshot (Kimi) API Key</span>
                <input
                  v-model="form.moonshotApiKey"
                  type="password"
                  placeholder="sk-..."
                  class="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
                />
              </label>
            </section>

            <section class="space-y-3">
              <h3 class="text-xs font-semibold uppercase tracking-wide text-stone-400">通用 API</h3>
              <p class="text-xs text-stone-500">
                用于各厂家自己封装的接口。未命中 DeepSeek/Kimi 预设模型名时走此处。
              </p>
              <div class="flex gap-2">
                <button
                  type="button"
                  class="rounded-lg border px-3 py-1.5 text-sm"
                  :class="
                    form.apiProvider === 'openai_compatible'
                      ? 'border-stone-800 bg-stone-800 text-white'
                      : 'border-stone-200 text-stone-600'
                  "
                  @click="setProvider('openai_compatible')"
                >
                  OpenAI 兼容
                </button>
                <button
                  type="button"
                  class="rounded-lg border px-3 py-1.5 text-sm"
                  :class="
                    form.apiProvider === 'anthropic'
                      ? 'border-stone-800 bg-stone-800 text-white'
                      : 'border-stone-200 text-stone-600'
                  "
                  @click="setProvider('anthropic')"
                >
                  Claude 兼容
                </button>
              </div>

              <template v-if="form.apiProvider === 'openai_compatible'">
                <label class="block">
                  <span class="text-sm text-stone-600">Base URL</span>
                  <input
                    v-model="form.openaiBaseUrl"
                    type="text"
                    placeholder="https://api.openai.com/v1"
                    class="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
                  />
                </label>
                <label class="block">
                  <span class="text-sm text-stone-600">API Key</span>
                  <input
                    v-model="form.openaiApiKey"
                    type="password"
                    placeholder="sk-..."
                    class="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
                  />
                </label>
              </template>
              <template v-else>
                <label class="block">
                  <span class="text-sm text-stone-600">Anthropic Base URL（可选，中转时填写）</span>
                  <input
                    v-model="form.anthropicBaseUrl"
                    type="text"
                    placeholder="https://api.anthropic.com"
                    class="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
                  />
                </label>
                <label class="block">
                  <span class="text-sm text-stone-600">Anthropic API Key</span>
                  <input
                    v-model="form.anthropicApiKey"
                    type="password"
                    placeholder="sk-ant-..."
                    class="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
                  />
                </label>
              </template>
            </section>

            <section class="space-y-3">
              <h3 class="text-xs font-semibold uppercase tracking-wide text-stone-400">默认模型</h3>
              <label class="block">
                <span class="text-sm text-stone-600">模型名（可选手选或手填）</span>
                <input
                  v-model="form.modelName"
                  type="text"
                  list="model-presets"
                  placeholder="deepseek-chat / gpt-4o / claude-sonnet-4-..."
                  class="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
                />
                <datalist id="model-presets">
                  <option v-for="m in presetModels" :key="m.value" :value="m.value">
                    {{ m.label }}
                  </option>
                </datalist>
              </label>
              <label class="block">
                <span class="text-sm text-stone-600">温度</span>
                <input
                  v-model.number="form.temperature"
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  class="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
                />
              </label>
            </section>
          </template>

          <!-- 搜索 -->
          <template v-else-if="tab === 'search'">
            <section class="space-y-3">
              <h3 class="text-xs font-semibold uppercase tracking-wide text-stone-400">联网搜索</h3>
              <label class="block">
                <span class="text-sm text-stone-600">Tavily API Key</span>
                <input
                  v-model="form.tavilyApiKey"
                  type="password"
                  placeholder="tvly-..."
                  class="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
                />
              </label>
              <p class="text-xs text-stone-500">
                未配置时，「联网搜索」工具不可用；文档类能力建议通过 MCP 扩展。
              </p>
            </section>
          </template>

          <!-- 工作区 / 技能 -->
          <template v-else>
            <section class="space-y-3">
              <h3 class="text-xs font-semibold uppercase tracking-wide text-stone-400">工作区</h3>
              <p class="text-xs text-stone-500">
                小飞侠只能在该目录内读写文件、执行命令。留空则默认：安装目录\workspace
              </p>
              <div class="flex gap-2">
                <input
                  v-model="form.workspaceDir"
                  type="text"
                  :placeholder="form.resolvedWorkspaceDir || '安装目录/workspace'"
                  class="min-w-0 flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
                />
                <button
                  type="button"
                  class="flex shrink-0 items-center gap-1 rounded-lg border border-stone-200 px-3 text-sm text-stone-600 hover:bg-stone-50"
                  @click="browseWorkspace"
                >
                  <FolderOpen :size="15" /> 浏览
                </button>
              </div>
              <p v-if="form.resolvedWorkspaceDir" class="truncate text-xs text-stone-400" :title="form.resolvedWorkspaceDir">
                当前生效：{{ form.resolvedWorkspaceDir }}
              </p>
            </section>

            <section class="space-y-3">
              <h3 class="text-xs font-semibold uppercase tracking-wide text-stone-400">技能目录</h3>
              <p class="text-xs text-stone-500">
                上传/市场下载的技能存放于此。留空则默认：安装目录\skills
              </p>
              <div class="flex gap-2">
                <input
                  v-model="form.skillsDir"
                  type="text"
                  :placeholder="form.resolvedSkillsDir || '安装目录/skills'"
                  class="min-w-0 flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
                />
                <button
                  type="button"
                  class="flex shrink-0 items-center gap-1 rounded-lg border border-stone-200 px-3 text-sm text-stone-600 hover:bg-stone-50"
                  @click="browseSkills"
                >
                  <FolderOpen :size="15" /> 浏览
                </button>
              </div>
              <p v-if="form.resolvedSkillsDir" class="truncate text-xs text-stone-400" :title="form.resolvedSkillsDir">
                当前生效：{{ form.resolvedSkillsDir }}
              </p>
              <p v-if="form.installDir" class="truncate text-xs text-stone-400" :title="form.installDir">
                安装目录：{{ form.installDir }}
              </p>
            </section>

            <section class="space-y-3">
              <h3 class="text-xs font-semibold uppercase tracking-wide text-stone-400">执行权限</h3>
              <label class="flex items-center gap-2">
                <input v-model="form.enableExec" type="checkbox" class="h-4 w-4 rounded" />
                <span class="text-sm text-stone-600">允许在工作区内执行命令 / 运行代码</span>
              </label>
              <label class="block">
                <span class="text-sm text-stone-600">命令超时（秒）</span>
                <input
                  v-model.number="form.execTimeout"
                  type="number"
                  min="1"
                  class="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
                />
              </label>
            </section>
          </template>
        </div>

        <div class="flex items-center justify-end gap-2 border-t border-stone-100 px-5 py-3">
          <span v-if="error" class="mr-auto truncate text-sm text-red-500" :title="error">
            {{ error }}
          </span>
          <button
            class="rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
            @click="emit('close')"
          >
            取消
          </button>
          <button
            class="flex items-center gap-1.5 rounded-lg bg-black px-4 py-1.5 text-sm text-white hover:opacity-80 disabled:opacity-40"
            :disabled="saving || !form"
            @click="save"
          >
            <Loader2 v-if="saving" :size="15" class="animate-spin" />
            保存
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
