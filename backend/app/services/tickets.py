from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Protocol

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.db_models import TicketModel
from app.models.schemas import (
    AnalyticsSummaryResponse,
    CategoryBreakdown,
    EmailIngestRequest,
    IntentCategory,
    SentimentLabel,
    TicketClaimRequest,
    TicketResponse,
    TicketStatus,
    TriageResult,
)


@dataclass
class Ticket:
    id: str
    sender_email: str
    subject: str
    body: str
    category: IntentCategory
    sentiment: SentimentLabel
    confidence: float
    summary: str
    status: TicketStatus
    created_at: datetime
    claimed_by: str | None = None
    claimed_at: datetime | None = None
    first_response_at: datetime | None = None
    auto_reply_text: str | None = None


class TicketServiceProtocol(Protocol):
    async def create_ticket(self, payload: EmailIngestRequest, triage: TriageResult) -> Ticket: ...
    async def mark_auto_replied(self, ticket_id: str, reply_text: str) -> Ticket: ...
    async def claim_ticket(self, ticket_id: str, payload: TicketClaimRequest) -> Ticket: ...
    async def get_ticket(self, ticket_id: str) -> Ticket: ...
    async def list_tickets(self) -> list[Ticket]: ...
    async def analytics_summary(self) -> AnalyticsSummaryResponse: ...
    def to_response(self, ticket: Ticket) -> TicketResponse: ...


class TicketService:
    """In-memory ticket service retained for graceful migration fallback."""

    def __init__(self) -> None:
        self._tickets: dict[str, Ticket] = {}

    async def create_ticket(self, payload: EmailIngestRequest, triage: TriageResult) -> Ticket:
        ticket = Ticket(
            id=str(uuid.uuid4()),
            sender_email=str(payload.sender_email),
            subject=payload.subject,
            body=payload.body,
            category=triage.category,
            sentiment=triage.sentiment,
            confidence=triage.confidence,
            summary=triage.summary,
            status="new",
            created_at=datetime.now(timezone.utc),
        )
        self._tickets[ticket.id] = ticket
        return ticket

    async def mark_auto_replied(self, ticket_id: str, reply_text: str) -> Ticket:
        ticket = await self.get_ticket(ticket_id)
        ticket.status = "auto_replied"
        ticket.auto_reply_text = reply_text
        ticket.first_response_at = datetime.now(timezone.utc)
        return ticket

    async def claim_ticket(self, ticket_id: str, payload: TicketClaimRequest) -> Ticket:
        ticket = await self.get_ticket(ticket_id)

        if ticket.status == "resolved":
            raise HTTPException(status_code=409, detail="Resolved tickets cannot be claimed")

        ticket.status = "claimed"
        ticket.claimed_by = payload.agent_name or payload.agent_id
        ticket.claimed_at = datetime.now(timezone.utc)
        if ticket.first_response_at is None:
            ticket.first_response_at = ticket.claimed_at
        return ticket

    async def get_ticket(self, ticket_id: str) -> Ticket:
        ticket = self._tickets.get(ticket_id)
        if ticket is None:
            raise HTTPException(status_code=404, detail=f"Ticket '{ticket_id}' was not found")
        return ticket

    async def list_tickets(self) -> list[Ticket]:
        return sorted(self._tickets.values(), key=lambda ticket: ticket.created_at, reverse=True)

    def to_response(self, ticket: Ticket) -> TicketResponse:
        return _ticket_to_response(ticket)

    async def analytics_summary(self) -> AnalyticsSummaryResponse:
        return _build_analytics_summary(list(self._tickets.values()))


class DatabaseTicketService:
    """PostgreSQL-backed ticket service using async SQLAlchemy."""

    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self._session_factory = session_factory

    async def create_ticket(self, payload: EmailIngestRequest, triage: TriageResult) -> Ticket:
        model = TicketModel(
            sender_email=str(payload.sender_email),
            subject=payload.subject,
            body=payload.body,
            category=triage.category,
            sentiment=triage.sentiment,
            confidence=triage.confidence,
            summary=triage.summary,
            status="new",
        )

        async with self._session_factory() as session:
            session.add(model)
            await session.commit()
            await session.refresh(model)
            return _model_to_ticket(model)

    async def mark_auto_replied(self, ticket_id: str, reply_text: str) -> Ticket:
        async with self._session_factory() as session:
            model = await _load_ticket_model(session, ticket_id)
            model.status = "auto_replied"
            model.auto_reply_text = reply_text
            model.first_response_at = datetime.now(timezone.utc)

            await session.commit()
            await session.refresh(model)
            return _model_to_ticket(model)

    async def claim_ticket(self, ticket_id: str, payload: TicketClaimRequest) -> Ticket:
        async with self._session_factory() as session:
            model = await _load_ticket_model(session, ticket_id)

            if model.status == "resolved":
                raise HTTPException(status_code=409, detail="Resolved tickets cannot be claimed")

            model.status = "claimed"
            model.claimed_by = payload.agent_name or payload.agent_id
            model.claimed_at = datetime.now(timezone.utc)
            if model.first_response_at is None:
                model.first_response_at = model.claimed_at

            await session.commit()
            await session.refresh(model)
            return _model_to_ticket(model)

    async def get_ticket(self, ticket_id: str) -> Ticket:
        async with self._session_factory() as session:
            model = await _load_ticket_model(session, ticket_id)
            return _model_to_ticket(model)

    async def list_tickets(self) -> list[Ticket]:
        async with self._session_factory() as session:
            result = await session.execute(select(TicketModel).order_by(TicketModel.created_at.desc()))
            return [_model_to_ticket(row) for row in result.scalars().all()]

    def to_response(self, ticket: Ticket) -> TicketResponse:
        return _ticket_to_response(ticket)

    async def analytics_summary(self) -> AnalyticsSummaryResponse:
        tickets = await self.list_tickets()
        return _build_analytics_summary(tickets)


async def _load_ticket_model(session: AsyncSession, ticket_id: str) -> TicketModel:
    try:
        ticket_uuid = uuid.UUID(ticket_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=f"Ticket '{ticket_id}' was not found") from exc

    model = await session.get(TicketModel, ticket_uuid)
    if model is None:
        raise HTTPException(status_code=404, detail=f"Ticket '{ticket_id}' was not found")
    return model


def _model_to_ticket(model: TicketModel) -> Ticket:
    return Ticket(
        id=str(model.id),
        sender_email=model.sender_email,
        subject=model.subject,
        body=model.body,
        category=model.category,
        sentiment=model.sentiment,
        confidence=model.confidence,
        summary=model.summary,
        status=model.status,
        created_at=model.created_at,
        claimed_by=model.claimed_by,
        claimed_at=model.claimed_at,
        first_response_at=model.first_response_at,
        auto_reply_text=model.auto_reply_text,
    )


def _ticket_to_response(ticket: Ticket) -> TicketResponse:
    return TicketResponse(
        id=ticket.id,
        sender_email=ticket.sender_email,
        subject=ticket.subject,
        body=ticket.body,
        category=ticket.category,
        sentiment=ticket.sentiment,
        confidence=round(ticket.confidence, 4),
        summary=ticket.summary,
        status=ticket.status,
        created_at=ticket.created_at,
        claimed_by=ticket.claimed_by,
        claimed_at=ticket.claimed_at,
        first_response_at=ticket.first_response_at,
        auto_reply_text=ticket.auto_reply_text,
    )


def _build_analytics_summary(tickets: list[Ticket]) -> AnalyticsSummaryResponse:
    total_tickets = len(tickets)
    resolved_tickets = sum(ticket.status in {"auto_replied", "resolved"} for ticket in tickets)
    unresolved_tickets = total_tickets - resolved_tickets

    response_durations = [
        (ticket.first_response_at - ticket.created_at).total_seconds()
        for ticket in tickets
        if ticket.first_response_at is not None
    ]

    avg_first_response_seconds = None
    if response_durations:
        avg_first_response_seconds = round(sum(response_durations) / len(response_durations), 2)

    by_category = CategoryBreakdown()
    for ticket in tickets:
        setattr(by_category, ticket.category, getattr(by_category, ticket.category) + 1)

    return AnalyticsSummaryResponse(
        total_tickets=total_tickets,
        resolved_tickets=resolved_tickets,
        unresolved_tickets=unresolved_tickets,
        avg_first_response_seconds=avg_first_response_seconds,
        by_category=by_category,
    )
