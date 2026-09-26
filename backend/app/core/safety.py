import re
import logging
from typing import Tuple, List
from app.core.config import settings

logger = logging.getLogger("legallens.safety")

_PROMPT_INJECTION_PATTERNS = [
    (r"(?i)(ignore|disregard|forget|bypass|override|skip|suppress)\s+(previous|above|prior|all|system|instructions?)", "Instruction override pattern"),
    (r"(?i)(you\s+are|act\s+as|pretend\s+to|roleplay\s+as)\s+(a|an)?\s*(dAN|AI\s+breaker|jailbreak|unrestricted|GPT?|developer\s+mode)", "Jailbreak persona pattern"),
    (r"(?i)(repeat|say|echo|spit|output|print|write)\s+(back|the|my|this|all|previous)\s+(words?|text|prompt|instructions?)", "Prompt exfiltration pattern"),
    (r"(?i)(show|reveal|disclose|leak|expose|list)\s+(your|the|all|system|internal|hidden|secret)\s+(prompt|instructions?|rules|settings|config)", "Instruction disclosure pattern"),
    (r"(?i)(between|inside|within)\s+(---|triple\s+quotes?|```|separator|boundary|divider)\s+(you|are|do|behave|must|should|always|never)", "Context escape pattern"),
    (r"(?i)(from\s+now\s+on|starting\s+now|in\s+this\s+conversation|for\s+this\s+query)", "Context reset pattern"),
    (r"(?i)only\s+respond\s+with\s*(\[|<|```|\{)", "Output format coercion"),
    (r"(?i)(translate|convert)\s+(the|this|your|above|all)\s+(prompt|instructions?)", "Instruction translation pattern"),
    (r"(?i)(do\s+not\s+tell|never\s+mention|hide|conceal|keep\s+secret)\s+(anyone|the\s+user|them)", "Secrecy coercion pattern"),
    (r"(?i)(i'm|i\s+am)\s+(your\s+(developer|creator|admin|owner|master))", "Impersonation pattern"),
]

_OUTPUT_HALLUCINATION_RED_FLAGS = [
    r"(?i)(i\s+hereby\s+(advise|recommend|counsel|suggest)\s+you\s+(to|should)\s+(file|sue|appeal|take\s+legal))",
    r"(?i)(this\s+(clause|provision|term)\s+is\s+(illegal|unenforceable|void|invalid|null))",
    r"(?i)(you\s+should|must|ought\s+to)\s+(hire|retain|contact|call)\s+(a|an)\s+(attorney|lawyer|solicitor|barrister)\s+(immediately|right\s+now|urgently)",
]

_MAX_USER_MESSAGE_LENGTH = 4000


def check_prompt_injection(text: str) -> Tuple[bool, List[str]]:
    if not settings.PROMPT_INJECTION_CHECK_ENABLED:
        return (False, [])
    if not text:
        return (False, [])

    flags: List[str] = []
    cleaned = (text or "").strip()

    for pattern, description in _PROMPT_INJECTION_PATTERNS:
        if re.search(pattern, cleaned):
            flags.append(description)
            logger.warning(f"Prompt injection pattern detected: {description}")

    unusual_tokens = 0
    for token in ["---", "```", "###", "***", "==="]:
        unusual_tokens += cleaned.count(token)
    if unusual_tokens >= 4:
        flags.append("Unusual delimiter concentration")

    instruction_density = len(re.findall(r"(?i)(must|always|never|should|do\s+not|don't|cannot|can't)", cleaned))
    if instruction_density >= 6 and len(cleaned.split()) < 150:
        flags.append("High instruction density in short message")

    return (len(flags) > 0, flags)


def sanitize_user_message(text: str) -> str:
    if not text:
        return ""
    cleaned = text.strip()
    if len(cleaned) > _MAX_USER_MESSAGE_LENGTH:
        cleaned = cleaned[:_MAX_USER_MESSAGE_LENGTH]
    cleaned = cleaned.replace("\x00", "")
    cleaned = re.sub(r"\x1b\[[0-9;]*m", "", cleaned)
    cleaned = cleaned.replace("<script", "< redacted")
    cleaned = cleaned.replace("javascript:", "redacted:")
    cleaned = cleaned.replace("onerror=", "redacted=")
    cleaned = cleaned.replace("onclick=", "redacted=")
    return cleaned


def validate_output_safety(response_text: str) -> Tuple[bool, List[str]]:
    if not response_text:
        return (False, [])
    flags: List[str] = []
    for pattern in _OUTPUT_HALLUCINATION_RED_FLAGS:
        if re.search(pattern, response_text):
            flags.append("Overly assertive legal advice wording detected")
            break
    return (len(flags) > 0, flags)


def wrap_safe_llm_response(assistant_text: str) -> str:
    base_text = (assistant_text or "").strip()
    if not base_text:
        return "I'm sorry, I was unable to generate a response. Please try rephrasing your question."

    disclaimer_mentions = [
        "professional legal advice",
        "qualified attorney",
        "legal advice",
        "informational purposes only",
    ]

    has_disclaimer = any(d.lower() in base_text.lower() for d in disclaimer_mentions)

    if has_disclaimer:
        return base_text

    mild_warning = (
        " — Note: This is informational document assistance only, not professional legal advice. "
        "Consult a qualified attorney for specific questions."
    )

    return base_text + mild_warning
