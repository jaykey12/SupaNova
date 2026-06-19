from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

IntentCategory = Literal["billing", "technical", "feature_request", "complaint", "other"]
SentimentLabel = Literal["positive", "neutral", "negative"]
TicketStatus = Literal["new", "auto_replied", "claimed", "resolved"]


class EmailIngestRequest(BaseModel):
    sender_email: EmailStr
    subject: str = Field(min_length=1, max_length=300)
    body: str = Field(min_length=1)
    received_at: datetime | None = None
    external_message_id: str | None = None


class KnowledgeBaseDocumentCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=20)
    source: str | None = Field(default=None, max_length=400)


class KnowledgeBaseDocumentResponse(BaseModel):
    id: str
    title: str
    source: str | None = None
    created_at: datetime


class KnowledgeBaseMatch(BaseModel):
    document_id: str
    title: str
    source: str | None = None
    score: float
    snippet: str


class TicketClaimRequest(BaseModel):
    agent_id: str = Field(min_length=1, max_length=120)
    agent_name: str | None = Field(default=None, max_length=120)


class TicketResponse(BaseModel):
    id: str
    sender_email: EmailStr
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


class EmailIngestResponse(BaseModel):
    ticket: TicketResponse
    auto_reply_sent: bool
    suggested_reply: str | None = None
    kb_matches: list[KnowledgeBaseMatch] = Field(default_factory=list)


class CategoryBreakdown(BaseModel):
    billing: int = 0
    technical: int = 0
    feature_request: int = 0
    complaint: int = 0
    other: int = 0


class AnalyticsSummaryResponse(BaseModel):
    total_tickets: int
    resolved_tickets: int
    unresolved_tickets: int
    avg_first_response_seconds: float | None
    by_category: CategoryBreakdown


class TriageResult(BaseModel):
    category: IntentCategory
    sentiment: SentimentLabel
    confidence: float
    summary: str
