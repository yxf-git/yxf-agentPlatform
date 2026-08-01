<script setup lang="ts">
import { useChatStore } from "@/stores/chat"
import MessageList from "@/components/MessageList.vue"
import ChatInput from "@/components/ChatInput.vue"

const chat = useChatStore()
</script>

<template>
  <div class="flex flex-col overflow-hidden bg-white">
    <header class="flex h-14 shrink-0 items-center px-5">
      <span class="truncate text-base font-medium text-stone-800">
        {{ chat.activeConversation?.title ?? "办公智能体" }}
      </span>
    </header>

    <MessageList />
    <ChatInput />
  </div>
</template>
