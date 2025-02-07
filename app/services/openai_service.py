"""OpenAI service for generating responses."""
from typing import Optional
from openai import AsyncOpenAI
from fastapi import Depends

from app.core.config import Settings, get_settings
from app.core.logger import logger

class OpenAIService:
    def __init__(self, settings: Settings = Depends(get_settings)):
        self.settings = settings
        self.enabled = settings.enable_openai_responses
        if self.enabled:
            self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        logger.info(f"OpenAI service initialized. Enabled: {self.enabled}")

    async def get_response(self, message: str) -> Optional[str]:
        """Generate response using OpenAI."""
        if not self.enabled:
            logger.info("OpenAI responses are disabled")
            return None

        try:
            logger.info(f"Generating OpenAI response for message: {message}")
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": self.settings.openai_system_prompt},
                    {"role": "user", "content": message}
                ],
                max_tokens=150,
                temperature=0.3
            )
            response_text = response.choices[0].message.content.strip()
            logger.info(f"Generated OpenAI response: {response_text}")
            return response_text
        except Exception as e:
            logger.error(f"Error generating OpenAI response: {str(e)}", exc_info=True)
            return None