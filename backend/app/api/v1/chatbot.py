import json
from urllib import error, request

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.deps import require_roles
from app.core.config import settings
from app.models.enums import UserRole
from app.models.user import User


router = APIRouter(prefix="/chatbot", tags=["chatbot"])


class ChatbotMessageRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)


class ChatbotMessageResponse(BaseModel):
    reply: str


def _extract_reply(payload: dict) -> str:
    choices = payload.get("choices") or []
    for choice in choices:
        message = choice.get("message") or {}
        text = str(message.get("content") or "").strip()
        if text:
            return text

    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail="Chatbot provider returned an empty response.",
    )


def _send_to_groq(user_message: str) -> str:
    if not settings.GROQ_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Chatbot is not configured. Set GROQ_API_KEY in backend environment.",
        )

    model_name = settings.GROQ_MODEL.strip() or "llama-3.1-8b-instant"
    url = "https://api.groq.com/openai/v1/chat/completions"

    body = {
        "model": model_name,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a helpful assistant inside a training management application. "
                    "Respond clearly and concisely."
                ),
            },
            {"role": "user", "content": user_message},
        ],
        "temperature": 0.4,
        "max_tokens": 1024,
    }

    http_request = request.Request(
        url=url,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        },
        method="POST",
    )

    try:
        with request.urlopen(http_request, timeout=30) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        raw_body = exc.read().decode("utf-8", errors="ignore")
        provider_message = raw_body.strip() or "Chatbot provider request failed."
        try:
            parsed = json.loads(raw_body)
            provider_message = parsed.get("error", {}).get("message") or provider_message
        except json.JSONDecodeError:
            pass

        raise HTTPException(
            status_code=exc.code if isinstance(exc.code, int) else status.HTTP_502_BAD_GATEWAY,
            detail=provider_message,
        ) from exc
    except error.URLError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to reach chatbot provider.",
        ) from exc

    return _extract_reply(payload)


@router.post("/message", response_model=ChatbotMessageResponse)
def send_chatbot_message(
    payload: ChatbotMessageRequest,
    _: User = Depends(require_roles(UserRole.admin, UserRole.observer)),
):
    reply = _send_to_groq(payload.message)
    return ChatbotMessageResponse(reply=reply)
