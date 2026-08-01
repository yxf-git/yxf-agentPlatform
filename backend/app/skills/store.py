from __future__ import annotations

import io
import re
import time
import zipfile
from pathlib import Path

import yaml

from ..config import SKILLS_DIR
from ..schemas import SkillCreate, SkillDetail, SkillMeta

SKILL_FILE = "SKILL.md"
SUB_DIRS = ("references", "scripts", "assets", "templates")

# ============ 内置示例技能（首次运行时写入为 SKILL.md 目录） ============
_DEFAULT_SKILLS: list[dict] = [
    {
        "id": "weekly-report",
        "name": "周报助手",
        "description": "根据本周工作内容，生成结构清晰、语言专业的周报。当用户要写周报/工作总结时使用。",
        "icon": "ClipboardList",
        "category": "办公",
        "author": "官方",
        "tools": [],
        "instructions": (
            "# 周报助手\n\n"
            "你是周报撰写助手。根据用户提供的本周工作内容，产出规范周报。\n\n"
            "## 结构\n"
            "1. 本周完成（分条，突出成果与数据）\n"
            "2. 下周计划\n"
            "3. 需要协调/风险\n\n"
            "## 要求\n"
            "语言专业简洁，使用 Markdown，条目化表达。"
        ),
    },
    {
        "id": "web-research",
        "name": "网页调研",
        "description": "给定主题联网搜索并抓取网页，产出带来源的结构化调研报告。当用户要做市场/竞品/资料调研时使用。",
        "icon": "Globe",
        "category": "分析",
        "author": "官方",
        "tools": ["web_search", "http_fetch"],
        "instructions": (
            "# 网页调研\n\n"
            "你是调研分析专家。\n\n"
            "## 步骤\n"
            "1. 用 `web_search` 搜索主题，挑选 3-5 个高质量来源\n"
            "2. 必要时用 `http_fetch` 抓取重点网页正文\n"
            "3. 汇总为结构化报告：概述 / 关键发现 / 建议\n\n"
            "## 要求\n"
            "每个关键结论后标注来源链接，确保可溯源。"
        ),
    },
]


def _slug(name: str) -> str:
    s = re.sub(r"[\s/\\:*?\"<>|]+", "-", name.strip())
    s = s.strip("-")
    return s or f"skill-{int(time.time() * 1000)}"


def _unique_slug(base: str) -> str:
    slug = base
    i = 2
    while (SKILLS_DIR / slug).exists():
        slug = f"{base}-{i}"
        i += 1
    return slug


def parse_skill_md(text: str) -> tuple[dict, str]:
    """解析 SKILL.md：YAML frontmatter + 正文。"""
    if text.startswith("---"):
        parts = text.split("---", 2)
        if len(parts) >= 3:
            try:
                fm = yaml.safe_load(parts[1]) or {}
            except Exception:  # noqa: BLE001
                fm = {}
            if not isinstance(fm, dict):
                fm = {}
            return fm, parts[2].lstrip("\n")
    return {}, text


def build_skill_md(meta: dict, instructions: str) -> str:
    fm = {
        "name": meta.get("name", ""),
        "description": meta.get("description", ""),
        "icon": meta.get("icon", "Sparkles"),
        "category": meta.get("category", "办公"),
        "author": meta.get("author", "我"),
        "tools": meta.get("tools", []) or [],
    }
    front = yaml.safe_dump(fm, allow_unicode=True, sort_keys=False).strip()
    return f"---\n{front}\n---\n\n{instructions.strip()}\n"


def _skill_path(skill_id: str) -> Path:
    return SKILLS_DIR / skill_id / SKILL_FILE


def _norm_tools(raw) -> list[str]:
    if isinstance(raw, list):
        return [str(t).strip() for t in raw if str(t).strip()]
    if isinstance(raw, str):
        return [t.strip() for t in re.split(r"[,\s]+", raw) if t.strip()]
    return []


def _meta_from_dir(d: Path) -> SkillMeta | None:
    md = d / SKILL_FILE
    if not md.exists():
        return None
    fm, _ = parse_skill_md(md.read_text(encoding="utf-8", errors="replace"))
    return SkillMeta(
        id=d.name,
        name=fm.get("name") or d.name,
        description=fm.get("description", ""),
        icon=fm.get("icon", "Sparkles"),
        category=fm.get("category", "办公"),
        author=fm.get("author", "我"),
        usageCount=int(fm.get("usageCount", 0) or 0),
        tools=_norm_tools(fm.get("tools")),
    )


def _seed_if_empty() -> None:
    if any(p.is_dir() and (p / SKILL_FILE).exists() for p in SKILLS_DIR.iterdir()) if SKILLS_DIR.exists() else False:
        return
    for raw in _DEFAULT_SKILLS:
        d = SKILLS_DIR / raw["id"]
        d.mkdir(parents=True, exist_ok=True)
        (d / SKILL_FILE).write_text(build_skill_md(raw, raw["instructions"]), encoding="utf-8")


def list_skills() -> list[SkillMeta]:
    SKILLS_DIR.mkdir(parents=True, exist_ok=True)
    _seed_if_empty()
    out: list[SkillMeta] = []
    for d in sorted(SKILLS_DIR.iterdir()):
        if d.is_dir():
            meta = _meta_from_dir(d)
            if meta:
                out.append(meta)
    return out


def _list_files(skill_id: str) -> list[str]:
    base = SKILLS_DIR / skill_id
    files: list[str] = []
    for sub in SUB_DIRS:
        p = base / sub
        if p.is_dir():
            for f in sorted(p.rglob("*")):
                if f.is_file():
                    files.append(str(f.relative_to(base)).replace("\\", "/"))
    return files


def get_detail(skill_id: str) -> SkillDetail | None:
    md = _skill_path(skill_id)
    if not md.exists():
        return None
    fm, body = parse_skill_md(md.read_text(encoding="utf-8", errors="replace"))
    return SkillDetail(
        id=skill_id,
        name=fm.get("name") or skill_id,
        description=fm.get("description", ""),
        icon=fm.get("icon", "Sparkles"),
        category=fm.get("category", "办公"),
        author=fm.get("author", "我"),
        tools=_norm_tools(fm.get("tools")),
        instructions=body,
        files=_list_files(skill_id),
    )


def find_detail(id_or_name: str) -> SkillDetail | None:
    """按 id 或 name 查找技能详情（供 load_skill 工具使用）。"""
    detail = get_detail(id_or_name)
    if detail:
        return detail
    for meta in list_skills():
        if meta.name == id_or_name:
            return get_detail(meta.id)
    return None


def get_meta(skill_id: str) -> SkillMeta | None:
    d = SKILLS_DIR / skill_id
    return _meta_from_dir(d) if d.is_dir() else None


def save_skill(payload: SkillCreate, skill_id: str = "") -> SkillDetail:
    if not skill_id:
        skill_id = _unique_slug(_slug(payload.name))
    d = SKILLS_DIR / skill_id
    d.mkdir(parents=True, exist_ok=True)
    (d / SKILL_FILE).write_text(
        build_skill_md(payload.model_dump(), payload.instructions),
        encoding="utf-8",
    )
    detail = get_detail(skill_id)
    assert detail is not None
    return detail


def delete_skill(skill_id: str) -> bool:
    d = SKILLS_DIR / skill_id
    if d.is_dir():
        import shutil

        shutil.rmtree(d, ignore_errors=True)
        return True
    return False


def skill_bundle(skill_id: str) -> tuple[SkillDetail, list[str]] | None:
    """返回技能详情，以及其附带文件的绝对路径列表（供 read_file / exec_command）。"""
    detail = get_detail(skill_id)
    if not detail:
        return None
    base = SKILLS_DIR / skill_id
    abs_files = [str((base / rel).resolve()) for rel in detail.files]
    return detail, abs_files


def skill_bundle_by_ref(id_or_name: str) -> tuple[SkillDetail, list[str]] | None:
    """按 id 或 name 解析技能，返回 (详情, 附带文件绝对路径)。供 load_skill 工具使用。"""
    detail = find_detail(id_or_name)
    if not detail:
        return None
    base = SKILLS_DIR / detail.id
    abs_files = [str((base / rel).resolve()) for rel in detail.files]
    return detail, abs_files


def import_package(filename: str, content: bytes) -> SkillDetail:
    """导入技能包：
    - .zip：内含一个技能目录（含 SKILL.md），或根目录直接是 SKILL.md + 子目录
    - .md ：单个 SKILL.md
    """
    name = filename.lower()

    if name.endswith(".md"):
        text = content.decode("utf-8", errors="replace")
        fm, body = parse_skill_md(text)
        payload = SkillCreate(
            name=fm.get("name") or "导入技能",
            description=fm.get("description", ""),
            icon=fm.get("icon", "Sparkles"),
            category=fm.get("category", "办公"),
            author=fm.get("author", "我"),
            tools=_norm_tools(fm.get("tools")),
            instructions=body,
        )
        return save_skill(payload)

    if not name.endswith(".zip"):
        raise ValueError("仅支持 .zip 技能包或 .md 单文件")

    with zipfile.ZipFile(io.BytesIO(content)) as zf:
        names = zf.namelist()
        skill_md_entry = next(
            (n for n in names if n.replace("\\", "/").rstrip("/").endswith("SKILL.md")),
            None,
        )
        if skill_md_entry is None:
            raise ValueError("技能包内未找到 SKILL.md")

        # 计算包内根前缀（SKILL.md 所在目录）
        prefix = skill_md_entry[: skill_md_entry.rfind("SKILL.md")]

        md_text = zf.read(skill_md_entry).decode("utf-8", errors="replace")
        fm, _ = parse_skill_md(md_text)
        skill_id = _unique_slug(_slug(fm.get("name") or "导入技能"))
        dest = SKILLS_DIR / skill_id
        dest.mkdir(parents=True, exist_ok=True)

        for entry in names:
            norm = entry.replace("\\", "/")
            if norm.endswith("/"):
                continue
            if prefix and not norm.startswith(prefix):
                continue
            rel = norm[len(prefix):] if prefix else norm
            if not rel:
                continue
            # 只接受 SKILL.md 与已知子目录
            top = rel.split("/", 1)[0]
            if rel != "SKILL.md" and top not in SUB_DIRS:
                continue
            target = dest / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(zf.read(entry))

    detail = get_detail(skill_id)
    if not detail:
        raise ValueError("导入失败")
    return detail


def generate_skill(intent: str) -> SkillDetail:
    """用 LLM 根据一句话意图生成 SKILL.md 技能；无 LLM 时回退启发式。"""
    try:
        payload = _generate_with_llm(intent)
        if payload:
            return save_skill(payload)
    except Exception:  # noqa: BLE001
        pass
    return save_skill(_generate_heuristic(intent))


def _generate_with_llm(intent: str) -> SkillCreate | None:
    import json as _json

    from ..agent.llm import make_llm

    schema = {
        "name": "技能名称（简短）",
        "description": "一句话描述『做什么 + 什么时候用』，模型据此判断是否使用该技能",
        "icon": "图标名(如 ClipboardList/Globe/Terminal/Code/BarChart3)",
        "category": "分类(办公/分析/翻译/数据处理/开发/写作 之一)",
        "tools": "需要用到的内置工具名数组，可选: read_file,write_file,list_dir,http_fetch,exec_command,web_search",
        "instructions": "给智能体的完整指令（Markdown），包含角色、步骤、输出要求",
    }
    llm = make_llm(streaming=False)
    prompt = (
        "你是技能设计器。根据用户的一句话意图，设计一个办公智能体『技能』，"
        "严格输出 JSON（不要多余文字、不要代码块围栏），结构如下：\n"
        + _json.dumps(schema, ensure_ascii=False)
        + f"\n\n用户意图：{intent}"
    )
    resp = llm.invoke(prompt)
    text = resp.content if isinstance(resp.content, str) else str(resp.content)
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text[:4].lower() == "json":
            text = text[4:]
    data = _json.loads(text)
    return SkillCreate(
        name=data.get("name", "新技能"),
        description=data.get("description", intent[:60]),
        icon=data.get("icon", "Sparkles"),
        category=data.get("category", "办公"),
        tools=_norm_tools(data.get("tools")),
        instructions=data.get("instructions", ""),
    )


def _generate_heuristic(intent: str) -> SkillCreate:
    clean = intent.strip()
    return SkillCreate(
        name=(clean[:8] or "新技能") + "助手",
        description=(clean[:60] or "根据输入自动生成结果") + "。当用户有相关需求时使用。",
        icon="Sparkles",
        category="办公",
        tools=[],
        instructions=f"# {(clean[:8] or '新技能')}助手\n\n你是一个专业助手。任务：{clean or '根据用户输入完成对应工作'}。\n\n请输出结构清晰、专业规范的结果。",
    )
