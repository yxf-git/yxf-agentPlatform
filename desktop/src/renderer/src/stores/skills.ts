import { defineStore } from "pinia"
import { ref, computed } from "vue"
import {
  fetchSkills,
  generateSkill,
  importSkill,
  deleteSkill as apiDeleteSkill,
  type ApiSkill,
} from "@/lib/api"

export const useSkillStore = defineStore("skills", () => {
  const skills = ref<ApiSkill[]>([])
  const loading = ref(false)
  const search = ref("")
  const error = ref<string | null>(null)

  const filtered = computed(() => {
    const q = search.value.trim()
    if (!q) return skills.value
    return skills.value.filter(
      (s) => s.name.includes(q) || s.description.includes(q)
    )
  })

  async function load() {
    loading.value = true
    error.value = null
    try {
      skills.value = await fetchSkills()
    } catch (e) {
      error.value = e instanceof Error ? e.message : "加载技能失败"
    } finally {
      loading.value = false
    }
  }

  async function generateAndSave(intent: string): Promise<ApiSkill | null> {
    try {
      const created = await generateSkill(intent)
      await load()
      return created
    } catch {
      return null
    }
  }

  async function importPackage(file: File): Promise<ApiSkill | null> {
    try {
      const created = await importSkill(file)
      await load()
      return created
    } catch {
      return null
    }
  }

  async function remove(id: string) {
    await apiDeleteSkill(id)
    await load()
  }

  return { skills, loading, search, error, filtered, load, generateAndSave, importPackage, remove }
})
