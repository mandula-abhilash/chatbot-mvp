"""Tests for OpenAI service."""
import pytest
from app.services.openai_service import OpenAIService
from app.core.config import Settings

@pytest.mark.integration
@pytest.mark.asyncio
async def test_integration_openai():
    """
    Integration test for OpenAI service.
    Tests real-world queries with actual API calls.
    Requires valid OPENAI_API_KEY in environment.
    """
    from dotenv import load_dotenv
    import os
    
    # Load environment variables
    load_dotenv()
    
    # Skip if no API key is available
    if not os.getenv("OPENAI_API_KEY"):
        pytest.skip("OPENAI_API_KEY not found in environment")
    
    # Create settings with actual API key
    settings = Settings(
        verify_token="test",
        access_token="test",
        phone_number_id="test",
        openai_api_key=os.getenv("OPENAI_API_KEY"),
        enable_openai_responses=True,
        openai_system_prompt="You are a helpful assistant. Provide current and accurate information."
    )
    
    service = OpenAIService(settings)
    
    # Test with real-world queries
    test_queries = [
        "What is the latest news today?",
        "Tell me about current global events",
        "What's happening in the world right now?"
    ]
    
    for query in test_queries:
        response = await service.get_response(query)
        print(f"\nQuery: {query}")
        print(f"OpenAI Response: {response}")
        
        # Basic validation
        assert response is not None
        assert len(response) > 50  # Ensure we get a substantial response
        assert isinstance(response, str)
        assert "error" not in response.lower()  # Basic error check