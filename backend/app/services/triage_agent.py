from __future__ import annotations

import json
import os
import re

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from app.models.schemas import EmailIngestRequest, IntentCategory, KnowledgeBaseMatch, SentimentLabel, TriageResult


class LangChainTriageAgent:
    """LangChain-powered triage with deterministic fallback for local MVP use."""

    CATEGORIES: tuple[IntentCategory, ...] = (
        "billing",
        "technical",
        "feature_request",
        "complaint",
        "other",
    )

    SENTIMENTS: tuple[SentimentLabel, ...] = ("positive", "neutral", "negative")

    def __init__(self) -> None:
        self.model_name = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self._llm = None

        if os.getenv("OPENAI_API_KEY"):
            self._llm = ChatOpenAI(model=self.model_name, temperature=0)

        self._classification_prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    (
                        "You are an AI support triage engine. "
                        "Classify messages into exactly one category from: billing, technical, "
                        "feature_request, complaint, other. "
                        "Also classify sentiment as positive, neutral, or negative. "
                        "Return strict JSON with keys: category, sentiment, confidence, summary. "
                        "Confidence must be a number between 0 and 1."
                    ),
                ),
                (
                    "human",
                    "Subject: {subject}\n\nMessage:\n{body}",
                ),
            ]
        )

        self._reply_prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "You are a support assistant. Draft a concise and helpful customer reply using only provided KB context.",
                ),
                (
                    "human",
                    "Customer subject: {subject}\nCustomer message:\n{body}\n\nKB context:\n{kb_context}",
                ),
            ]
        )

    def classify(self, payload: EmailIngestRequest) -> TriageResult:
        if self._llm is None:
            return self._heuristic_classification(payload)

        try:
            chain = self._classification_prompt | self._llm
            raw_output = chain.invoke({"subject": payload.subject, "body": payload.body}).content
            parsed = self._parse_json(raw_output)
            category = self._normalize_category(parsed.get("category"))
            sentiment = self._normalize_sentiment(parsed.get("sentiment"))
            confidence = float(parsed.get("confidence", 0.6))
            confidence = max(0.0, min(1.0, confidence))
            summary = str(parsed.get("summary") or self._fallback_summary(payload.body))
            return TriageResult(
                category=category,
                sentiment=sentiment,
                confidence=confidence,
                summary=summary,
            )
        except Exception:
            return self._heuristic_classification(payload)

    def generate_auto_reply(self, payload: EmailIngestRequest, matches: list[KnowledgeBaseMatch]) -> str:
        kb_context = "\n\n".join(
            f"- {match.title} (score={match.score}): {match.snippet}" for match in matches
        )

        if self._llm is not None:
            try:
                chain = self._reply_prompt | self._llm
                response = chain.invoke(
                    {
                        "subject": payload.subject,
                        "body": payload.body,
                        "kb_context": kb_context,
                    }
                ).content
                return str(response).strip()
            except Exception:
                pass

        best_match = matches[0]
        return (
            "Thanks for reaching out — here's what we found based on our help docs:\n\n"
            f"{best_match.snippet}\n\n"
            "If this does not solve your issue, reply to this email and a support agent will take over."
        )

    def _heuristic_classification(self, payload: EmailIngestRequest) -> TriageResult:
        text = f"{payload.subject} {payload.body}".lower()

        keyword_map: dict[IntentCategory, tuple[str, ...]] = {
            "billing": ("invoice", "charge", "refund", "payment", "billing", "subscription"),
            "technical": ("bug", "error", "crash", "login", "timeout", "not working", "issue"),
            "feature_request": ("feature", "would love", "could you add", "request", "improvement"),
            "complaint": ("angry", "frustrated", "terrible", "unacceptable", "disappointed", "complaint"),
            "other": tuple(),
        }

        score_by_category: dict[IntentCategory, int] = {category: 0 for category in self.CATEGORIES}
        for category, keywords in keyword_map.items():
            for keyword in keywords:
                if keyword in text:
                    score_by_category[category] += 1

        category = max(score_by_category, key=score_by_category.get)
        category_score = score_by_category[category]
        if category_score == 0:
            category = "other"

        negative_terms = ("angry", "frustrated", "bad", "disappointed", "terrible", "broken")
        positive_terms = ("thanks", "great", "love", "awesome", "appreciate")

        negative_hits = sum(1 for term in negative_terms if term in text)
        positive_hits = sum(1 for term in positive_terms if term in text)

        if negative_hits > positive_hits:
            sentiment: SentimentLabel = "negative"
        elif positive_hits > negative_hits:
            sentiment = "positive"
        else:
            sentiment = "neutral"

        confidence = 0.55 + min(category_score * 0.12, 0.35)
        if sentiment != "neutral":
            confidence += 0.05
        confidence = max(0.5, min(confidence, 0.95))

        return TriageResult(
            category=category,
            sentiment=sentiment,
            confidence=round(confidence, 4),
            summary=self._fallback_summary(payload.body),
        )

    @staticmethod
    def _parse_json(raw_output: str) -> dict[str, object]:
        cleaned = raw_output.strip()
        cleaned = re.sub(r"^```(?:json)?", "", cleaned).strip()
        cleaned = re.sub(r"```$", "", cleaned).strip()
        return json.loads(cleaned)

    def _normalize_category(self, value: object) -> IntentCategory:
        if isinstance(value, str) and value in self.CATEGORIES:
            return value
        return "other"

    def _normalize_sentiment(self, value: object) -> SentimentLabel:
        if isinstance(value, str) and value in self.SENTIMENTS:
            return value
        return "neutral"

    @staticmethod
    def _fallback_summary(text: str) -> str:
        text = " ".join(text.split())
        return text[:220] + ("..." if len(text) > 220 else "")
