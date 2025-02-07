"""Tests for OpenAI service."""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from app.services.openai_service import OpenAIService
from app.core.config import Settings

# Test settings
TEST_SETTINGS = Settings(
    verify_token="test_token",
    access_token="test_access_token",
    phone_number_id="test_phone_id",
    openai_api_key="test_openai_key",
    enable_openai_responses=True,
    openai_system_prompt="You are a test assistant."
)

@pytest.fixture
def openai_service():
    """Create OpenAI service instance with test settings."""
    return OpenAIService(TEST_SETTINGS)

def test_openai_service_initialization(openai_service):
    """Test OpenAI service initialization."""
    assert openai_service.enabled == True
    assert openai_service.settings.openai_api_key == "test_openai_key"

def test_openai_service_disabled():
    """Test OpenAI service when disabled."""
    disabled_settings = TEST_SETTINGS.model_copy()
    disabled_settings.enable_openai_responses = False
    service = OpenAIService(disabled_settings)
    
    assert service.enabled == False

@pytest.mark.asyncio
async def test_get_response_when_disabled():
    """Test get_response when service is disabled."""
    disabled_settings = TEST_SETTINGS.model_copy()
    disabled_settings.enable_openai_responses = False
    service = OpenAIService(disabled_settings)
    
    response = await service.get_response("Hello")
    assert response is None

@pytest.mark.asyncio
async def test_get_response_success():
    """Test successful OpenAI response generation."""
    mock_message = MagicMock()
    mock_message.content = "Test response"
    
    mock_choice = MagicMock()
    mock_choice.message = mock_message
    
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    
    async_mock = AsyncMock(return_value=mock_response)
    
    with patch('openai.ChatCompletion.acreate', new=async_mock):
        service = OpenAIService(TEST_SETTINGS)
        response = await service.get_response("Hello")
        
        assert response == "Test response"
        async_mock.assert_called_once()

@pytest.mark.asyncio
async def test_get_response_error():
    """Test error handling in get_response."""
    async_mock = AsyncMock(side_effect=Exception("API Error"))
    
    with patch('openai.ChatCompletion.acreate', new=async_mock):
        service = OpenAIService(TEST_SETTINGS)
        response = await service.get_response("Hello")
        
        assert response is None
        async_mock.assert_called_once()

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