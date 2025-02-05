from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import Response

from app.core.config import get_settings, Settings
from app.core.logger import logger
from app.services.whatsapp import WhatsAppService

router = APIRouter()

@router.get("/webhook")
async def verify_webhook(
    hub_mode: str,
    hub_verify_token: str,
    hub_challenge: str,
    settings: Settings = Depends(get_settings)
):
    """Webhook verification endpoint"""
    if hub_mode == "subscribe" and hub_verify_token == settings.verify_token:
        logger.info("Webhook verified successfully")
        return int(hub_challenge)
    
    logger.warning("Webhook verification failed")
    raise HTTPException(status_code=403, detail="Verification failed")

@router.post("/webhook")
async def receive_message(
    request: Request,
    whatsapp_service: WhatsAppService = Depends(WhatsAppService)
):
    """Handle incoming WhatsApp messages"""
    try:
        data = await request.json()
        logger.debug(f"Received webhook data: {data}")

        # Extract message data
        entry = data["entry"][0]
        changes = entry["changes"][0]
        value = changes["value"]
        messages = value.get("messages", [])

        if messages:
            message = messages[0]
            sender = message["from"]
            text = message.get("text", {}).get("body", "")
            
            logger.info(f"Message received from {sender}: {text}")

            # Process message and send reply
            reply_text = "Hello! Thanks for your message."
            await whatsapp_service.send_message(sender, reply_text)

        return Response(content="OK", media_type="text/plain")

    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        return Response(
            content="Internal Server Error",
            media_type="text/plain",
            status_code=500
        )