<script setup lang="ts">
import { ref, watch, nextTick, computed } from "vue"
import { useChatStore } from "@/stores/chat"
import MessageBubble from "@/components/MessageBubble.vue"

const chat = useChatStore()
const scroller = ref<HTMLElement | null>(null)

const messages = computed(() => chat.activeConversation?.messages ?? [])
const lastContent = computed(() => {
  const m = messages.value[messages.value.length - 1]
  return (m?.content ?? "") + (m?.steps?.length ?? 0)
})

watch([() => messages.value.length, lastContent], async () => {
  await nextTick()
  const el = scroller.value
  if (el) el.scrollTop = el.scrollHeight
})
</script>

<template>
  <div ref="scroller" class="flex-1 overflow-y-auto">
    <div
      v-if="messages.length === 0"
      class="flex h-full flex-col items-center justify-center gap-2 px-6 text-center"
    >
      <p class="text-2xl font-semibold text-stone-800">有什么可以帮忙的？</p>
      <p class="text-sm text-stone-400">
        输入问题，或在右侧启用技能 · 会展示完整的思考与工具调用过程
      </p>
    </div>

    <div v-else class="mx-auto max-w-3xl px-5 py-6">
      <MessageBubble
        v-for="(msg, i) in messages"
        :key="msg.id"
        :message="msg"
        :streaming="chat.isReplying && i === messages.length - 1 && msg.role === 'assistant'"
      />
    </div>
  </div>
</template>
