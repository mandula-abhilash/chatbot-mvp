from fastapi import APIRouter, Request, HTTPException, Depends, Query
from fastapi.responses import Response

from app.core.config import get_settings, Settings
from app.core.logger import logger
from app.services.whatsapp import WhatsAppService
from app.services.openai_service import OpenAIService

router = APIRouter()

@router.get("/webhook")
async def verify_webhook(
    hub_mode: str = Query(..., alias="hub.mode"),
    hub_verify_token: str = Query(..., alias="hub.verify_token"),
    hub_challenge: str = Query(..., alias="hub.challenge"),
    settings: Settings = Depends(get_settings)
):
    """Webhook verification endpoint"""

    # Log query parameters
    logger.info(
        f"Received Webhook Verification Request: hub_mode={hub_mode}, "
        f"hub_verify_token={hub_verify_token}, hub_challenge={hub_challenge}"
    )
    
    if hub_mode == "subscribe" and hub_verify_token == settings.verify_token:
        logger.info("Webhook verified successfully")
        return int(hub_challenge)
    
    logger.warning("Webhook verification failed")
    raise HTTPException(status_code=403, detail="Verification failed")

@router.post("/webhook")
async def receive_message(
    request: Request,
    whatsapp_service: WhatsAppService = Depends(WhatsAppService),
    openai_service: OpenAIService = Depends(OpenAIService)
):
    """Handle incoming WhatsApp messages"""
    try:
        # Log raw request details
        logger.info(f"Received webhook POST request to {request.url}")
        logger.info(f"Request headers: {dict(request.headers)}")
        
        # Get and log raw body
        body = await request.body()
        logger.info(f"Raw request body: {body.decode()}")
        
        # Parse JSON
        data = await request.json()
        logger.info(f"Parsed webhook data: {data}")

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

            # Get OpenAI response if enabled
            reply_text = await openai_service.get_response(text)
            if reply_text is None:
                reply_text = "Hello! Thanks for your message."

            # Send reply
            try:
                await whatsapp_service.send_message(sender, reply_text)
                logger.info(f"Reply sent successfully to {sender}")
            except Exception as e:
                logger.error(f"Failed to send reply to {sender}: {str(e)}")
                raise

        return Response(content="OK", media_type="text/plain")

    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}", exc_info=True)
        return Response(
            content="Internal Server Error",
            media_type="text/plain",
            status_code=500
        )