import re

def normalize_phone(raw: str) -> str:
    """
    normalize_phone(raw) strips +91, leading 0, spaces, dashes, parentheses.
    Returns 10-digit string.
    """
    if not raw:
        return raw
    
    # Remove whitespace and common separators
    cleaned = re.sub(r'[\s\-\(\)]+', '', raw)
    
    # Remove +91 or 91 country code
    if cleaned.startswith('+91'):
        cleaned = cleaned[3:]
    elif cleaned.startswith('91') and len(cleaned) == 12:
        cleaned = cleaned[2:]
    
    # Remove leading 0
    if cleaned.startswith('0'):
        cleaned = cleaned[1:]
        
    return cleaned
