import re
from typing import Dict, Any, List
from app.core.config import settings


# ---------------------------------------------------------------------------
# Helper: extract candidate clause blocks from text
# ---------------------------------------------------------------------------
_CLAUSE_PATTERNS = [
    (r'(?:termination|notice|cancel)', "Termination & Notice", "High"),
    (r'(?:payment|invoice|fee|salary|compensation|remuneration)', "Payment & Compensation", "High"),
    (r'(?:liability|indemnif|hold harmless|damages)', "Liability & Indemnification", "High"),
    (r'(?:non[- ]?compete|restraint|restrict)', "Non-Compete / Restraint", "High"),
    (r'(?:confidential|non[- ]?disclosure|proprietary)', "Confidentiality & NDA", "Medium"),
    (r'(?:arbitration|dispute|governing law|jurisdiction)', "Dispute Resolution", "Medium"),
    (r'(?:renew|auto.{0,10}renew|extension|term)', "Renewal & Term", "Medium"),
    (r'(?:intellectual property|ip rights|copyright|patent)', "Intellectual Property", "Low"),
    (r'(?:force majeure|act of god)', "Force Majeure", "Low"),
    (r'(?:warranty|represent|covenant)', "Warranties & Representations", "Low"),
]


def _extract_clause_sentence(text: str, pattern: str) -> str:
    """Return the first sentence in `text` that matches `pattern`, or empty string."""
    sentences = re.split(r'(?<=[.!?])\s+', text)
    for sent in sentences:
        if re.search(pattern, sent, re.IGNORECASE):
            sent = sent.strip()
            return sent[:350] + "…" if len(sent) > 350 else sent
    return ""


def _diff_clauses_nlp(
    doc_a_text: str,
    doc_b_text: str,
) -> List[Dict[str, Any]]:
    """
    Perform real clause-level NLP comparison between two document texts.
    For each known clause category, extract the relevant sentence from each
    document and compare. Returns a list of ClauseDiff dicts.
    """
    changes: List[Dict[str, Any]] = []

    for pattern, title, importance in _CLAUSE_PATTERNS:
        sent_a = _extract_clause_sentence(doc_a_text, pattern)
        sent_b = _extract_clause_sentence(doc_b_text, pattern)

        has_a = bool(sent_a)
        has_b = bool(sent_b)

        if not has_a and not has_b:
            continue  # topic absent in both — skip

        if has_a and not has_b:
            status = "Removed"
            explanation = (
                f"The {title} clause present in Document A was removed or omitted in Document B. "
                "Review whether this omission is intentional and what rights/obligations were lost."
            )
        elif not has_a and has_b:
            status = "Added"
            explanation = (
                f"A new {title} clause was introduced in Document B that did not exist in Document A. "
                "Carefully evaluate the obligations this clause creates."
            )
        else:
            # Both have the clause — check meaningful change
            # Normalise whitespace/case for comparison
            norm_a = re.sub(r'\s+', ' ', sent_a.lower())
            norm_b = re.sub(r'\s+', ' ', sent_b.lower())
            if norm_a == norm_b:
                continue  # identical — no change to report
            status = "Modified"
            explanation = (
                f"The {title} clause wording changed between Document A and Document B. "
                "Compare the texts carefully to identify new obligations, altered deadlines, "
                "or modified rights."
            )

        changes.append({
            "clause_title": title,
            "status": status,
            "importance": importance,
            "doc_a_text": sent_a if sent_a else "Clause not present in Document A.",
            "doc_b_text": sent_b if sent_b else "Clause not present in Document B.",
            "explanation": explanation,
        })

    return changes


def _compare_with_gemini(
    api_key: str,
    doc_a_filename: str,
    doc_a_text: str,
    doc_b_filename: str,
    doc_b_text: str,
) -> List[Dict[str, Any]]:
    """
    Use Google Gemini to produce a structured clause-level diff.
    Falls back to NLP engine on failure.
    """
    import google.genai as genai

    client = genai.Client(api_key=api_key)

    prompt = f"""You are an expert legal document comparison assistant.
Compare Document A ("{doc_a_filename}") and Document B ("{doc_b_filename}") clause-by-clause.

Document A (first 6000 chars):
\"\"\"
{doc_a_text[:6000]}
\"\"\"

Document B (first 6000 chars):
\"\"\"
{doc_b_text[:6000]}
\"\"\"

Return ONLY a valid raw JSON array (no markdown fences) of change objects. Each object must follow:
{{
  "clause_title": "Short title of the clause category",
  "status": "Added" | "Removed" | "Modified",
  "importance": "High" | "Medium" | "Low",
  "doc_a_text": "Relevant text from Document A (or 'Clause not present.' if absent)",
  "doc_b_text": "Relevant text from Document B (or 'Clause not present.' if absent)",
  "explanation": "Plain-English explanation of the change and its practical impact on the reader."
}}

Guidelines:
- Only report meaningful changes, not trivial wording differences.
- Do NOT invent clauses. Only compare what is present.
- Include 4-8 high-quality change items covering the most legally significant differences.
- Do NOT provide legal advice. Use objective, descriptive language.
"""

    candidate_models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]

    for model in candidate_models:
        try:
            response = client.models.generate_content(model=model, contents=prompt)
            if response and response.text:
                raw = response.text.strip()
                # Strip markdown code fences if present
                raw = re.sub(r'^```(?:json)?\s*', '', raw, flags=re.MULTILINE)
                raw = re.sub(r'```\s*$', '', raw, flags=re.MULTILINE).strip()
                # Extract JSON array
                arr_match = re.search(r'(\[[\s\S]*\])', raw)
                if arr_match:
                    import json
                    return json.loads(arr_match.group(1))
        except Exception as err:
            print(f"[ComparisonService] Gemini model {model} failed: {err}. Trying next...")

    return []  # empty means we'll fall back to NLP


def compare_legal_documents(
    doc_a_filename: str,
    doc_a_text: str,
    doc_b_filename: str,
    doc_b_text: str,
) -> Dict[str, Any]:
    """
    Main comparison entry point.
    1. Attempts Gemini-powered structural diff if API key is present.
    2. Falls back to local NLP clause extraction & comparison.
    3. Classifies changes and returns a structured ComparisonResponse dict.
    """
    changes: List[Dict[str, Any]] = []

    api_key = settings.LLM_API_KEY
    if api_key and len(api_key.strip()) > 5:
        try:
            gemini_changes = _compare_with_gemini(
                api_key, doc_a_filename, doc_a_text, doc_b_filename, doc_b_text
            )
            if gemini_changes:
                changes = gemini_changes
        except Exception as e:
            print(f"[ComparisonService] Gemini comparison failed: {e}. Using NLP engine.")

    if not changes:
        changes = _diff_clauses_nlp(doc_a_text, doc_b_text)

    # Tally stats
    added_cnt = sum(1 for c in changes if c.get("status") == "Added")
    removed_cnt = sum(1 for c in changes if c.get("status") == "Removed")
    modified_cnt = sum(1 for c in changes if c.get("status") == "Modified")
    high_imp = sum(1 for c in changes if c.get("importance") == "High")

    return {
        "doc_a_filename": doc_a_filename,
        "doc_b_filename": doc_b_filename,
        "total_changes": len(changes),
        "high_importance_changes": high_imp,
        "added_count": added_cnt,
        "removed_count": removed_cnt,
        "modified_count": modified_cnt,
        "changes": changes,
    }
