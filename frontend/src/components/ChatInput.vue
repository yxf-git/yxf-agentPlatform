<script setup lang="ts">
import { ref, computed } from "vue"
import { ArrowUp, Globe, ChevronDown } from "lucide-vue-next"
import { useChatStore } from "@/stores/chat"

const chat = useChatStore()
const text = ref("")
const modelOpen = ref(false)

const models = [
  { label: "Kimi (8k)", value: "moonshot-v1-8k" },
  { label: "Kimi (128k)", value: "moonshot-v1-128k" },
  { label: "Kimi K2", value: "kimi-k2-0711-preview" },
  { label: "DeepSeek Chat", value: "deepseek-chat" },
  { label: "DeepSeek Reasoner", value: "deepseek-reasoner" },
]

const modelLabel = computed(
  () => models.find((m) => m.value === chat.activeModel)?.label ?? chat.activeModel
)

function send() {
  const t = text.value.trim()
  if (!t || chat.isReplying) return
  chat.sendMessage(t)
  text.value = ""
  chat.clearSkills()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}

function autoGrow(e: Event) {
  const el = e.target as HTMLTextAreaElement
  el.style.height = "auto"
  el.style.height = Math.min(el.scrollHeight, 200) + "px"
}

function pickModel(v: string) {
  chat.setModel(v)
  modelOpen.value = false
}
</script>

<template>
  <div class="px-4 pb-4">
    <div class="mx-auto max-w-3xl">
      <div
        class="rounded-[26px] border border-stone-200 bg-white px-2.5 py-2 shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-shadow focus-within:shadow-[0_2px_18px_rgba(0,0,0,0.10)]"
      >
        <textarea
          v-model="text"
          :disabled="chat.isReplying"
          rows="1"
          placeholder="给智能体发消息…"
          class="max-h-52 w-full resize-none bg-transparent px-2.5 pt-2 text-[15px] leading-relaxed outline-none placeholder:text-stone-400"
          @keydown="onKeydown"
          @input="autoGrow"
        />

        <div class="flex items-center justify-between px-1 pt-1">
          <div class="flex items-center gap-1.5">
            <button
              class="flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] transition-colors"
              :class="
                chat.webSearchEnabled
                  ? 'border-stone-800/10 bg-stone-800 text-white'
                  : 'border-stone-200 text-stone-600 hover:bg-stone-50'
              "
              @click="chat.toggleWebSearch()"
            >
              <Globe :size="15" />
              搜索
            </button>

            <div class="relative">
              <button
                class="flex h-8 items-center gap-1 rounded-full px-2.5 text-[13px] text-stone-500 hover:bg-stone-100"
                @click="modelOpen = !modelOpen"
              >
                {{ modelLabel }}
                <ChevronDown :size="13" />
              </button>
              <div
                v-if="modelOpen"
                class="absolute bottom-10 left-0 z-10 min-w-44 rounded-xl border border-stone-200 bg-white py-1 shadow-lg"
              >
                <button
                  v-for="m in models"
                  :key="m.value"
                  class="block w-full px-3 py-2 text-left text-sm hover:bg-stone-50"
                  :class="m.value === chat.activeModel ? 'font-medium text-stone-900' : 'text-stone-600'"
                  @click="pickModel(m.value)"
                >
                  {{ m.label }}
                </button>
              </div>
            </div>
          </div>

          <button
            class="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white transition-opacity hover:opacity-80 disabled:opacity-25"
            :disabled="!text.trim() || chat.isReplying"
            @click="send"
          >
            <ArrowUp :size="18" />
          </button>
        </div>
      </div>

      <p class="mt-2 text-center text-xs text-stone-400">
        智能体可能会出错，请核查重要信息。
      </p>
    </div>
  </div>
</template>
