from __future__ import annotations
import os
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

import httpx

PAYPAL_CLIENT_ID = os.getenv("PAYPAL_CLIENT_ID", "")
PAYPAL_CLIENT_SECRET = os.getenv("PAYPAL_CLIENT_SECRET", "")
PAYPAL_API_BASE = os.getenv("PAYPAL_API_BASE", "https://api-m.sandbox.paypal.com")

async def get_paypal_access_token() -> str:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{PAYPAL_API_BASE}/v1/oauth2/token",
            auth=(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET),
            data={"grant_type": "client_credentials"},
        )
        return resp.json()["access_token"]


@dataclass
class Subscription:
    id: str
    user_id: str
    paypal_subscription_id: str | None = None
    paypal_plan_id: str | None = None
    plan_tier: str = "starter"
    billing_interval: str = "month"
    status: str = "trialing"
    current_period_end: datetime | None = None
    trial_end: datetime | None = None
    cancel_at_period_end: bool = False
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class SubscriptionService:
    def __init__(self):
        self._store: dict[str, Subscription] = {}

    async def create(self, user_id: str, plan_tier: str = "starter", billing_interval: str = "month") -> Subscription:
        sub = Subscription(
            id=str(uuid.uuid4()),
            user_id=user_id,
            plan_tier=plan_tier,
            billing_interval=billing_interval,
            status="trialing",
            trial_end=datetime.now(timezone.utc) + __import__("datetime").timedelta(days=14),
        )
        self._store[sub.id] = sub
        return sub

    async def get_by_user_id(self, user_id: str) -> Subscription | None:
        for sub in self._store.values():
            if sub.user_id == user_id:
                return sub
        return None

    async def update_status(self, paypal_subscription_id: str, status: str, **kwargs):
        for sub in self._store.values():
            if sub.paypal_subscription_id == paypal_subscription_id:
                sub.status = status
                sub.updated_at = datetime.now(timezone.utc)
                for k, v in kwargs.items():
                    setattr(sub, k, v)
                return sub
        return None

    async def create_paypal_subscription(self, user_id: str, plan_id: str, email: str) -> dict:
        token = await get_paypal_access_token()
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{PAYPAL_API_BASE}/v1/billing/subscriptions",
                json={
                    "plan_id": plan_id,
                    "subscriber": {"email_address": email},
                    "application_context": {
                        "user_action": "SUBSCRIBE_NOW",
                        "payment_method": {"payer_selected": "PAYPAL", "payee_preferred": "IMMEDIATE_PAYMENT_REQUIRED"},
                    },
                },
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            )
            data = resp.json()
        sub_id = data["id"]
        sub = Subscription(
            id=str(uuid.uuid4()), user_id=user_id, paypal_subscription_id=sub_id,
            paypal_plan_id=plan_id, status="approval_pending",
        )
        self._store[sub.id] = sub
        approval_url = next(link["href"] for link in data["links"] if link["rel"] == "approve")
        return {"approval_url": approval_url, "subscription_id": sub_id}


subscription_service = SubscriptionService()