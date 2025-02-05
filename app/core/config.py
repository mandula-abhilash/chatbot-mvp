from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    verify_token: str
    access_token: str
    phone_number_id: str
    log_level: str = "INFO"
    whatsapp_api_version: str = "v15.0"
    whatsapp_api_url: str = "https://graph.facebook.com"

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings() -> Settings:
    return Settings()