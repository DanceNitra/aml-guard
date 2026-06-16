from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import User, TrainingRecord
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/training", tags=["training"])

class TrainingCompleteRequest(BaseModel):
    module_name: str = "Základné AML školenie"
    score: int = 100

@router.post("/complete")
async def complete_training(req: TrainingCompleteRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not user.company_id: raise HTTPException(status_code=400, detail="No company")
    passed = req.score >= 60
    record = TrainingRecord(company_id=user.company_id, user_id=user.id, training_type="annual",
        module_name=req.module_name, score=req.score, passed=passed)
    db.add(record)
    await db.flush()
    return {"id": record.id, "passed": passed, "score": record.score,
        "completed_at": record.completed_at.isoformat(),
        "valid_until": (datetime.utcnow() + timedelta(days=365)).isoformat()}

@router.get("/")
async def list_training(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not user.company_id: return {"records": [], "total": 0, "currently_valid": False, "valid_until": None}
    result = await db.execute(select(TrainingRecord).where(TrainingRecord.company_id == user.company_id).order_by(TrainingRecord.completed_at.desc()))
    records = result.scalars().all()
    now = datetime.utcnow()
    valid = [r for r in records if r.valid_until and r.valid_until > now]
    return {"records": [r.to_dict() for r in records], "total": len(records),
        "currently_valid": len(valid) > 0,
        "valid_until": max(r.valid_until for r in valid).isoformat() if valid else None}
