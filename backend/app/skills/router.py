from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile

from ..schemas import ApiResult, GenerateSkillRequest, SkillCreate, SkillDetail, SkillMeta
from . import store

router = APIRouter(prefix="/api/skills", tags=["skills"])


@router.get("")
def list_skills() -> list[SkillMeta]:
    return store.list_skills()


@router.get("/{skill_id}")
def get_skill(skill_id: str) -> SkillDetail:
    detail = store.get_detail(skill_id)
    if not detail:
        raise HTTPException(status_code=404, detail="技能不存在")
    return detail


@router.post("")
def create_skill(payload: SkillCreate) -> SkillDetail:
    return store.save_skill(payload)


@router.put("/{skill_id}")
def update_skill(skill_id: str, payload: SkillCreate) -> SkillDetail:
    return store.save_skill(payload, skill_id)


@router.delete("/{skill_id}")
def delete_skill(skill_id: str) -> ApiResult:
    ok = store.delete_skill(skill_id)
    return ApiResult(ok=ok, message="已删除" if ok else "技能不存在")


@router.post("/generate")
def generate_skill(req: GenerateSkillRequest) -> SkillDetail:
    return store.generate_skill(req.intent)


@router.post("/import")
async def import_skill(file: UploadFile = File(...)) -> SkillDetail:
    content = await file.read()
    try:
        return store.import_package(file.filename or "skill.md", content)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"导入失败：{e}")
