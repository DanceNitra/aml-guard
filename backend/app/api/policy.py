"""
AML Guard — Policy API Endpoints
"""

import os
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import User, Company, Policy
from app.services.auth import get_current_user
from app.services.policy_gen import PolicyTemplate

router = APIRouter(prefix="/api/policy", tags=["policy"])


class PolicyAnswers(BaseModel):
    company_name: str
    ico: str = ""
    address: str = ""
    business_type: str = "realestate"
    employee_count: str = "1"
    co_name: str
    co_contact: str
    risk_level: str = "low"
    id_procedure: str = "in_person"
    jurisdiction: str = "SK"


@router.post("/generate")
async def generate_policy(answers: PolicyAnswers, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not user.company_id:
        raise HTTPException(status_code=400, detail="User has no company")
    
    result = await db.execute(select(Company).where(Company.id == user.company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    answers_dict = answers.model_dump()
    answers_dict["_version"] = "1.0"
    policy_text = PolicyTemplate.build_text(answers_dict)
    
    # Try PDF generation
    pdf_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "policies")
    os.makedirs(pdf_dir, exist_ok=True)
    pdf_filename = f"AML_Policy_{company.id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.pdf"
    pdf_path = os.path.join(pdf_dir, pdf_filename)
    pdf_ok = True
    try:
        PolicyTemplate.build_pdf(answers_dict, pdf_path)
    except Exception as e:
        pdf_ok = False
        pdf_path = None
    
    policy = Policy(
        company_id=company.id,
        title=f"AML politika - {company.name}",
        version=1,
        status="active",
        policy_type="aml_policy",
        jurisdiction=answers.jurisdiction,
        content=answers_dict,
        pdf_path=pdf_path,
        approved_by=user.full_name,
        approved_at=datetime.utcnow(),
        valid_until=datetime.utcnow() + timedelta(days=365),
    )
    db.add(policy)
    await db.flush()
    
    return {
        "id": policy.id,
        "title": policy.title,
        "version": policy.version,
        "status": policy.status,
        "valid_until": policy.valid_until.isoformat(),
        "pdf_generated": pdf_ok,
        "policy_text": policy_text,
        "created_at": policy.created_at.isoformat(),
    }


@router.get("/list")
async def list_policies(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not user.company_id:
        return {"policies": []}
    result = await db.execute(select(Policy).where(Policy.company_id == user.company_id).order_by(Policy.created_at.desc()))
    return {"policies": [{
        "id": p.id, "title": p.title, "version": p.version,
        "status": p.status, "created_at": p.created_at.isoformat(),
        "valid_until": p.valid_until.isoformat() if p.valid_until else None,
    } for p in result.scalars().all()]}


@router.get("/{policy_id}")
async def get_policy(policy_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Policy).where(Policy.id == policy_id))
    policy = result.scalar_one_or_none()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    if policy.company_id != user.company_id and not user.is_admin:
        raise HTTPException(status_code=403, detail="Access denied")
    return policy.to_dict()
