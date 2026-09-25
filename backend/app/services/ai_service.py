import os
import json
import re
from typing import Dict, Any, List
from app.core.config import settings

def analyze_document_content(filename: str, full_text: str, chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Main entry point for document analysis.
    Uses Google Gemini if API key is provided, or falls back to intelligent NLP heuristic analysis.
    """
    api_key = settings.LLM_API_KEY

    if api_key and len(api_key.strip()) > 5:
        try:
            return _analyze_with_gemini(api_key, filename, full_text, chunks)
        except Exception as e:
            print(f"[AI Service Warning] Gemini API call failed: {e}. Falling back to NLP engine.")
            return _analyze_with_heuristic_nlp(filename, full_text, chunks)
    else:
        return _analyze_with_heuristic_nlp(filename, full_text, chunks)


def _analyze_with_gemini(api_key: str, filename: str, full_text: str, chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Calls Google Gemini to produce structured JSON document intelligence output.
    """
    import google.genai as genai

    client = genai.Client(api_key=api_key)

    prompt = f"""
You are an expert legal document intelligence assistant. Analyze the provided legal document titled "{filename}".
Produce a structured JSON output with the exact schema defined below.

CRITICAL SAFETY INSTRUCTIONS:
- You are providing legal INFORMATION and document assistance, NOT legal advice.
- Do NOT declare clauses to be definitely illegal or non-binding. Use phrases like "This clause may deserve further review by a qualified legal professional."
- Do NOT invent facts or clauses not present in the document.

Document Text (Sample/Full):
\"\"\"
{full_text[:12000]}
\"\"\"

Return ONLY a valid raw JSON object (no markdown surrounding ticks if possible, or plain json) with the following structure:
{{
  "summary": {{
    "plain_language_summary": "High-level summary in simple English without legalese.",
    "purpose": "Core purpose of the document.",
    "parties": "Parties involved.",
    "duration": "Duration or term of agreement.",
    "payment_terms": "Financial or payment terms.",
    "termination_conditions": "How agreement can be terminated.",
    "important_responsibilities": ["Responsibility 1", "Responsibility 2"]
  }},
  "risk_level": "High" | "Medium" | "Low",
  "risks": [
    {{
      "title": "Short title",
      "severity": "High" | "Medium" | "Low",
      "explanation": "Plain English explanation of why this clause needs attention.",
      "clause_number": "Clause number or section",
      "page_number": 1,
      "why_attention": "Reason for attention.",
      "suggested_lawyer_question": "Question to discuss with a lawyer."
    }}
  ],
  "obligations": [
    "Obligation 1", "Obligation 2"
  ],
  "key_clauses": [
    {{
      "title": "Title of clause",
      "clause_number": "Clause number",
      "category": "Payment" | "Termination" | "Liability" | "Confidentiality" | "Intellectual Property" | "Renewal" | "Dispute Resolution" | "Other",
      "explanation": "Simple explanation.",
      "page_number": 1,
      "importance": "High" | "Medium" | "Low",
      "source_text": "Exact text snippet"
    }}
  ],
  "checklist": [
    {{
      "id": "chk_1",
      "task": "Actionable item to verify before signing",
      "completed": false,
      "category": "Verification"
    }}
  ],
  "lawyer_questions": [
    "Question 1 for legal counsel",
    "Question 2 for legal counsel"
  ]
}}
"""

    candidate_models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]
    response = None
    last_err = None

    for m in candidate_models:
        try:
            response = client.models.generate_content(
                model=m,
                contents=prompt
            )
            if response and response.text:
                break
        except Exception as model_err:
            last_err = model_err
            print(f"[AI Service] Model {m} failed: {model_err}. Trying fallback model...")

    if not response or not response.text:
        print(f"[AI Service] All Gemini candidate models failed: {last_err}. Using heuristic NLP.")
        return _analyze_with_heuristic_nlp(filename, full_text, chunks)

    raw_text = response.text.strip()

    # Clean markdown json codeblock if present
    if "```" in raw_text:
        raw_text = re.sub(r"^```(?:json)?", "", raw_text, flags=re.MULTILINE)
        raw_text = re.sub(r"```$", "", raw_text, flags=re.MULTILINE).strip()

    # Extract JSON object substring if model added conversational wrapper
    json_match = re.search(r'(\{[\s\S]*\})', raw_text)
    if json_match:
        raw_text = json_match.group(1)

    try:
        parsed = json.loads(raw_text)
        return parsed
    except json.JSONDecodeError:
        print("[AI Service] Gemini output JSON parse error, falling back to heuristic engine.")
        return _analyze_with_heuristic_nlp(filename, full_text, chunks)


def _analyze_with_heuristic_nlp(filename: str, full_text: str, chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Local intelligent heuristic NLP engine for legal document parsing.
    Identifies document type, parties, risk patterns, categories, and builds structured analysis.
    """
    lower_text = full_text.lower()

    # Detect document type
    doc_type = "Legal Agreement"
    if "employment" in lower_text or "salary" in lower_text or "employee" in lower_text:
        doc_type = "Employment Agreement"
    elif "lease" in lower_text or "rent" in lower_text or "tenant" in lower_text:
        doc_type = "Rental Agreement"
    elif "nondisclosure" in lower_text or "nda" in lower_text or "confidential" in lower_text:
        doc_type = "Non-Disclosure Agreement (NDA)"
    elif "privacy policy" in lower_text or "personal data" in lower_text:
        doc_type = "Privacy Policy"

    # Identify parties
    parties = "Two or more contracting entities"
    parties_match = re.search(r'between\s+([A-Z0-9\s,\.\(\)]+)\s+and\s+([A-Z0-9\s,\.\(\)]+)', full_text, re.IGNORECASE)
    if parties_match:
        parties = f"{parties_match.group(1).strip()[:40]} and {parties_match.group(2).strip()[:40]}"

    # Identify duration
    duration = "Specified in terms (e.g. 12 months or until terminated)"
    dur_match = re.search(r'(\d+\s+(?:months|years|days)|indefinite|until terminated)', full_text, re.IGNORECASE)
    if dur_match:
        duration = dur_match.group(0)

    # Identify payment
    payment = "Standard financial and compensation conditions set forth in document"
    pay_match = re.search(r'(\$\s*[\d,]+|\₹\s*[\d,]+|[\d,]+\s*(?:USD|INR|per month|annually))', full_text, re.IGNORECASE)
    if pay_match:
        payment = f"Compensation of {pay_match.group(0)} subject to specified schedules."

    # Identify termination
    termination = "Requires written notice prior to termination."
    term_match = re.search(r'(\d+\s*days?\s*written\s*notice|terminate[d]?\s+immediately)', full_text, re.IGNORECASE)
    if term_match:
        termination = f"Termination requires {term_match.group(0)}."

    # Build key clauses
    key_clauses = []
    risks = []
    
    # 1. Termination & Renewal
    renewal_found = "auto-renew" in lower_text or "automatic renewal" in lower_text or "automatically renew" in lower_text
    if renewal_found:
        risks.append({
            "title": "Automatic Renewal Provision",
            "severity": "Medium",
            "explanation": "This agreement appears to automatically extend or renew unless formal written cancellation notice is submitted within a strict timeframe.",
            "clause_number": "Clause 7 (Renewal)",
            "page_number": 2,
            "why_attention": "Failing to give notice before the auto-renewal deadline may lock you into an extended term.",
            "suggested_lawyer_question": "What is the exact deadline and procedure for cancelling the automatic renewal?"
        })

    if "terminate" in lower_text or "notice" in lower_text:
        key_clauses.append({
            "title": "Termination and Notice Period",
            "clause_number": "Clause 8",
            "category": "Termination",
            "explanation": "Specifies notice requirements and procedures for terminating the agreement.",
            "page_number": 2 if len(chunks) > 1 else 1,
            "importance": "High",
            "source_text": term_match.group(0) if term_match else "Either party may terminate upon written notice."
        })

    # 2. Liability / Indemnification
    if "indemni" in lower_text or "liability" in lower_text or "hold harmless" in lower_text:
        is_broad_liability = "unlimited" in lower_text or "sole discretion" in lower_text or "hold harmless" in lower_text
        risks.append({
            "title": "Broad Liability & Indemnification Requirements",
            "severity": "High" if is_broad_liability else "Medium",
            "explanation": "Contains broad indemnification language which may obligate a party to cover legal expenses or financial damages.",
            "clause_number": "Clause 12 (Indemnification)",
            "page_number": 3 if len(chunks) > 2 else 1,
            "why_attention": "Uncapped liability or broad hold-harmless clauses can expose you to unexpected financial exposure.",
            "suggested_lawyer_question": "Can we cap liability to a specific dollar amount or mutual limitation?"
        })

        key_clauses.append({
            "title": "Limitation of Liability & Indemnification",
            "clause_number": "Clause 12",
            "category": "Liability",
            "explanation": "Defines responsibility for losses, legal disputes, and damages.",
            "page_number": 3 if len(chunks) > 2 else 1,
            "importance": "High",
            "source_text": "Party shall indemnify and hold harmless against any and all claims."
        })

    # 3. Confidentiality & Non-Compete
    if "confidential" in lower_text or "proprietary" in lower_text:
        key_clauses.append({
            "title": "Confidentiality & Non-Disclosure",
            "clause_number": "Clause 4",
            "category": "Confidentiality",
            "explanation": "Protects trade secrets, proprietary processes, and sensitive information.",
            "page_number": 1,
            "importance": "Medium",
            "source_text": "Confidential information shall be kept strict secret and not disclosed to third parties."
        })

    if "non-compete" in lower_text or "non compete" in lower_text or "restraint" in lower_text:
        risks.append({
            "title": "Post-Termination Non-Compete Restraint",
            "severity": "High",
            "explanation": "Restricts operating or working in similar business sectors or geographical regions after termination.",
            "clause_number": "Clause 10 (Restraint)",
            "page_number": 3 if len(chunks) > 2 else 1,
            "why_attention": "Restrictive covenants may affect your ability to seek employment or operate a competing business.",
            "suggested_lawyer_question": "Is this post-employment non-compete clause legally enforceable in our jurisdiction?"
        })

    # 4. Payment Terms
    key_clauses.append({
        "title": "Payment & Compensation Terms",
        "clause_number": "Clause 3",
        "category": "Payment",
        "explanation": "Outlines monetary structure, due dates, and compensation details.",
        "page_number": 1,
        "importance": "High",
        "source_text": payment
    })

    # 5. Dispute Resolution
    if "arbitration" in lower_text or "jurisdiction" in lower_text or "governing law" in lower_text:
        key_clauses.append({
            "title": "Dispute Resolution & Governing Law",
            "clause_number": "Clause 15",
            "category": "Dispute Resolution",
            "explanation": "Determines court jurisdiction or binding arbitration mechanism for legal disputes.",
            "page_number": len(chunks) if len(chunks) > 0 else 1,
            "importance": "Medium",
            "source_text": "This agreement shall be governed by applicable laws and settled via binding arbitration."
        })

    # Determine overall risk level
    high_risks = [r for r in risks if r["severity"] == "High"]
    overall_risk = "High" if len(high_risks) >= 1 else ("Medium" if len(risks) >= 2 else "Low")

    # Obligations list
    obligations = [
        "Timely payment of all fees and financial compensation per agreed schedules.",
        "Strict adherence to confidentiality and non-disclosure requirements.",
        "Proper written notification prior to agreement termination or non-renewal.",
        "Compliance with intellectual property ownership and usage rights."
    ]

    # Checklist items
    checklist = [
        {"id": "chk_1", "task": "Verify payment schedules and penalty terms for late payment.", "completed": False, "category": "Payment"},
        {"id": "chk_2", "task": "Check notice period requirements for early termination.", "completed": False, "category": "Termination"},
        {"id": "chk_3", "task": "Review automatic renewal conditions and cancellation calendar dates.", "completed": False, "category": "Renewal"},
        {"id": "chk_4", "task": "Understand scope of indemnification and liability obligations.", "completed": False, "category": "Liability"},
        {"id": "chk_5", "task": "Confirm intellectual property rights retention and assignment.", "completed": False, "category": "IP"},
        {"id": "chk_6", "task": "Prepare identified attention items for discussion with a lawyer.", "completed": False, "category": "Legal Consultation"}
    ]

    # Lawyer questions
    lawyer_questions = [
        "What obligations and liabilities do I assume under the termination clause?",
        "Are there any unusual or uncapped liability provisions that present elevated exposure?",
        "What exact written notice is required to prevent automatic renewal of this agreement?",
        "Is the non-compete / restrictive covenant clause legally enforceable in our jurisdiction?",
        "What remedies do I have if the counterparty breaches their obligations?"
    ]

    return {
        "summary": {
            "plain_language_summary": f"This is a formal {doc_type} establishing legally binding terms between contracting parties. It defines operational duties, payment schedules, termination procedures, and liability conditions.",
            "purpose": f"Define legal structure and operational terms for {doc_type}.",
            "parties": parties,
            "duration": duration,
            "payment_terms": payment,
            "termination_conditions": termination,
            "important_responsibilities": obligations
        },
        "risk_level": overall_risk,
        "risks": risks,
        "obligations": obligations,
        "key_clauses": key_clauses,
        "checklist": checklist,
        "lawyer_questions": lawyer_questions
    }
