import { defineStore } from "pinia"
import { ref, computed } from "vue"
import type { Conversation, Message, ReActStep } from "@/types"
import { streamChat, type ActiveSkillPayload, type ChatMessagePayload } from "@/lib/api"

export interface ActiveSkill {
  id: string
  name: string
}

function nowLabel(): string {
  return new Date()
    .toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(/\//g, "-")
}

function newConversation(): Conversation {
  return {
    id: String(Date.now()) + Math.random().toString(36).slice(2, 6),
    title: "新对话",
    updatedAt: nowLabel(),
    messages: [],
  }
}

export const useChatStore = defineStore("chat", () => {
  const conversations = ref<Conversation[]>([newConversation()])
  const activeId = ref<string>(conversations.value[0].id)
  const isReplying = ref(false)
  const activeSkills = ref<ActiveSkill[]>([])
  const webSearchEnabled = ref(true)
  const activeModel = ref("moonshot-v1-8k")

  const activeConversation = computed(() =>
    conversations.value.find((c) => c.id === activeId.value)
  )

  function setActive(id: string) {
    activeId.value = id
  }

  function createConversation() {
    const conv = newConversation()
    conversations.value.unshift(conv)
    activeId.value = conv.id
  }

  function deleteConversation(id: string) {
    const idx = conversations.value.findIndex((c) => c.id === id)
    if (idx === -1) return
    conversations.value.splice(idx, 1)
    if (conversations.value.length === 0) {
      const conv = newConversation()
      conversations.value.push(conv)
      activeId.value = conv.id
    } else if (activeId.value === id) {
      activeId.value = conversations.value[0].id
    }
  }

  function toggleSkill(skill: ActiveSkill) {
    const exists = activeSkills.value.some((s) => s.id === skill.id)
    activeSkills.value = exists
      ? activeSkills.value.filter((s) => s.id !== skill.id)
      : [...activeSkills.value, skill]
  }

  function removeSkill(id: string) {
    activeSkills.value = activeSkills.value.filter((s) => s.id !== id)
  }

  function clearSkills() {
    activeSkills.value = []
  }

  function toggleWebSearch() {
    webSearchEnabled.value = !webSearchEnabled.value
  }

  function setModel(m: string) {
    activeModel.value = m
  }

  async function sendMessage(content: string) {
    const conv = activeConversation.value
    if (!conv || !content.trim() || isReplying.value) return

    const skillsSnapshot = [...activeSkills.value]
    const webSearch = webSearchEnabled.value
    const model = activeModel.value

    // 组装历史（发送前）
    const history: ChatMessagePayload[] = [
      ...conv.messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content },
    ]

    if (conv.title === "新对话") {
      conv.title = content.slice(0, 20) + (content.length > 20 ? "..." : "")
    }

    const userMsg: Message = {
      id: String(Date.now()),
      role: "user",
      content,
    }
    conv.messages.push(userMsg)

    conv.messages.push({
      id: String(Date.now() + 1),
      role: "assistant",
      content: "",
      steps: [],
    })
    // 取数组里的响应式代理元素来更新，直接改原始对象引用不会触发视图刷新
    const ai = conv.messages[conv.messages.length - 1] as Message
    if (!ai.steps) ai.steps = []
    isReplying.value = true

    let liveText = ""
    const commitReasoning = () => {
      const text = liveText.trim()
      if (!text) return
      ai.steps!.push({
        kind: "reasoning",
        id: `r${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
        content: text,
      })
      ai.content = ""
      liveText = ""
    }

    const skillsPayload: ActiveSkillPayload[] = skillsSnapshot.map((s) => ({
      id: s.id,
      name: s.name,
    }))

    try {
      await streamChat(
        {
          messages: history,
          skills: skillsPayload,
          web_search: webSearch,
          model,
        },
        (ev) => {
          if (ev.type === "skill") {
            ai.skills = ev.names
          } else if (ev.type === "token") {
            liveText += ev.content
            ai.content = liveText
          } else if (ev.type === "tool_start") {
            commitReasoning()
            ai.steps!.push({
              kind: "tool",
              id: ev.id,
              tool: ev.tool,
              args: ev.args,
              status: "running",
            })
          } else if (ev.type === "tool_end") {
            const step = ai.steps!.find((s) => s.kind === "tool" && s.id === ev.id)
            if (step && step.kind === "tool") {
              step.result = ev.result
              step.status = "done"
            }
          } else if (ev.type === "error") {
            ai.content =
              (ai.content ? ai.content + "\n\n" : "") + `> ⚠️ ${ev.message}`
          }
        }
      )
    } catch (e) {
      ai.content =
        (ai.content ? ai.content + "\n\n" : "") +
        `> ⚠️ 无法连接后端服务，请确认后端已启动（默认 http://localhost:8000）。\n> ${
          e instanceof Error ? e.message : String(e)
        }`
    } finally {
      conv.updatedAt = nowLabel()
      isReplying.value = false
    }
  }

  return {
    conversations,
    activeId,
    isReplying,
    activeSkills,
    webSearchEnabled,
    activeModel,
    activeConversation,
    setActive,
    createConversation,
    deleteConversation,
    toggleSkill,
    removeSkill,
    clearSkills,
    toggleWebSearch,
    setModel,
    sendMessage,
  }
})
