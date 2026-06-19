from __future__ import annotations

import quopri
from dataclasses import dataclass, field
from datetime import datetime, timezone
from email.utils import parseaddr
from typing import Any


@dataclass
class ParsedEmail:
    sender_email: str
    subject: str
    body_text: str
    body_html: str | None = None
    attachments: list[dict[str, Any]] = field(default_factory=list)
    headers: dict[str, str] = field(default_factory=dict)
    external_message_id: str | None = None
    received_at: datetime | None = None


class SendGridEmailParser:
    """Parse SendGrid Inbound Parse multipart payloads into structured email data."""

    @staticmethod
    def parse(form_data: dict[str, Any]) -> ParsedEmail:
        raw_body = str(form_data.get("text", "") or "")
        decoded_body = SendGridEmailParser._decode_quoted_printable(raw_body)

        from_field = str(form_data.get("from", "") or "")
        _, sender_email = parseaddr(from_field)
        if not sender_email:
            sender_email = from_field.strip()

        raw_headers = str(form_data.get("headers", "") or "")
        parsed_headers = SendGridEmailParser._parse_headers(raw_headers)

        # SendGrid typically includes "Message-ID" in headers; this is fallback.
        external_message_id = (
            str(form_data.get("message_id", "") or "").strip()
            or parsed_headers.get("message-id")
        )

        return ParsedEmail(
            sender_email=sender_email,
            subject=str(form_data.get("subject", "(No Subject)") or "(No Subject)"),
            body_text=decoded_body,
            body_html=str(form_data.get("html", "") or "") or None,
            attachments=SendGridEmailParser._extract_attachments(form_data),
            headers=parsed_headers,
            external_message_id=external_message_id or None,
            received_at=datetime.now(timezone.utc),
        )

    @staticmethod
    def _decode_quoted_printable(value: str) -> str:
        # Attempt quoted-printable decoding safely; fallback to original text.
        try:
            if "=" in value:
                return quopri.decodestring(value.encode("utf-8")).decode("utf-8", errors="replace")
        except Exception:
            return value
        return value

    @staticmethod
    def _parse_headers(raw_headers: str) -> dict[str, str]:
        headers: dict[str, str] = {}
        if not raw_headers:
            return headers

        for line in raw_headers.splitlines():
            if ":" not in line:
                continue
            key, val = line.split(":", 1)
            headers[key.strip().lower()] = val.strip()

        return headers

    @staticmethod
    def _extract_attachments(form_data: dict[str, Any]) -> list[dict[str, Any]]:
        attachments: list[dict[str, Any]] = []

        # SendGrid may provide attachment-info JSON with metadata.
        raw_info = form_data.get("attachment-info")
        if raw_info:
            try:
                import json

                info = json.loads(raw_info)
                for filename, meta in info.items():
                    attachments.append(
                        {
                            "filename": filename,
                            "type": meta.get("type"),
                            "size": meta.get("size"),
                        }
                    )
            except Exception:
                pass

        # Fallback: include form keys that look like attachment payloads.
        for key, value in form_data.items():
            if str(key).lower().startswith("attachment"):
                attachments.append(
                    {
                        "filename": str(key),
                        "content_preview": str(value)[:120],
                    }
                )

        return attachments
