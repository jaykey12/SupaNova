from __future__ import annotations

import hashlib
import hmac
import json
import os
import time
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import select

from app.config import get_settings
from app.database import async_session_factory
from app.models.db_models import SlackInstallationModel
from app.models.schemas import TicketClaimRequest
from app.services import get_kb_service, get_ticket_service
from app.services.slack_handler import SlackService

router = APIRouter(prefix="/api/v1/slack", tags=["Slack"])

settings = get_settings()
slack_service = SlackService()


def verify_slack_request(request: Request, body: bytes) -> bool:
    """Validate Slack request signature. If no secret configured, allow for local dev."""
    signing_secret = os.getenv("SLACK_SIGNING_SECRET", "")
    if not signing_secret:
        return True

    timestamp = request.headers.get("X-Slack-Request-Timestamp", "")
    signature = request.headers.get("X-Slack-Signature", "")

    if not timestamp or not signature:
        return False

    try:
        if abs(time.time() - float(timestamp)) > 300:
            return False
    except ValueError:
        return False

    sig_basestring = f"v0:{timestamp}:{body.decode('utf-8')}"
    expected = "v0=" + hmac.new(
        signing_secret.encode("utf-8"),
        sig_basestring.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(expected, signature)


async def _store_installation(
    *,
    team_id: str,
    team_name: str | None,
    bot_token: str,
    bot_user_id: str | None,
    scope: str | None,
) -> None:
    """Persist Slack OAuth installation in DB when DB mode is enabled."""
    if not settings.USE_DATABASE:
        return

    async with async_session_factory() as session:
        result = await session.execute(
            select(SlackInstallationModel).where(SlackInstallationModel.team_id == team_id)
        )
        model = result.scalar_one_or_none()

        if model is None:
            model = SlackInstallationModel(
                team_id=team_id,
                team_name=team_name,
                bot_token=bot_token,
                bot_user_id=bot_user_id,
                scope=scope,
            )
            session.add(model)
        else:
            model.team_name = team_name
            model.bot_token = bot_token
            model.bot_user_id = bot_user_id
            model.scope = scope

        await session.commit()


@router.post("/events")
async def slack_events(request: Request):
    body = await request.body()

    try:
        payload = json.loads(body.decode("utf-8") or "{}")
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid JSON payload") from exc

    if payload.get("type") == "url_verification":
        return {"challenge": payload.get("challenge")}

    if not verify_slack_request(request, body):
        raise HTTPException(status_code=401, detail="Invalid Slack signature")

    return {"ok": True}


@router.post("/interactions")
async def slack_interactions(request: Request):
    body = await request.body()
    if not verify_slack_request(request, body):
        raise HTTPException(status_code=401, detail="Invalid Slack signature")

    form = await request.form()
    raw_payload = form.get("payload")
    if not raw_payload:
        raise HTTPException(status_code=400, detail="Missing interaction payload")

    interaction = json.loads(raw_payload)
    parsed = slack_service.parse_interaction_payload(interaction)

    if parsed.get("action_id") == "claim_ticket" and parsed.get("entity_id"):
        ticket_service = get_ticket_service()
        claim_payload = TicketClaimRequest(
            agent_id=str(parsed.get("user_id") or "slack-user"),
            agent_name=str(parsed.get("user_name") or parsed.get("user_id") or "Slack Agent"),
        )

        ticket = await ticket_service.claim_ticket(str(parsed["entity_id"]), claim_payload)
        confirmation = {
            "response_type": "ephemeral",
            "text": f"✅ You've claimed Ticket #{str(ticket.id)[:8]}",
        }

        response_url = parsed.get("response_url")
        if response_url:
            async with httpx.AsyncClient(timeout=10) as client:
                try:
                    await client.post(str(response_url), json=confirmation)
                except httpx.HTTPError:
                    pass

        return {"ok": True, "ticket_id": ticket.id}

    return {"ok": True}


@router.post("/slash")
async def slack_slash_command(request: Request):
    body = await request.body()
    if not verify_slack_request(request, body):
        raise HTTPException(status_code=401, detail="Invalid Slack signature")

    form = await request.form()
    text = (form.get("text") or "").strip()

    parts = text.split(maxsplit=1)
    subcommand = parts[0].lower() if parts and parts[0] else "help"

    ticket_service = get_ticket_service()
    kb_service = get_kb_service()

    if subcommand == "recent":
        tickets = await ticket_service.list_tickets()
        return slack_service.format_recent_tickets_response(tickets[:5])

    if subcommand == "stats":
        analytics = await ticket_service.analytics_summary()
        return slack_service.format_stats_response(analytics)

    if subcommand == "search":
        if len(parts) < 2 or not parts[1].strip():
            return slack_service.format_help_response("Please provide a search query.")
        query = parts[1].strip()
        matches = await kb_service.search(query=query, top_k=5)
        return slack_service.format_kb_search_response(query, matches)

    return slack_service.format_help_response()


@router.get("/install")
async def slack_install():
    client_id = os.getenv("SLACK_CLIENT_ID", "")
    if not client_id:
        raise HTTPException(status_code=400, detail="SLACK_CLIENT_ID is not configured")

    redirect_uri = os.getenv(
        "SLACK_REDIRECT_URI",
        "http://localhost:8000/api/v1/slack/oauth/callback",
    )

    params = urlencode(
        {
            "client_id": client_id,
            "scope": "chat:write,chat:write.public,channels:read,commands,im:write",
            "redirect_uri": redirect_uri,
        }
    )

    return RedirectResponse(f"https://slack.com/oauth/v2/authorize?{params}")


@router.get("/oauth/callback")
async def slack_oauth_callback(code: str):
    client_id = os.getenv("SLACK_CLIENT_ID", "")
    client_secret = os.getenv("SLACK_CLIENT_SECRET", "")
    redirect_uri = os.getenv(
        "SLACK_REDIRECT_URI",
        "http://localhost:8000/api/v1/slack/oauth/callback",
    )

    if not client_id or not client_secret:
        raise HTTPException(status_code=500, detail="Slack OAuth credentials are not configured")

    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(
            "https://slack.com/api/oauth.v2.access",
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "redirect_uri": redirect_uri,
            },
        )

    payload = response.json()
    if not payload.get("ok"):
        raise HTTPException(status_code=400, detail=f"Slack OAuth failed: {payload.get('error', 'unknown_error')}")

    team = payload.get("team", {})
    team_id = team.get("id")
    bot_token = payload.get("access_token")

    if not team_id or not bot_token:
        raise HTTPException(status_code=400, detail="Slack OAuth response missing team/token details")

    await _store_installation(
        team_id=team_id,
        team_name=team.get("name"),
        bot_token=bot_token,
        bot_user_id=payload.get("bot_user_id"),
        scope=payload.get("scope"),
    )

    return {
        "ok": True,
        "team_id": team_id,
        "team_name": team.get("name"),
    }
