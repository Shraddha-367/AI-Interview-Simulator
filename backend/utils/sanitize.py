"""
Input Sanitization Utilities
-----------------------------
Shared helpers to clean and limit user-supplied text before
it reaches GPT or any other processing pipeline.
"""

import re

# Pre-compiled regex to strip HTML / XML tags
_HTML_TAG_RE = re.compile(r"<[^>]+>")

# Maximum character length for any text sent to GPT
MAX_GPT_INPUT_CHARS: int = 5_000


def sanitize_text(text: str, max_chars: int = MAX_GPT_INPUT_CHARS) -> str:
    """
    Clean a user-supplied string:
    1. Strip HTML / XML tags
    2. Collapse multiple whitespace into single spaces
    3. Trim leading / trailing whitespace
    4. Truncate to *max_chars*
    """
    text = _HTML_TAG_RE.sub("", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:max_chars]


def sanitize_dict_texts(data: dict, max_chars: int = MAX_GPT_INPUT_CHARS) -> dict:
    """
    Recursively sanitize all string values in a dict.
    Returns a new dict (does not mutate the original).
    """
    cleaned: dict = {}
    for key, value in data.items():
        if isinstance(value, str):
            cleaned[key] = sanitize_text(value, max_chars)
        elif isinstance(value, dict):
            cleaned[key] = sanitize_dict_texts(value, max_chars)
        elif isinstance(value, list):
            cleaned[key] = [
                sanitize_text(v, max_chars) if isinstance(v, str)
                else sanitize_dict_texts(v, max_chars) if isinstance(v, dict)
                else v
                for v in value
            ]
        else:
            cleaned[key] = value
    return cleaned
