"""
AML Guard — CDD (KYC) API
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import User, CDDRecord
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/cdd", tags=["cdd"])


class CDDCreateRequest(BaseModel):
    person_type: str = "individual"
    first_name: str = ""
    last_name: str
    nationality: str = "SK"
    birth_date: str = ""
    address: str = ""
    id_document_type: str = "obciansky"
    id_document_number: str = ""
    is_pep: bool = False
    pep_source: str = ""
    risk_level: str = "low"
    business_relationship: str = ""
    purpose_of_business: str = ""


@router.post("/")
async def create_cdd(req: CDDCreateRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not user.company_id:
        raise HTTPException(status_code=400, detail="User has no company")
    birth_date = None
    if req.birth_date:
        try: birth_date = datetime.strptime(req.birth_date, "%Y-%m-%d").date()
        except ValueError: pass
    record = CDDRecord(
        company_id=user.company_id, person_type=req.person_type,
        first_name=req.first_name, last_name=req.last_name,
        nationality=req.nationality, birth_date=birth_date,
        address=req.address or None, id_document_type=req.id_document_type,
        id_document_number=req.id_document_number or None,
        is_pep=req.is_pep, pep_source=req.pep_source or None,
        risk_level=req.risk_level, business_relationship=req.business_relationship or None,
        purpose_of_business=req.purpose_of_business or None,
    )
    db.add(record)
    await db.flush()
    return {"id": record.id, "status": "created", "record": record.to_dict()}


@router.get("/")
async def list_cdd(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not user.company_id:
        return {"records": [], "total": 0}
    result = await db.execute(select(CDDRecord).where(CDDRecord.company_id == user.company_id).order_by(CDDRecord.created_at.desc()))
    records = result.scalars().all()
    return {"records": [r.to_dict() for r in records], "total": len(records)}


@router.get("/{record_id}")
async def get_cdd(record_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CDDRecord).where(CDDRecord.id == record_id))
    record = result.scalar_one_or_none()
    if not record: raise HTTPException(status_code=404)
    if record.company_id != user.company_id and not user.is_admin: raise HTTPException(status_code=403)
    return record.to_dict()


@router.put("/{record_id}/verify")
async def verify_cdd(record_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CDDRecord).where(CDDRecord.id == record_id))
    record = result.scalar_one_or_none()
    if not record: raise HTTPException(status_code=404)
    if record.company_id != user.company_id: raise HTTPException(status_code=403)
    record.id_verified = True
    record.id_verified_at = datetime.utcnow()
    await db.flush()
    return {"id": record.id, "verified": True}
