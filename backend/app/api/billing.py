import json
import os
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.services.subscriptions import subscription_service as svc

router = APIRouter(prefix="/api/v1/billing", tags=["Billing"])
PAYPAL_API_BASE = os.getenv("PAYPAL_API_BASE", "https://api-m.sandbox.paypal.com")

class CreateSubscriptionRequest(BaseModel):
    plan_id: str
    user_id: str
    email: str

class CreateSubscriptionResponse(BaseModel):
    approval_url: str
    subscription_id: str

class SubscriptionResponse(BaseModel):
    id: str
    plan_tier: str
    status: str
    cancel_at_period_end: bool = False

@router.post("/create-subscription", response_model=CreateSubscriptionResponse)
async def create_subscription(payload: CreateSubscriptionRequest):
    result = await svc.create_paypal_subscription(payload.user_id, payload.plan_id, payload.email)
    return CreateSubscriptionResponse(**result)

@router.get("/subscription/{user_id}", response_model=SubscriptionResponse)
async def get_subscription(user_id: str):
    sub = await svc.get_by_user_id(user_id)
    if not sub:
        return SubscriptionResponse(id="", plan_tier="free", status="none")
    return SubscriptionResponse(id=sub.id, plan_tier=sub.plan_tier, status=sub.status, cancel_at_period_end=sub.cancel_at_period_end)

@router.post("/token")
async def get_paypal_token():
    """Get a PayPal access token for client-side operations."""
    from app.services.subscriptions import get_paypal_access_token
    token = await get_paypal_access_token()
    return {"access_token": token}

@router.post("/cancel/{subscription_id}")
async def cancel_subscription(subscription_id: str):
    """Cancel a PayPal subscription."""
    token = await get_paypal_access_token()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{PAYPAL_API_BASE}/v1/billing/subscriptions/{subscription_id}/cancel",
            json={"reason": "Customer requested cancellation"},
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        )
        if not resp.ok:
            raise HTTPException(status_code=400, detail="Failed to cancel subscription")
    await svc.update_status(subscription_id, "canceled")
    return {"status": "canceled"}

@router.post("/webhook")
async def paypal_webhook(request: Request):
    payload_raw = await request.body()
    event = json.loads(payload_raw)
    resource = event.get("resource", {})
    event_type = event.get("event_type", "")
    sub_id = resource.get("id", "")
    status_map = {
        "BILLING.SUBSCRIPTION.CREATED": "trialing",
        "BILLING.SUBSCRIPTION.ACTIVATED": "active",
        "BILLING.SUBSCRIPTION.UPDATED": "active",
        "BILLING.SUBSCRIPTION.CANCELLED": "canceled",
        "BILLING.SUBSCRIPTION.SUSPENDED": "suspended",
    }
    if event_type in status_map and sub_id:
        await svc.update_status(sub_id, status_map[event_type])
    return {"received": True}/home/engine/.bashrc: line 1: syntax error near unexpected token `('
