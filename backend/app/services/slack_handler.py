from __future__ import annotations

import os
from typing import Any

from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError


class SlackService:
    """Slack helper for ticket routing cards, slash responses, and interaction parsing."""

    def __init__(self, bot_token: str | None = None) -> None:
        token = bot_token or os.getenv("SLACK_BOT_TOKEN")
        self._client = WebClient(token=token) if token else None
        self._dashboard_base_url = os.getenv("DASHBOARD_BASE_URL", "http://localhost:5173")
        self._default_channel = os.getenv("SLACK_SUPPORT_CHANNEL", "#support")

    def post_ticket_to_channel(self, ticket: Any, channel: str | None = None) -> bool:
        """Post a formatted ticket routing card to Slack."""
        if self._client is None:
            return False

        target_channel = channel or self._default_channel
        blocks = self._build_ticket_blocks(ticket)

        try:
            self._client.chat_postMessage(
                channel=target_channel,
                text=f"New ticket requires review: {ticket.subject}",
                blocks=blocks,
            )
            return True
        except SlackApiError:
            return False

    def _build_ticket_blocks(self, ticket: Any) -> list[dict[str, Any]]:
        sentiment_emoji = {
            "positive": "😊",
            "neutral": "😐",
            "negative": "😠",
        }

        confidence_percent = round(float(getattr(ticket, "confidence", 0.0)) * 100)
        dashboard_url = f"{self._dashboard_base_url.rstrip('/')}/tickets/{ticket.id}"

        return [
            {
                "type": "header",
                "text": {"type": "plain_text", "text": "🎫 New Ticket Requires Human Review"},
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Ticket:*\n#{str(ticket.id)[:8]}"},
                    {"type": "mrkdwn", "text": f"*Category:*\n{ticket.category}"},
                    {
                        "type": "mrkdwn",
                        "text": f"*Sentiment:*\n{sentiment_emoji.get(ticket.sentiment, '😐')} {ticket.sentiment}",
                    },
                    {"type": "mrkdwn", "text": f"*From:*\n{ticket.sender_email}"},
                    {"type": "mrkdwn", "text": f"*AI Confidence:*\n{confidence_percent}%"},
                ],
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Subject:* {ticket.subject}\n*Summary:* {ticket.summary[:200]}",
                },
            },
            {
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {"type": "plain_text", "text": "👤 Claim Ticket"},
                        "style": "primary",
                        "value": f"claim:{ticket.id}",
                        "action_id": "claim_ticket",
                    },
                    {
                        "type": "button",
                        "text": {"type": "plain_text", "text": "📋 View in Dashboard"},
                        "url": dashboard_url,
                        "action_id": "view_ticket",
                    },
                ],
            },
        ]

    @staticmethod
    def parse_interaction_payload(payload: dict[str, Any]) -> dict[str, str | None]:
        action = (payload.get("actions") or [{}])[0]
        raw_value = str(action.get("value") or "")
        action_parts = raw_value.split(":", 1)

        return {
            "action_id": action.get("action_id"),
            "entity_type": action_parts[0] if action_parts else None,
            "entity_id": action_parts[1] if len(action_parts) > 1 else None,
            "user_id": payload.get("user", {}).get("id"),
            "user_name": payload.get("user", {}).get("username")
            or payload.get("user", {}).get("name")
            or payload.get("user", {}).get("id"),
            "channel_id": payload.get("channel", {}).get("id"),
            "response_url": payload.get("response_url"),
        }

    @staticmethod
    def format_recent_tickets_response(tickets: list[Any]) -> dict[str, str]:
        if not tickets:
            return {"response_type": "ephemeral", "text": "No tickets yet."}

        lines = [f"• #{str(ticket.id)[:8]} — {ticket.subject[:60]} ({ticket.status})" for ticket in tickets]
        return {
            "response_type": "ephemeral",
            "text": "📋 *Recent Tickets:*\n" + "\n".join(lines),
        }

    @staticmethod
    def format_stats_response(analytics: Any) -> dict[str, str]:
        return {
            "response_type": "ephemeral",
            "text": (
                "📊 *NovaMind AI Stats*\n"
                f"Total: {analytics.total_tickets} | "
                f"Resolved: {analytics.resolved_tickets} | "
                f"Open: {analytics.unresolved_tickets}"
            ),
        }

    @staticmethod
    def format_kb_search_response(query: str, matches: list[Any]) -> dict[str, str]:
        if not matches:
            return {
                "response_type": "ephemeral",
                "text": f"No knowledge-base matches found for *{query}*.",
            }

        lines = [f"• {match.title} (score={match.score})" for match in matches]
        return {
            "response_type": "ephemeral",
            "text": f"🔎 *KB Results for:* `{query}`\n" + "\n".join(lines),
        }

    @staticmethod
    def format_help_response(message: str | None = None) -> dict[str, str]:
        prefix = f"{message}\n\n" if message else ""
        return {
            "response_type": "ephemeral",
            "text": (
                prefix
                + "🔍 *NovaMind AI Commands*\n"
                "`/novamind recent` — Show recent tickets\n"
                "`/novamind stats` — Show summary stats\n"
                "`/novamind search <query>` — Search KB"
            ),
        }
