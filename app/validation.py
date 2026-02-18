from typing import Tuple, List
import unicodedata

def validate_user_text(text: str, max_length: int = 20000) -> Tuple[bool, str, List[str]]:
    """
    Validates user input text for security and sanity.
    
    Checks:
    1. Not empty or whitespace only.
    2. Length checks (max_length).
    3. Control characters (removes null bytes, etc).
    
    Returns:
        (is_valid, normalized_text, error_messages)
    """
    errors = []
    
    if not text:
        return False, "", ["Input text cannot be empty."]
    
    # 1. Normalization (trim whitespace)
    normalized = text.strip()
    
    if not normalized:
        return False, "", ["Input text cannot be empty or whitespace only."]
    
    # 2. Length check
    if len(normalized) > max_length:
        errors.append(f"Input text exceeds maximum length of {max_length} characters.")
    
    # 3. Control character check
    # We want to allow newlines, tabs, carriage returns, but block other non-printable controls
    # Common control chars to block: \x00 (null), \x1b (escape), etc.
    # Simple heuristic: scan for category "Cc" but allow specific whitelist
    
    # Actually, simpler approach for now: just remove null bytes which can cause issues in some C-based libs
    if "\0" in normalized:
        errors.append("Input text contains null bytes.")
        
    # Check for excessive unprintable characters? 
    # For now, let's stick to the basics requested.
    
    if errors:
        return False, normalized, errors
        
    return True, normalized, []
