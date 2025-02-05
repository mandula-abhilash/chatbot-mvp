from typing import Dict, Any
import httpx
from fastapi import Depends

from app.core.config import Settings, get_settings
from app.core.logger import logger

class WhatsAppService:
    def __init__(self, settings: Settings = Depends(get_settings)):
        self.settings = settings
        self.api_url = f"{settings.whatsapp_api_url}/{settings.whatsapp_api_version}/{settings.phone_number_id}/messages"
        self.headers = {
            "Authorization": f"Bearer {settings.access_token}",
            "Content-Type": "application/json"
        }

    async def send_message(self, to_number: str, message_text: str) -> Dict[str, Any]:
        """
        Sends a message to WhatsApp using the Cloud API.
        """
        payload = {
            "messaging_product": "whatsapp",
            "to": to_number,
            "text": {"body": message_text}
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.api_url,
                    json=payload,
                    headers=self.headers
                )
                response.raise_for_status()
                logger.info(f"Message sent successfully to {to_number}")
                return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Error sending message to {to_number}: {str(e)}")
            raise