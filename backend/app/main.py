from fastapi import FastAPI
from app.api.slack import router as slack_router
from app.api.system import router as system_router
from app.api.v1 import router as v1_router
from app.api.auth import router as auth_router
from app.api.billing import router as billing_router

app = FastAPI(
    title="NovaMind AI API",
    description="AI Customer Support Triage with PayPal billing",
    version="0.4.0",
)

app.include_router(system_router)
app.include_router(auth_router)
app.include_router(v1_router)
app.include_router(slack_router)
app.include_router(billing_router)