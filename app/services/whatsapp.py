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
        logger.info(f"WhatsAppService initialized with API URL: {self.api_url}")

    async def send_message(self, to_number: str, message_text: str) -> Dict[str, Any]:
        """
        Sends a message to WhatsApp using the Cloud API.
        """
        payload = {
            "messaging_product": "whatsapp",
            "to": to_number,
            "text": {"body": message_text}
        }

        logger.info(f"Attempting to send message to {to_number}")
        logger.debug(f"Request payload: {payload}")
        logger.debug(f"Using headers: {self.headers}")

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.api_url,
                    json=payload,
                    headers=self.headers,
                    timeout=30.0
                )
                response_data = response.json()
                logger.info(f"WhatsApp API response: {response_data}")
                response.raise_for_status()
                logger.info(f"Message sent successfully to {to_number}")
                return response_data
        except httpx.HTTPError as e:
            logger.error(f"HTTP error sending message to {to_number}: {str(e)}")
            logger.error(f"Response content: {e.response.content if hasattr(e, 'response') else 'No response content'}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error sending message to {to_number}: {str(e)}", exc_info=True)
            raise