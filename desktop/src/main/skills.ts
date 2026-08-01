import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "fs"
import { join, relative, resolve as resolvePath } from "path"
import { load as yamlLoad, dump as yamlDump } from "js-yaml"
import AdmZip from "adm-zip"
import { skillsDir } from "./config"
import { makeLlm } from "./llm"
import type { SkillCreate, SkillDetail, SkillMeta } from "./domain"

const SKILL_FILE = "SKILL.md"
const SUB_DIRS = ["references", "scripts", "assets", "templates"]

interface DefaultSkill extends SkillCreate {
  id: string
}

const DEFAULT_SKILLS: DefaultSkill[] = [
  {
    id: "weekly-report",
    name: "周报助手",
    description:
      "根据本周工作内容，生成结构清晰、语言专业的周报。当用户要写周报/工作总结时使用。",
    icon: "ClipboardList",
    category: "办公",
    author: "官方",
    tools: [],
    instructions:
      "# 周报助手\n\n" +
      "你是周报撰写助手。根据用户提供的本周工作内容，产出规范周报。\n\n" +
      "## 结构\n" +
      "1. 本周完成（分条，突出成果与数据）\n" +
      "2. 下周计划\n" +
      "3. 需要协调/风险\n\n" +
      "## 要求\n" +
      "语言专业简洁，使用 Markdown，条目化表达。",
  },
  {
    id: "web-research",
    name: "网页调研",
    description:
      "给定主题联网搜索并抓取网页，产出带来源的结构化调研报告。当用户要做市场/竞品/资料调研时使用。",
    icon: "Globe",
    category: "分析",
    author: "官方",
    tools: ["web_search", "http_fetch"],
    instructions:
      "# 网页调研\n\n" +
      "你是调研分析专家。\n\n" +
      "## 步骤\n" +
      "1. 用 `web_search` 搜索主题，挑选 3-5 个高质量来源\n" +
      "2. 必要时用 `http_fetch` 抓取重点网页正文\n" +
      "3. 汇总为结构化报告：概述 / 关键发现 / 建议\n\n" +
      "## 要求\n" +
      "每个关键结论后标注来源链接，确保可溯源。",
  },
]

function slug(name: string): string {
  const s = name
    .trim()
    .replace(/[\s/\\:*?"<>|]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return s || `skill-${Date.now()}`
}

function uniqueSlug(base: string): string {
  let s = base
  let i = 2
  while (existsSync(join(skillsDir(), s))) {
    s = `${base}-${i}`
    i += 1
  }
  return s
}

function normTools(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((t) => String(t).trim()).filter(Boolean)
  if (typeof raw === "string") return raw.split(/[,\s]+/).map((t) => t.trim()).filter(Boolean)
  return []
}

export function parseSkillMd(text: string): { fm: Record<string, any>; body: string } {
  if (text.startsWith("---")) {
    const parts = text.split("---")
    if (parts.length >= 3) {
      let fm: Record<string, any> = {}
      try {
        const parsed = yamlLoad(parts[1])
        if (parsed && typeof parsed === "object") fm = parsed as Record<string, any>
      } catch {
        fm = {}
      }
      const body = parts.slice(2).join("---").replace(/^\n+/, "")
      return { fm, body }
    }
  }
  return { fm: {}, body: text }
}

function buildSkillMd(meta: SkillCreate, instructions: string): string {
  const fm = {
    name: meta.name || "",
    description: meta.description || "",
    icon: meta.icon || "Sparkles",
    category: meta.category || "办公",
    author: meta.author || "我",
    tools: meta.tools || [],
  }
  const front = yamlDump(fm, { sortKeys: false, lineWidth: -1 }).trim()
  return `---\n${front}\n---\n\n${instructions.trim()}\n`
}

function skillMdPath(id: string): string {
  return join(skillsDir(), id, SKILL_FILE)
}

function metaFromDir(dir: string, id: string): SkillMeta | null {
  const md = join(dir, SKILL_FILE)
  if (!existsSync(md)) return null
  const { fm } = parseSkillMd(readFileSync(md, "utf-8"))
  return {
    id,
    name: fm.name || id,
    description: fm.description || "",
    icon: fm.icon || "Sparkles",
    category: fm.category || "办公",
    author: fm.author || "我",
    usageCount: Number(fm.usageCount || 0) || 0,
    tools: normTools(fm.tools),
  }
}

function seedIfEmpty(): void {
  const base = skillsDir()
  if (!existsSync(base)) mkdirSync(base, { recursive: true })
  const hasAny = readdirSync(base).some((name) => {
    const d = join(base, name)
    return statSync(d).isDirectory() && existsSync(join(d, SKILL_FILE))
  })
  if (hasAny) return
  for (const raw of DEFAULT_SKILLS) {
    const d = join(base, raw.id)
    mkdirSync(d, { recursive: true })
    writeFileSync(join(d, SKILL_FILE), buildSkillMd(raw, raw.instructions || ""), "utf-8")
  }
}

function listFiles(id: string): string[] {
  const base = join(skillsDir(), id)
  const files: string[] = []
  const walk = (dir: string): void => {
    if (!existsSync(dir)) return
    for (const name of readdirSync(dir).sort()) {
      const full = join(dir, name)
      if (statSync(full).isDirectory()) walk(full)
      else files.push(relative(base, full).replace(/\\/g, "/"))
    }
  }
  for (const sub of SUB_DIRS) walk(join(base, sub))
  return files
}

export function listSkills(): SkillMeta[] {
  const base = skillsDir()
  if (!existsSync(base)) mkdirSync(base, { recursive: true })
  seedIfEmpty()
  const out: SkillMeta[] = []
  for (const name of readdirSync(base).sort()) {
    const d = join(base, name)
    if (statSync(d).isDirectory()) {
      const meta = metaFromDir(d, name)
      if (meta) out.push(meta)
    }
  }
  return out
}

export function getDetail(id: string): SkillDetail | null {
  const md = skillMdPath(id)
  if (!existsSync(md)) return null
  const { fm, body } = parseSkillMd(readFileSync(md, "utf-8"))
  return {
    id,
    name: fm.name || id,
    description: fm.description || "",
    icon: fm.icon || "Sparkles",
    category: fm.category || "办公",
    author: fm.author || "我",
    usageCount: Number(fm.usageCount || 0) || 0,
    tools: normTools(fm.tools),
    instructions: body,
    files: listFiles(id),
  }
}

export function findDetail(idOrName: string): SkillDetail | null {
  const detail = getDetail(idOrName)
  if (detail) return detail
  for (const meta of listSkills()) {
    if (meta.name === idOrName) return getDetail(meta.id)
  }
  return null
}

export function getMeta(id: string): SkillMeta | null {
  const d = join(skillsDir(), id)
  return existsSync(d) && statSync(d).isDirectory() ? metaFromDir(d, id) : null
}

export function saveSkill(payload: SkillCreate, id = ""): SkillDetail {
  const skillId = id || uniqueSlug(slug(payload.name))
  const d = join(skillsDir(), skillId)
  mkdirSync(d, { recursive: true })
  writeFileSync(join(d, SKILL_FILE), buildSkillMd(payload, payload.instructions || ""), "utf-8")
  const detail = getDetail(skillId)
  if (!detail) throw new Error("保存技能失败")
  return detail
}

export function deleteSkill(id: string): boolean {
  const d = join(skillsDir(), id)
  if (existsSync(d) && statSync(d).isDirectory()) {
    rmSync(d, { recursive: true, force: true })
    return true
  }
  return false
}

export function skillBundleByRef(
  idOrName: string
): { detail: SkillDetail; absFiles: string[] } | null {
  const detail = findDetail(idOrName)
  if (!detail) return null
  const base = join(skillsDir(), detail.id)
  const absFiles = detail.files.map((rel) => resolvePath(join(base, rel)))
  return { detail, absFiles }
}

export function importPackage(filename: string, content: Buffer): SkillDetail {
  const name = filename.toLowerCase()

  if (name.endsWith(".md")) {
    const text = content.toString("utf-8")
    const { fm, body } = parseSkillMd(text)
    return saveSkill({
      name: fm.name || "导入技能",
      description: fm.description || "",
      icon: fm.icon || "Sparkles",
      category: fm.category || "办公",
      author: fm.author || "我",
      tools: normTools(fm.tools),
      instructions: body,
    })
  }

  if (!name.endsWith(".zip")) {
    throw new Error("仅支持 .zip 技能包或 .md 单文件")
  }

  const zip = new AdmZip(content)
  const entries = zip.getEntries()
  const skillEntry = entries.find((e) =>
    e.entryName.replace(/\\/g, "/").replace(/\/$/, "").endsWith("SKILL.md")
  )
  if (!skillEntry) throw new Error("技能包内未找到 SKILL.md")

  const skillEntryName = skillEntry.entryName.replace(/\\/g, "/")
  const prefix = skillEntryName.slice(0, skillEntryName.lastIndexOf("SKILL.md"))

  const mdText = skillEntry.getData().toString("utf-8")
  const { fm } = parseSkillMd(mdText)
  const skillId = uniqueSlug(slug(fm.name || "导入技能"))
  const dest = join(skillsDir(), skillId)
  mkdirSync(dest, { recursive: true })

  for (const entry of entries) {
    if (entry.isDirectory) continue
    const norm = entry.entryName.replace(/\\/g, "/")
    if (prefix && !norm.startsWith(prefix)) continue
    const rel = prefix ? norm.slice(prefix.length) : norm
    if (!rel) continue
    const top = rel.split("/")[0]
    if (rel !== "SKILL.md" && !SUB_DIRS.includes(top)) continue
    const target = join(dest, rel)
    mkdirSync(join(target, ".."), { recursive: true })
    writeFileSync(target, entry.getData())
  }

  const detail = getDetail(skillId)
  if (!detail) throw new Error("导入失败")
  return detail
}

export async function generateSkill(intent: string): Promise<SkillDetail> {
  try {
    const payload = await generateWithLlm(intent)
    if (payload) return saveSkill(payload)
  } catch {
    // fall back to heuristic
  }
  return saveSkill(generateHeuristic(intent))
}

async function generateWithLlm(intent: string): Promise<SkillCreate | null> {
  const schema = {
    name: "技能名称（简短）",
    description: "一句话描述『做什么 + 什么时候用』，模型据此判断是否使用该技能",
    icon: "图标名(如 ClipboardList/Globe/Terminal/Code/BarChart3)",
    category: "分类(办公/分析/翻译/数据处理/开发/写作 之一)",
    tools: "需要用到的内置工具名数组，可选: read_file,write_file,list_dir,http_fetch,exec_command,web_search",
    instructions: "给小飞侠的完整指令（Markdown），包含角色、步骤、输出要求",
  }
  const llm = makeLlm(undefined, false)
  const prompt =
    "你是技能设计器。根据用户的一句话意图，设计一个小飞侠『技能』，" +
    "严格输出 JSON（不要多余文字、不要代码块围栏），结构如下：\n" +
    JSON.stringify(schema) +
    `\n\n用户意图：${intent}`
  const resp = await llm.invoke(prompt)
  let text = typeof resp.content === "string" ? resp.content : String(resp.content)
  text = text.trim()
  if (text.startsWith("```")) {
    text = text.replace(/^```(json)?/i, "").replace(/```$/, "").trim()
  }
  const data = JSON.parse(text)
  return {
    name: data.name || "新技能",
    description: data.description || intent.slice(0, 60),
    icon: data.icon || "Sparkles",
    category: data.category || "办公",
    tools: normTools(data.tools),
    instructions: data.instructions || "",
  }
}

function generateHeuristic(intent: string): SkillCreate {
  const clean = intent.trim()
  const short = clean.slice(0, 8) || "新技能"
  return {
    name: short + "助手",
    description: (clean.slice(0, 60) || "根据输入自动生成结果") + "。当用户有相关需求时使用。",
    icon: "Sparkles",
    category: "办公",
    tools: [],
    instructions: `# ${short}助手\n\n你是一个专业助手。任务：${clean || "根据用户输入完成对应工作"}。\n\n请输出结构清晰、专业规范的结果。`,
  }
}
