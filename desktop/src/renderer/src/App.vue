<script setup lang="ts">
import { onMounted } from "vue"
import Sidebar from "@/components/Sidebar.vue"
import ChatView from "@/components/ChatView.vue"
import RightToolbar from "@/components/RightToolbar.vue"
import { useChatStore } from "@/stores/chat"

const chat = useChatStore()
onMounted(() => {
  void chat.init()
})
</script>

<template>
  <div class="flex h-screen w-screen overflow-hidden bg-white text-stone-800">
    <Sidebar />
    <ChatView class="min-w-0 flex-1" />
    <RightToolbar />
  </div>
</template>
