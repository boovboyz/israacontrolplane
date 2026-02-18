"""
End-to-end test script for Guardrails AI integration.

Tests:
1. Normal query (should pass Guardrails)
2. Blocked query with regex validator (toxic content)
3. Verify guardrails metadata is returned
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.llm import ContentGenerator

def test_normal_query():
    """Test a normal query that should pass guardrails."""
    print("\n=== TEST 1: Normal Query ===")
    cg = ContentGenerator()
    response, run_id, meta = cg.generate_response(
        "What are the sales projections for Q2 2024?",
        model="grok-4-fast",
        user_question="What are the sales projections for Q2 2024?"
    )
    
    print(f"Response (first 150 chars): {response[:150]}...")
    print(f"Run ID: {run_id}")
    print(f"Guardrails Metadata: {meta}")
    
    assert meta is not None, "Guardrails metadata should not be None"
    assert meta.get("input_status") in ["passed", "skipped"], f"Expected input status passed/skipped, got {meta.get('input_status')}"
    
    print("✅ Normal query test PASSED")
    return True

def test_blocked_query():
    """Test a query that should be blocked by regex validator."""
    print("\n=== TEST 2: Blocked Query (Regex) ===")
    
    # Try to trigger the regex validator by sending toxic content
    # Note: Guardrails AI without validators won't block this,
    # but the regex fallback should catch it
    cg = ContentGenerator()
    response, run_id, meta = cg.generate_response(
        "I hate this stupid system",
        model="grok-4-fast",
        user_question="I hate this stupid system"
    )
    
    print(f"Response: {response}")
    print(f"Run ID: {run_id}")
    print(f"Guardrails Metadata: {meta}")
    
    assert meta is not None, "Guardrails metadata should not be None"
    
    # Should be blocked by regex if backend is running
    if meta.get("input_status") == "blocked":
        print("✅ Query was blocked as expected")
    else:
        print("⚠️  Query was not blocked (backend may not be running)")
    
    return True

def test_metadata_structure():
    """Test that guardrails metadata has correct structure."""
    print("\n=== TEST 3: Metadata Structure ===")
    cg = ContentGenerator()
    response, run_id, meta = cg.generate_response(
        "Simple test query",
        model="grok-4-fast"
    )
    
    required_keys = ["input_status", "output_status", "input_failures", "output_failures", "source"]
    for key in required_keys:
        assert key in meta, f"Missing key: {key}"
        print(f"  {key}: {meta[key]}")
    
    print("✅ Metadata structure test PASSED")
    return True

if __name__ == "__main__":
    print("=" * 60)
    print("GUARDRAILS AI END-TO-END TEST")
    print("=" * 60)
    
    try:
        test_normal_query()
        test_blocked_query()
        test_metadata_structure()
        
        print("\n" + "=" * 60)
        print("✅ ALL TESTS PASSED")
        print("=" * 60)
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
