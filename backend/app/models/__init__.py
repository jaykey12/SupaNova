"""Domain and persistence models for NovaMind backend."""

from app.models.db_models import KbDocumentModel, SlackInstallationModel, TicketModel

__all__ = ["TicketModel", "KbDocumentModel", "SlackInstallationModel"]
