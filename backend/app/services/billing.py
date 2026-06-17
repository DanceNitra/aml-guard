"""
AML Guard — Stripe Billing Service
Handles subscription tiers, checkout, webhooks, and subscription management.
"""

import stripe
from datetime import datetime
from typing import Optional

from app.config import settings
from app.models import Company

# ─── Subscription Tiers ───
TIERS = {
    "solo": {
        "name": "Solo",
        "price_id": "price_solo_montly",
        "amount_cents": 2900,
        "currency": "eur",
        "interval": "month",
        "description": "€29/month — Pre jednotlivcov a malé firmy",
    },
    "small": {
        "name": "Small",
        "price_id": "price_small_monthly",
        "amount_cents": 7900,
        "currency": "eur",
        "interval": "month",
        "description": "€79/month — Pre menšie tímy",
    },
    "medium": {
        "name": "Medium",
        "price_id": "price_medium_monthly",
        "amount_cents": 19900,
        "currency": "eur",
        "interval": "month",
        "description": "€199/month — Pre rastúce organizácie",
    },
}


class BillingService:
    """Service for managing Stripe billing and subscriptions."""

    def __init__(self):
        stripe.api_key = settings.STRIPE_SECRET_KEY

    # ─── Helpers ───

    @staticmethod
    def _get_or_create_customer(company: Company) -> str:
        """Return existing stripe_customer_id or create a new Stripe Customer."""
        if company.stripe_customer_id:
            return company.stripe_customer_id

        customer = stripe.Customer.create(
            metadata={"company_id": company.id, "company_name": company.name},
            name=company.name,
        )
        company.stripe_customer_id = customer.id
        return customer.id

    # ─── Checkout Session ───

    def create_checkout_session(self, company: Company, tier: str) -> str:
        """Create a Stripe Checkout Session and return the checkout URL."""
        if tier not in TIERS:
            raise ValueError(f"Invalid tier '{tier}'. Must be one of: {', '.join(TIERS.keys())}")

        customer_id = self._get_or_create_customer(company)
        tier_config = TIERS[tier]

        session = stripe.checkout.Session.create(
            customer=customer_id,
            mode="subscription",
            line_items=[
                {
                    "price": tier_config["price_id"],
                    "quantity": 1,
                }
            ],
            metadata={
                "company_id": company.id,
                "tier": tier,
            },
            success_url="http://localhost:8000/billing/success?session_id={CHECKOUT_SESSION_ID}",
            cancel_url="http://localhost:8000/billing/cancel",
        )

        return session.url

    # ─── Webhook Handler ───

    def handle_webhook(self, payload: bytes, sig_header: str) -> dict:
        """
        Verify and process a Stripe webhook event.
        Updates the Company model's subscription fields.
        Returns a dict with event type and any relevant data.
        """
        if not settings.STRIPE_WEBHOOK_SECRET:
            raise ValueError("STRIPE_WEBHOOK_SECRET is not configured")

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except stripe.error.SignatureVerificationError:
            raise ValueError("Invalid webhook signature")

        event_type = event["type"]
        data = event["data"]["object"]

        # We need the company — import here to avoid circular imports at module level
        from sqlalchemy.orm import Session
        from app.database import async_session
        import asyncio

        # Handle synchronously since Stripe webhooks arrive over HTTP sync context
        # We use an internal helper to update the DB
        result = {"type": event_type, "handled": False}

        if event_type == "checkout.session.completed":
            metadata = data.get("metadata", {})
            company_id = metadata.get("company_id")
            tier = metadata.get("tier")
            subscription_id = data.get("subscription")

            if company_id and tier:
                self._update_subscription(
                    company_id=company_id,
                    subscription_tier=tier,
                    subscription_status="active",
                    stripe_subscription_id=subscription_id,
                )
                result["handled"] = True

        elif event_type == "customer.subscription.updated":
            subscription_id = data.get("id")
            status = data.get("status")
            # Map Stripe statuses to our model
            status_map = {
                "active": "active",
                "past_due": "past_due",
                "canceled": "cancelled",
                "incomplete": "inactive",
                "incomplete_expired": "inactive",
                "trialing": "active",
                "unpaid": "past_due",
            }
            mapped_status = status_map.get(status, "inactive")
            company = self._find_company_by_subscription(subscription_id)
            if company:
                self._update_subscription(
                    company_id=company.id,
                    subscription_status=mapped_status,
                )
                result["handled"] = True

        elif event_type == "customer.subscription.deleted":
            subscription_id = data.get("id")
            company = self._find_company_by_subscription(subscription_id)
            if company:
                self._update_subscription(
                    company_id=company.id,
                    subscription_status="cancelled",
                    subscription_tier="free",
                    stripe_subscription_id=None,
                )
                result["handled"] = True

        elif event_type == "invoice.payment_succeeded":
            # Payment confirmed — ensure status is active
            subscription_id = data.get("subscription")
            company = self._find_company_by_subscription(subscription_id)
            if company:
                self._update_subscription(
                    company_id=company.id,
                    subscription_status="active",
                )
                result["handled"] = True

        elif event_type == "invoice.payment_failed":
            subscription_id = data.get("subscription")
            company = self._find_company_by_subscription(subscription_id)
            if company:
                self._update_subscription(
                    company_id=company.id,
                    subscription_status="past_due",
                )
                result["handled"] = True

        return result

    # ─── Cancel Subscription ───

    def cancel_subscription(self, company: Company) -> dict:
        """Cancel a subscription at the end of the current billing period."""
        if not company.stripe_subscription_id:
            raise ValueError("Company has no active subscription")

        subscription = stripe.Subscription.modify(
            company.stripe_subscription_id,
            cancel_at_period_end=True,
        )

        from app.database import async_session
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            async def _cancel():
                async with async_session() as session:
                    result = await session.get(Company, company.id)
                    if result:
                        result.subscription_status = "cancelled"
                        await session.commit()
            loop.run_until_complete(_cancel())
        finally:
            loop.close()

        return {
            "subscription_id": subscription.id,
            "status": subscription.status,
            "cancel_at_period_end": subscription.cancel_at_period_end,
            "current_period_end": datetime.fromtimestamp(
                subscription.current_period_end
            ).isoformat(),
        }

    # ─── Get Subscription Status ───

    def get_subscription_status(self, company: Company) -> dict:
        """Return the current subscription status and period end date."""
        status = company.subscription_status or "inactive"
        tier = company.subscription_tier or "free"
        period_end = None

        if company.stripe_subscription_id and status == "active":
            try:
                subscription = stripe.Subscription.retrieve(
                    company.stripe_subscription_id
                )
                period_end = datetime.fromtimestamp(
                    subscription.current_period_end
                ).isoformat()
            except stripe.error.StripeError:
                pass

        return {
            "tier": tier,
            "status": status,
            "period_end": period_end,
            "stripe_customer_id": company.stripe_customer_id,
            "stripe_subscription_id": company.stripe_subscription_id,
        }

    # ─── Internal DB helpers ───

    def _update_subscription(
        self,
        company_id: str,
        subscription_tier: Optional[str] = None,
        subscription_status: Optional[str] = None,
        stripe_subscription_id: Optional[str] = None,
    ):
        """Update Company subscription fields in the database."""
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            async def _update():
                from app.database import async_session
                async with async_session() as session:
                    company = await session.get(Company, company_id)
                    if not company:
                        return
                    if subscription_tier is not None:
                        company.subscription_tier = subscription_tier
                    if subscription_status is not None:
                        company.subscription_status = subscription_status
                    if stripe_subscription_id is not None:
                        company.stripe_subscription_id = stripe_subscription_id
                    await session.commit()
            loop.run_until_complete(_update())
        finally:
            loop.close()

    def _find_company_by_subscription(self, subscription_id: str) -> Optional[Company]:
        """Find a Company by its Stripe subscription ID."""
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            async def _find():
                from sqlalchemy import select
                from app.database import async_session
                async with async_session() as session:
                    result = await session.execute(
                        select(Company).where(
                            Company.stripe_subscription_id == subscription_id
                        )
                    )
                    return result.scalar_one_or_none()
            return loop.run_until_complete(_find())
        finally:
            loop.close()
