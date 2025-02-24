import logging
from app.core.config import get_settings

settings = get_settings()

def setup_logger():
    logger = logging.getLogger("whatsapp_bot")
    logger.setLevel(getattr(logging, settings.log_level.upper()))

    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # File handler
    file_handler = logging.FileHandler("app.log")
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    return logger

logger = setup_logger()