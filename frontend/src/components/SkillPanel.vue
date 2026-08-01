<script setup lang="ts">
import { ref, onMounted } from "vue"
import { Plus, Upload, Sparkles, Zap, Trash2, Loader2 } from "lucide-vue-next"
import { useSkillStore } from "@/stores/skills"
import { useChatStore } from "@/stores/chat"
import type { ApiSkill } from "@/lib/api"

const skillStore = useSkillStore()
const chat = useChatStore()

const fileInput = ref<HTMLInputElement | null>(null)
const showCreate = ref(false)
const intent = ref("")
const generating = ref(false)
const createError = ref<string | null>(null)

onMounted(() => skillStore.load())

function isActive(id: string) {
  return chat.activeSkills.some((s) => s.id === id)
}

function toggle(skill: ApiSkill) {
  chat.toggleSkill({ id: skill.id, name: skill.name })
}

async function onUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) await skillStore.importPackage(file)
  if (fileInput.value) fileInput.value.value = ""
}

async function generate() {
  if (!intent.value.trim()) return
  generating.value = true
  createError.value = null
  const skill = await skillStore.generateAndSave(intent.value.trim())
  generating.value = false
  if (skill) {
    intent.value = ""
    showCreate.value = false
  } else {
    createError.value = "生成失败，请确认后端已启动并配置了模型 API Key"
  }
}
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="flex items-center justify-between px-4 py-3">
      <h3 class="text-xs font-medium uppercase tracking-wider text-stone-500">
        技能
      </h3>
      <div class="flex items-center gap-3">
        <button
          class="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-800"
          @click="fileInput?.click()"
        >
          <Upload :size="12" /> 上传
        </button>
        <button
          class="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-800"
          @click="showCreate = !showCreate"
        >
          <Plus :size="12" /> 创建
        </button>
      </div>
      <input
        ref="fileInput"
        type="file"
        accept=".json,.zip"
        class="hidden"
        @change="onUpload"
      />
    </div>

    <!-- 一句话创建 -->
    <div v-if="showCreate" class="mx-3 mb-2 rounded-lg border border-stone-200 bg-stone-50 p-3">
      <div class="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-stone-800">
        <Sparkles :size="14" class="text-primary" /> 用一句话创建技能
      </div>
      <textarea
        v-model="intent"
        rows="3"
        placeholder="例如：给定网址，抓取正文并总结成三段要点"
        class="w-full resize-none rounded-md border border-stone-200 px-2 py-1.5 text-sm outline-none focus:border-primary"
      />
      <p v-if="createError" class="mt-1 text-xs text-red-500">{{ createError }}</p>
      <div class="mt-2 flex justify-end gap-2">
        <button
          class="rounded-full border border-stone-200 px-3 py-1 text-xs text-stone-600"
          @click="showCreate = false"
        >
          取消
        </button>
        <button
          class="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs text-white disabled:opacity-50"
          :disabled="!intent.trim() || generating"
          @click="generate"
        >
          <Loader2 v-if="generating" :size="12" class="animate-spin" />
          {{ generating ? "生成中…" : "生成并保存" }}
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto px-3 pb-4">
      <p v-if="skillStore.error" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-500">
        {{ skillStore.error }}
      </p>

      <div class="space-y-1">
        <div
          v-for="skill in skillStore.skills"
          :key="skill.id"
          class="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left transition-colors"
          :class="
            isActive(skill.id)
              ? 'bg-primary/10 ring-1 ring-primary/20'
              : 'hover:bg-stone-50'
          "
        >
          <button class="flex flex-1 items-center gap-2.5 overflow-hidden text-left" @click="toggle(skill)">
            <span
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              :class="isActive(skill.id) ? 'bg-primary text-white' : 'bg-stone-100 text-stone-600'"
            >
              <Zap :size="16" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-medium text-stone-800">{{ skill.name }}</span>
              <span class="block truncate text-xs text-stone-500">{{ skill.description }}</span>
            </span>
          </button>
          <button
            class="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
            @click="skillStore.remove(skill.id)"
          >
            <Trash2 :size="14" class="text-stone-400 hover:text-red-500" />
          </button>
        </div>
      </div>

      <p
        v-if="!skillStore.loading && skillStore.skills.length === 0"
        class="px-1 py-3 text-xs text-stone-400"
      >
        暂无技能，点击上方「创建」或「上传」添加。
      </p>
    </div>
  </div>
</template>
