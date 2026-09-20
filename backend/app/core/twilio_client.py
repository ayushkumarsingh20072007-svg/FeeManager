from typing import Optional
from twilio.rest import Client
from app.core.config import settings

def get_twilio_client() -> Optional[Client]:
    """
    Instantiates and returns a Twilio Client if credentials are configured,
    or None if credentials are unset or empty.
    """
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
        return None
    return Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
