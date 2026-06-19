from __future__ import annotations

from app.config import get_settings
from app.database import async_session_factory
from app.services.knowledge_base import (
    DatabaseKnowledgeBaseService,
    KnowledgeBaseService,
    KnowledgeBaseServiceProtocol,
)
from app.services.tickets import DatabaseTicketService, TicketService, TicketServiceProtocol

settings = get_settings()

_ticket_service: TicketServiceProtocol
_kb_service: KnowledgeBaseServiceProtocol

if settings.USE_DATABASE:
    _ticket_service = DatabaseTicketService(async_session_factory)
    _kb_service = DatabaseKnowledgeBaseService(async_session_factory)
else:
    _ticket_service = TicketService()
    _kb_service = KnowledgeBaseService()


def get_ticket_service() -> TicketServiceProtocol:
    return _ticket_service


def get_kb_service() -> KnowledgeBaseServiceProtocol:
    return _kb_service
