from fastapi import APIRouter

router = APIRouter(tags=["System"])


@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/")
def root() -> dict[str, str]:
    return {"message": "Welcome to Kutane AI API"}
