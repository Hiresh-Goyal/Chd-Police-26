import re

def normalize_phone(raw: str) -> str:
    """Normalize any Indian MSISDN to 10-digit string."""
    if not raw:
        return ""
    
    # Remove all non-digit characters
    digits = re.sub(r'\D', '', str(raw))
    
    # Strip country code 91 if present
    if len(digits) == 12 and digits.startswith('91'):
        digits = digits[2:]
    if len(digits) == 11 and digits.startswith('0'):
        digits = digits[1:]
        
    return digits if len(digits) == 10 else str(raw)  # fallback to raw if unrecognizable
