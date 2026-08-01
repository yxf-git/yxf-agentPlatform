<script setup lang="ts">
import Sidebar from "@/components/Sidebar.vue"
import ChatView from "@/components/ChatView.vue"
import RightToolbar from "@/components/RightToolbar.vue"
</script>

<template>
  <div class="flex h-screen w-screen overflow-hidden bg-white text-stone-800">
    <Sidebar />
    <ChatView class="min-w-0 flex-1" />
    <RightToolbar />
  </div>
</template>
