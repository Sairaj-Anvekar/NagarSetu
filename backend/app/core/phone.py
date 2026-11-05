import re


def normalize_phone(raw: str) -> str:
    """Normalize a phone number to an international standard format (+ followed by digits)."""
    cleaned = re.sub(r"[\s\-\(\)]", "", raw)

    if cleaned.startswith("+"):
        normalized = cleaned
    elif len(cleaned) == 10 and cleaned.isdigit():
        normalized = "+91" + cleaned
    elif len(cleaned) == 11 and cleaned.startswith("0") and cleaned.isdigit():
        normalized = "+91" + cleaned[1:]
    elif len(cleaned) == 12 and cleaned.startswith("91") and cleaned.isdigit():
        normalized = "+" + cleaned
    else:
        normalized = "+" + cleaned

    digits = normalized[1:] if normalized.startswith("+") else normalized
    if not (10 <= len(digits) <= 15 and digits.isdigit()):
        raise ValueError("Enter a valid phone number")

    return normalized

