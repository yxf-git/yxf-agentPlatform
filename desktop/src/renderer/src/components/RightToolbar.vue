<script setup lang="ts">
import { ref } from "vue"
import { Zap, Wrench, Plug } from "lucide-vue-next"
import SkillPanel from "@/components/SkillPanel.vue"
import ToolsPanel from "@/components/ToolsPanel.vue"
import McpPanel from "@/components/McpPanel.vue"

type TabId = "skill" | "tools" | "mcp"
const tabs = [
  { id: "skill" as const, label: "技能", icon: Zap },
  { id: "tools" as const, label: "工具", icon: Wrench },
  { id: "mcp" as const, label: "MCP", icon: Plug },
]
const active = ref<TabId>("skill")
</script>

<template>
  <div class="flex h-full w-80 flex-col border-l border-stone-200 bg-white">
    <div class="flex border-b border-stone-200">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors"
        :class="
          active === tab.id
            ? 'border-b-2 border-stone-800 text-stone-900'
            : 'text-stone-500 hover:text-stone-800'
        "
        @click="active = tab.id"
      >
        <component :is="tab.icon" :size="15" />
        {{ tab.label }}
      </button>
    </div>

    <div class="flex-1 overflow-hidden">
      <SkillPanel v-if="active === 'skill'" />
      <ToolsPanel v-else-if="active === 'tools'" />
      <McpPanel v-else />
    </div>
  </div>
</template>
