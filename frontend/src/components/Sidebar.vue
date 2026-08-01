<script setup lang="ts">
import { PenSquare, MessageSquare, Trash2 } from "lucide-vue-next"
import { useChatStore } from "@/stores/chat"

const chat = useChatStore()
</script>

<template>
  <aside class="flex h-full w-[260px] flex-col bg-[#f9f9f9]">
    <div class="flex items-center justify-between px-3 py-3">
      <div class="flex items-center gap-2 px-1">
        <div class="flex h-7 w-7 items-center justify-center rounded-full bg-black text-white text-xs font-semibold">
          智
        </div>
        <span class="text-sm font-semibold text-stone-800">办公智能体</span>
      </div>
    </div>

    <div class="px-2">
      <button
        class="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-sm font-medium text-stone-800 transition-colors hover:bg-stone-200/60"
        @click="chat.createConversation()"
      >
        <PenSquare :size="17" />
        新建对话
      </button>
    </div>

    <div class="mt-2 px-4 pb-1 pt-2">
      <span class="text-xs font-medium text-stone-400">对话</span>
    </div>

    <nav class="flex-1 overflow-y-auto px-2 pb-3">
      <button
        v-for="conv in chat.conversations"
        :key="conv.id"
        class="group mb-0.5 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors"
        :class="
          conv.id === chat.activeId
            ? 'bg-stone-200/70 text-stone-900'
            : 'text-stone-600 hover:bg-stone-200/40'
        "
        @click="chat.setActive(conv.id)"
      >
        <MessageSquare :size="15" class="shrink-0 text-stone-400" />
        <span class="flex-1 truncate text-sm">{{ conv.title }}</span>
        <span
          class="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
          @click.stop="chat.deleteConversation(conv.id)"
        >
          <Trash2 :size="14" class="text-stone-400 hover:text-red-500" />
        </span>
      </button>
    </nav>
  </aside>
</template>
