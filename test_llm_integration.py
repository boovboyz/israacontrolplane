import sys
import os
import unittest
from unittest.mock import MagicMock, patch

# Add app to path
app_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app")
sys.path.insert(0, app_dir)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Pre-import app.llm?
# If we want to patch sys.modules dynamically during test, we need to ensure
# app.llm doesn't cache the import if it was top-level. 
# But app.llm imports INSIDE functon, so it's fine.

class TestLLMIntegration(unittest.TestCase):
    def setUp(self):
        # Create mock wrapper
        self.mock_wrapper = MagicMock()
        self.mock_validate = MagicMock()
        self.mock_result = MagicMock()
        self.mock_result.passed = True
        self.mock_result.failures = []
        self.mock_result.validated_text = "Hello [REDACTED]"
        self.mock_result.failed = False
        self.mock_result.metadata = {"guardrails_ai": "passed"}

        self.mock_validate.return_value = self.mock_result
        self.mock_wrapper.validate_input = self.mock_validate
        
        # Start patches
        self.patcher_modules = patch.dict(sys.modules, {'guardrails_wrapper': self.mock_wrapper})
        self.patcher_modules.start()
        
        # Mock mlflow
        self.mock_mlflow = MagicMock()
        self.mock_mlflow.start_run.return_value.__enter__.return_value = MagicMock()
        self.patcher_mlflow = patch.dict(sys.modules, {'mlflow': self.mock_mlflow})
        self.patcher_mlflow.start()

        # Import ContentGenerator (it might have been imported before, but that's fine as long as we patch modules before function call)
        # Actually, app.llm imports guardrails_wrapper inside function.
        # But app.llm itself might be imported.
        # Ensure we can import app.llm
        try:
            from app.llm import ContentGenerator
            self.ContentGenerator = ContentGenerator
        except ImportError:
            # Maybe path issue?
            # We added to sys.path, should be fine.
            import app.llm
            self.ContentGenerator = app.llm.ContentGenerator

        # Mock OpenAI environment
        self.env_patcher = patch.dict(os.environ, {'OPENAI_API_KEY': 'fake-key'})
        self.env_patcher.start()
        
        self.generator = self.ContentGenerator()
        self.generator.xai_client = MagicMock()
        self.generator.xai_client.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content="Mock Response"))
        ]

    def tearDown(self):
        self.patcher_modules.stop()
        self.patcher_mlflow.stop()
        self.env_patcher.stop()

    def test_generate_uses_validated_text(self):
        """Verify that generate_response sends validated text to LLM."""
        input_text = "Hello secret@email.com"
        
        # Call generate
        self.generator.generate_response(input_text, model="grok-test")
        
        # Verify validate_input was called with original text
        self.mock_validate.assert_called_with(input_text)
        
        # Verify LLM was called with REDACTED text
        call_args = self.generator.xai_client.chat.completions.create.call_args
        if not call_args:
             self.fail("LLM was not called! Generator might have failed early.")
             
        _, kwargs = call_args
        messages = kwargs['messages']
        user_msg = next(m for m in messages if m['role'] == 'user')
        
        print(f"Original: {input_text}")
        print(f"Sent to LLM: {user_msg['content']}")
        
        self.assertEqual(user_msg['content'], "Hello [REDACTED]")

if __name__ == "__main__":
    unittest.main()
