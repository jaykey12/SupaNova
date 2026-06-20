-- Phase 2 schema for Kutane AI
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE ticket_category AS ENUM (
    'billing', 'technical', 'feature_request', 'complaint', 'other'
);

CREATE TYPE ticket_sentiment AS ENUM (
    'positive', 'neutral', 'negative'
);

CREATE TYPE ticket_status AS ENUM (
    'new', 'auto_replied', 'claimed', 'resolved'
);

CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_email VARCHAR(320) NOT NULL,
    subject VARCHAR(300) NOT NULL,
    body TEXT NOT NULL,
    category ticket_category NOT NULL,
    sentiment ticket_sentiment NOT NULL,
    confidence REAL NOT NULL DEFAULT 0.0,
    summary TEXT NOT NULL DEFAULT '',
    status ticket_status NOT NULL DEFAULT 'new',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    claimed_by VARCHAR(120),
    claimed_at TIMESTAMPTZ,
    first_response_at TIMESTAMPTZ,
    auto_reply_text TEXT,
    resolved_at TIMESTAMPTZ,
    conversation JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets (status);
CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets (category);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_sender_email ON tickets (sender_email);

CREATE TABLE IF NOT EXISTS kb_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    source VARCHAR(400),
    embedding vector(1536),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kb_documents_embedding ON kb_documents
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE TABLE IF NOT EXISTS slack_installations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id VARCHAR(80) NOT NULL UNIQUE,
    team_name VARCHAR(200),
    bot_token TEXT NOT NULL,
    bot_user_id VARCHAR(80),
    installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    scope VARCHAR(200)
);

CREATE INDEX IF NOT EXISTS idx_slack_installations_team_id ON slack_installations (team_id);
