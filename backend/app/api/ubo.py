from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import User, UBORecord
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/ubo", tags=["ubo"])

class UBOCreateRequest(BaseModel):
    full_name: str
    birth_date: str = ""
    nationality: str = "SK"
    citizenship_country: str = ""
    ownership_percent: float
    ownership_type: str = "direct"
    controlling_entity: str = ""
    is_statutory: bool = False
    address: str = ""
    notes: str = ""

@router.post("/")
async def create_ubo(req: UBOCreateRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not user.company_id: raise HTTPException(status_code=400, detail="No company")
    bd = None
    if req.birth_date:
        try: bd = datetime.strptime(req.birth_date, "%Y-%m-%d").date()
        except: pass
    record = UBORecord(company_id=user.company_id, full_name=req.full_name, birth_date=bd,
        nationality=req.nationality, citizenship_country=req.citizenship_country or None,
        ownership_percent=req.ownership_percent, ownership_type=req.ownership_type,
        controlling_entity=req.controlling_entity or None, is_statutory=req.is_statutory,
        address=req.address or None, notes=req.notes or None)
    db.add(record)
    await db.flush()
    return {"id": record.id, "status": "created", "record": record.to_dict()}

@router.get("/")
async def list_ubo(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not user.company_id: return {"records": [], "total": 0}
    result = await db.execute(select(UBORecord).where(UBORecord.company_id == user.company_id).order_by(UBORecord.ownership_percent.desc()))
    records = result.scalars().all()
    return {"records": [r.to_dict() for r in records], "total": len(records), "total_ownership_percent": sum(r.ownership_percent for r in records)}
