"""
AML Guard — Auth API Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models import User, Company, Policy, CDDRecord, UBORecord, STRReport, TrainingRecord
from app.services.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    company_name: str = ""
    company_ico: str = ""
    jurisdiction: str = "SK"
    company_type: str = "other"

class LoginRequest(BaseModel):
    email: str
    password: str

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict
    company: dict | None = None


@router.post("/register", response_model=AuthResponse)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    company = Company(
        name=req.company_name or f"{req.full_name}'s Company",
        ico=req.company_ico or None,
        jurisdiction=req.jurisdiction,
        company_type=req.company_type,
        subscription_tier="free",
        subscription_status="inactive",
    )
    db.add(company)
    await db.flush()
    
    user = User(
        email=req.email,
        hashed_password=hash_password(req.password),
        full_name=req.full_name,
        company_id=company.id,
    )
    db.add(user)
    await db.flush()
    
    token = create_access_token({"sub": user.id})
    return AuthResponse(
        access_token=token,
        user=user.to_dict(exclude={"hashed_password"}),
        company=company.to_dict(),
    )


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive")
    
    company = None
    if user.company_id:
        result = await db.execute(select(Company).where(Company.id == user.company_id))
        company = result.scalar_one_or_none()
    
    token = create_access_token({"sub": user.id})
    return AuthResponse(
        access_token=token,
        user=user.to_dict(exclude={"hashed_password"}),
        company=company.to_dict() if company else None,
    )


@router.get("/me")
async def get_me(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    company = None
    if user.company_id:
        result = await db.execute(select(Company).where(Company.id == user.company_id))
        company = result.scalar_one_or_none()
    
    policy_count = 0
    cdd_count = 0
    ubo_count = 0
    training_valid = False
    
    if user.company_id:
        policy_count = await db.scalar(select(func.count()).select_from(Policy).where(Policy.company_id == user.company_id, Policy.status == "active")) or 0
        cdd_count = await db.scalar(select(func.count()).select_from(CDDRecord).where(CDDRecord.company_id == user.company_id)) or 0
        ubo_count = await db.scalar(select(func.count()).select_from(UBORecord).where(UBORecord.company_id == user.company_id)) or 0
        tr = await db.execute(select(TrainingRecord).where(TrainingRecord.company_id == user.company_id, TrainingRecord.valid_until > func.now()).limit(1))
        training_valid = tr.scalar_one_or_none() is not None
    
    checks = [policy_count > 0, cdd_count > 0, ubo_count > 0, training_valid, bool(company and company.compliance_officer)]
    score = round((sum(1 for c in checks if c) / len(checks)) * 100) if checks else 0
    
    return {
        "user": user.to_dict(exclude={"hashed_password"}),
        "company": company.to_dict() if company else None,
        "dashboard": {
            "compliance_score": score,
            "stats": {
                "policies": policy_count,
                "cdd_records": cdd_count,
                "ubo_records": ubo_count,
                "training_valid": training_valid,
            },
            "checklist": [
                {"item": "AML politika", "done": bool(policy_count)},
                {"item": "KYC previerky", "done": cdd_count > 0},
                {"item": "UBO registrácia", "done": ubo_count > 0},
                {"item": "Ročné školenie", "done": training_valid},
                {"item": "Zodpovedná osoba", "done": bool(company and company.compliance_officer)},
            ],
        }
    }
