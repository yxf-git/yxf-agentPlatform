<script setup lang="ts">
import { computed } from "vue"
import MarkdownIt from "markdown-it"
import { Zap } from "lucide-vue-next"
import type { Message } from "@/types"
import ReasoningTrace from "@/components/ReasoningTrace.vue"

const props = defineProps<{ message: Message; streaming?: boolean }>()

const md = new MarkdownIt({ html: false, linkify: true, breaks: true })

const isUser = computed(() => props.message.role === "user")
const rendered = computed(() => md.render(props.message.content || ""))
const showTyping = computed(
  () =>
    props.streaming &&
    !props.message.content &&
    (props.message.steps?.length ?? 0) === 0
)
</script>

<template>
  <!-- 用户消息：右对齐浅灰气泡 -->
  <div v-if="isUser" class="flex justify-end py-3">
    <div
      class="max-w-[80%] whitespace-pre-wrap rounded-3xl bg-stone-100 px-4 py-2.5 text-[15px] leading-relaxed text-stone-800"
    >
      {{ message.content }}
    </div>
  </div>

  <!-- 助手消息：小头像 + 全宽文本，无气泡 -->
  <div v-else class="flex gap-3 py-3">
    <div
      class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black text-[11px] font-semibold text-white"
    >
      飞
    </div>

    <div class="min-w-0 flex-1 pt-0.5">
      <!-- 已应用技能 -->
      <div
        v-if="message.skills && message.skills.length"
        class="mb-2 flex flex-wrap gap-1.5"
      >
        <span
          v-for="name in message.skills"
          :key="name"
          class="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600"
        >
          <Zap :size="11" class="text-[color:var(--color-accent)]" />
          {{ name }}
        </span>
      </div>

      <!-- ReAct 思考过程 -->
      <ReasoningTrace
        v-if="message.steps && message.steps.length"
        :steps="message.steps"
        :live="streaming"
      />

      <!-- 打字指示器 -->
      <div v-if="showTyping" class="flex items-center gap-1 py-1">
        <span
          v-for="i in 3"
          :key="i"
          class="h-2 w-2 animate-bounce rounded-full bg-stone-300"
          :style="{ animationDelay: `${(i - 1) * 0.15}s` }"
        />
      </div>

      <!-- 内容 -->
      <div v-else-if="message.content" class="prose-chat" v-html="rendered" />
    </div>
  </div>
</template>
