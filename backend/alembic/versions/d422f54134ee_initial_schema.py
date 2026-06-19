"""initial_schema

Revision ID: d422f54134ee
Revises:
Create Date: 2026-05-22 18:09:13.694788

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "d422f54134ee"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


ticket_category = sa.Enum(
    "billing",
    "technical",
    "feature_request",
    "complaint",
    "other",
    name="ticket_category",
)

ticket_sentiment = sa.Enum(
    "positive",
    "neutral",
    "negative",
    name="ticket_sentiment",
)

ticket_status = sa.Enum(
    "new",
    "auto_replied",
    "claimed",
    "resolved",
    name="ticket_status",
)


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')

    bind = op.get_bind()
    ticket_category.create(bind, checkfirst=True)
    ticket_sentiment.create(bind, checkfirst=True)
    ticket_status.create(bind, checkfirst=True)

    op.create_table(
        "tickets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("sender_email", sa.String(length=320), nullable=False),
        sa.Column("subject", sa.String(length=300), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("category", ticket_category, nullable=False),
        sa.Column("sentiment", ticket_sentiment, nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False, server_default="0"),
        sa.Column("summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", ticket_status, nullable=False, server_default="new"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("claimed_by", sa.String(length=120), nullable=True),
        sa.Column("claimed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("first_response_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("auto_reply_text", sa.Text(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("conversation", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("notes", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
    )

    op.create_index("idx_tickets_status", "tickets", ["status"])
    op.create_index("idx_tickets_category", "tickets", ["category"])
    op.create_index("idx_tickets_created_at", "tickets", ["created_at"])
    op.create_index("idx_tickets_sender_email", "tickets", ["sender_email"])

    op.create_table(
        "kb_documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("source", sa.String(length=400), nullable=True),
        sa.Column("embedding", Vector(1536), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )

    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_kb_documents_embedding "
        "ON kb_documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)"
    )

    op.create_table(
        "slack_installations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("team_id", sa.String(length=80), nullable=False, unique=True),
        sa.Column("team_name", sa.String(length=200), nullable=True),
        sa.Column("bot_token", sa.Text(), nullable=False),
        sa.Column("bot_user_id", sa.String(length=80), nullable=True),
        sa.Column("installed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("scope", sa.String(length=200), nullable=True),
    )

    op.create_index("idx_slack_installations_team_id", "slack_installations", ["team_id"])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("idx_slack_installations_team_id", table_name="slack_installations")
    op.drop_table("slack_installations")

    op.drop_index("idx_kb_documents_embedding", table_name="kb_documents")
    op.drop_table("kb_documents")

    op.drop_index("idx_tickets_sender_email", table_name="tickets")
    op.drop_index("idx_tickets_created_at", table_name="tickets")
    op.drop_index("idx_tickets_category", table_name="tickets")
    op.drop_index("idx_tickets_status", table_name="tickets")
    op.drop_table("tickets")

    bind = op.get_bind()
    ticket_status.drop(bind, checkfirst=True)
    ticket_sentiment.drop(bind, checkfirst=True)
    ticket_category.drop(bind, checkfirst=True)
