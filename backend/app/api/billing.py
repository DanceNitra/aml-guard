"""
AML Guard — Billing API Endpoints
Stripe checkout, webhook handling, subscription management.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import User, Company
from app.services.auth import get_current_user
from app.services.billing import BillingService, TIERS

router = APIRouter(prefix="/api/billing", tags=["billing"])

billing_service = BillingService()


# ─── Request Models ───

class CheckoutRequest(BaseModel):
    tier: str


class WebhookResponse(BaseModel):
    received: bool


class SubscriptionInfo(BaseModel):
    tier: str
    status: str
    period_end: str | None = None
    stripe_customer_id: str | None = None
    stripe_subscription_id: str | None = None


class CancelResponse(BaseModel):
    subscription_id: str
    status: str
    cancel_at_period_end: bool
    current_period_end: str


# ─── Endpoints ───

@router.post("/create-checkout")
async def create_checkout(
    req: CheckoutRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a Stripe Checkout Session and return the checkout URL."""
    if req.tier not in TIERS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid tier '{req.tier}'. Available: {', '.join(TIERS.keys())}",
        )

    if not user.company_id:
        raise HTTPException(status_code=400, detail="User has no company")

    result = await db.execute(select(Company).where(Company.id == user.company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    try:
        url = billing_service.create_checkout_session(company, req.tier)
        await db.flush()  # Persist the stripe_customer_id if newly created
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stripe error: {str(e)}")

    return {"url": url}


@router.post("/webhook")
async def webhook(request: Request):
    """
    Stripe webhook endpoint — no auth required.
    Processes subscription lifecycle events.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not sig_header:
        raise HTTPException(status_code=400, detail="Missing stripe-signature header")

    try:
        result = billing_service.handle_webhook(payload, sig_header)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Webhook error: {str(e)}")

    return {"received": True, "event": result}


@router.get("/subscription")
async def get_subscription(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return current subscription information."""
    if not user.company_id:
        raise HTTPException(status_code=400, detail="User has no company")

    result = await db.execute(select(Company).where(Company.id == user.company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    try:
        info = billing_service.get_subscription_status(company)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stripe error: {str(e)}")

    return info


@router.post("/cancel")
async def cancel_subscription(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel the company's subscription at period end."""
    if not user.company_id:
        raise HTTPException(status_code=400, detail="User has no company")

    result = await db.execute(select(Company).where(Company.id == user.company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    if not company.stripe_subscription_id:
        raise HTTPException(status_code=400, detail="No active subscription to cancel")

    try:
        cancel_info = billing_service.cancel_subscription(company)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stripe error: {str(e)}")

    return cancel_info
