from datetime import datetime, timezone

from fastapi import APIRouter, Request

from app.models.schemas import (
    AnalyticsSummaryResponse,
    EmailIngestRequest,
    EmailIngestResponse,
    KnowledgeBaseDocumentCreate,
    KnowledgeBaseDocumentResponse,
    TicketClaimRequest,
    TicketResponse,
)
from app.services import get_kb_service, get_ticket_service
from app.services.email_parser import SendGridEmailParser
from app.services.slack_handler import SlackService
from app.services.triage_agent import LangChainTriageAgent

router = APIRouter(prefix="/api/v1")
triage_agent = LangChainTriageAgent()
slack_service = SlackService()


@router.post("/kb/documents", response_model=KnowledgeBaseDocumentResponse, tags=["Knowledge Base"])
async def upload_kb_document(payload: KnowledgeBaseDocumentCreate) -> KnowledgeBaseDocumentResponse:
    kb_service = get_kb_service()
    document = await kb_service.add_document(payload)
    return KnowledgeBaseDocumentResponse(
        id=document.id,
        title=document.title,
        source=document.source,
        created_at=document.created_at,
    )


@router.post("/ingest/email", response_model=EmailIngestResponse, tags=["Ingestion"])
async def ingest_email(payload: EmailIngestRequest) -> EmailIngestResponse:
    ticket_service = get_ticket_service()
    kb_service = get_kb_service()

    triage_result = triage_agent.classify(payload)
    ticket = await ticket_service.create_ticket(payload, triage_result)

    matches = await kb_service.search(query=f"{payload.subject}\n{payload.body}", top_k=3)

    auto_reply_sent = False
    suggested_reply: str | None = None
    if triage_result.confidence >= 0.85 and matches:
        suggested_reply = triage_agent.generate_auto_reply(payload, matches)
        ticket = await ticket_service.mark_auto_replied(ticket.id, suggested_reply)
        auto_reply_sent = True
    else:
        # Route to Slack for human claim when confidence is below auto-reply threshold.
        slack_service.post_ticket_to_channel(ticket)

    return EmailIngestResponse(
        ticket=ticket_service.to_response(ticket),
        auto_reply_sent=auto_reply_sent,
        suggested_reply=suggested_reply,
        kb_matches=matches,
    )


@router.get("/tickets", response_model=list[TicketResponse], tags=["Tickets"])
async def list_tickets() -> list[TicketResponse]:
    ticket_service = get_ticket_service()
    tickets = await ticket_service.list_tickets()
    return [ticket_service.to_response(ticket) for ticket in tickets]


@router.get("/tickets/{ticket_id}", response_model=TicketResponse, tags=["Tickets"])
async def get_ticket(ticket_id: str) -> TicketResponse:
    ticket_service = get_ticket_service()
    ticket = await ticket_service.get_ticket(ticket_id)
    return ticket_service.to_response(ticket)


@router.post("/tickets/{ticket_id}/claim", response_model=TicketResponse, tags=["Tickets"])
async def claim_ticket(ticket_id: str, payload: TicketClaimRequest) -> TicketResponse:
    ticket_service = get_ticket_service()
    ticket = await ticket_service.claim_ticket(ticket_id=ticket_id, payload=payload)
    return ticket_service.to_response(ticket)


@router.post("/ingest/sendgrid", tags=["Ingestion"])
async def ingest_sendgrid(request: Request) -> dict:
    """SendGrid Inbound Parse webhook — parse email and run triage pipeline."""
    form = await request.form()
    form_dict = dict(form)

    parsed = SendGridEmailParser.parse(form_dict)

    ingest_request = EmailIngestRequest(
        sender_email=parsed.sender_email,
        subject=parsed.subject,
        body=parsed.body_text,
        received_at=parsed.received_at or datetime.now(timezone.utc),
        external_message_id=parsed.external_message_id,
    )

    ticket_service = get_ticket_service()
    kb_service = get_kb_service()

    triage_result = triage_agent.classify(ingest_request)
    ticket = await ticket_service.create_ticket(ingest_request, triage_result)

    matches = await kb_service.search(query=f"{parsed.subject}\n{parsed.body_text}", top_k=3)

    auto_reply_sent = False
    if triage_result.confidence >= 0.85 and matches:
        suggested_reply = triage_agent.generate_auto_reply(ingest_request, matches)
        ticket = await ticket_service.mark_auto_replied(ticket.id, suggested_reply)
        auto_reply_sent = True

    if not auto_reply_sent:
        slack_service.post_ticket_to_channel(ticket)

    return {"status": "ok", "ticket_id": ticket.id}


@router.get("/analytics/summary", response_model=AnalyticsSummaryResponse, tags=["Analytics"])
async def analytics_summary() -> AnalyticsSummaryResponse:
    ticket_service = get_ticket_service()
    return await ticket_service.analytics_summary()