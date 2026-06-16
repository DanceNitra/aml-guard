from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import User, STRReport
from app.services.auth import get_current_user, generate_str_number

router = APIRouter(prefix="/api/str", tags=["str"])

class STRRerquest(BaseModel):
    transaction_date: str = ""
    transaction_amount: float | None = None
    transaction_type: str = "other"
    suspicion_reasons: list = []
    description: str
    notes: str = ""

@router.post("/")
async def create_str(req: STRRerquest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not user.company_id: raise HTTPException(status_code=400, detail="No company")
    txn_date = None
    if req.transaction_date:
        try: txn_date = datetime.strptime(req.transaction_date, "%Y-%m-%d").date()
        except: pass
    report = STRReport(company_id=user.company_id, report_number=generate_str_number(db),
        status="draft", transaction_date=txn_date, transaction_amount=req.transaction_amount,
        transaction_type=req.transaction_type or None, suspicion_reasons=req.suspicion_reasons,
        description=req.description, notes=req.notes or None)
    db.add(report)
    await db.flush()
    return {"id": report.id, "report_number": report.report_number, "status": report.status, "created_at": report.created_at.isoformat()}

@router.get("/")
async def list_str(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not user.company_id: return {"reports": [], "total": 0}
    result = await db.execute(select(STRReport).where(STRReport.company_id == user.company_id).order_by(STRReport.created_at.desc()))
    return {"reports": [r.to_dict() for r in result.scalars().all()], "total": len(result.scalars().all())}

@router.post("/{report_id}/submit")
async def submit_str(report_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(STRReport).where(STRReport.id == report_id))
    report = result.scalar_one_or_none()
    if not report: raise HTTPException(status_code=404)
    if report.company_id != user.company_id: raise HTTPException(status_code=403)
    report.status = "submitted"
    report.submitted_at = datetime.utcnow()
    await db.flush()
    return {"id": report.id, "status": "submitted", "submitted_at": report.submitted_at.isoformat()}
