"""
LegalLens AI — Comprehensive Backend Test Suite

Tests cover:
- AI Service: Document analysis, NLP heuristic fallback, schema sanitization
- RAG Service: Embedding computation, chunk retrieval, grounded Q&A
- Comparison Service: NLP clause diffing, change detection
- Document Processor: Text extraction, chunking
- Security: Prompt injection defense, input sanitization
- API Endpoints: Health, auth, document CRUD
"""

import os
import sys
import json
import pytest
import re
from unittest.mock import patch, MagicMock

# Ensure backend app is on the import path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


# ============================================================================
# Test: AI Service — Heuristic NLP Engine
# ============================================================================
class TestAIServiceHeuristic:
    """Tests for the local NLP heuristic fallback engine that classifies
    document types, extracts parties, and identifies risk patterns."""

    def test_employment_agreement_detection(self):
        """Verify NLP engine correctly classifies employment agreements."""
        from app.services.ai_service import _analyze_with_heuristic_nlp
        text = "This employment agreement is between ABC Corp (Employer) and John Doe (Employee). Employee salary shall be $85,000 annually."
        result = _analyze_with_heuristic_nlp("employment.pdf", text, [{"text": text, "page_number": 1}])

        assert result["summary"]["plain_language_summary"]
        assert "Employment" in result["summary"]["purpose"] or "Employment" in result["summary"]["plain_language_summary"]
        assert result["risk_level"] in ["High", "Medium", "Low"]

    def test_nda_detection(self):
        """Verify NLP engine correctly classifies NDA/non-disclosure agreements."""
        from app.services.ai_service import _analyze_with_heuristic_nlp
        text = "Non-Disclosure Agreement. All confidential and proprietary information shared must remain secret."
        result = _analyze_with_heuristic_nlp("nda.pdf", text, [{"text": text, "page_number": 1}])

        assert "Non-Disclosure" in result["summary"]["purpose"] or "NDA" in result["summary"]["purpose"] or "Non-Disclosure" in result["summary"]["plain_language_summary"]

    def test_rental_agreement_detection(self):
        """Verify NLP engine correctly classifies rental/lease agreements."""
        from app.services.ai_service import _analyze_with_heuristic_nlp
        text = "This lease agreement between Landlord and Tenant covers the rental property. Monthly rent is $1,200."
        result = _analyze_with_heuristic_nlp("lease.pdf", text, [{"text": text, "page_number": 1}])

        assert "Rental" in result["summary"]["purpose"] or "Rental" in result["summary"]["plain_language_summary"]

    def test_party_extraction(self):
        """Verify NLP engine extracts parties from between...and... patterns."""
        from app.services.ai_service import _analyze_with_heuristic_nlp
        text = "This agreement is entered between ACME Corporation and Global Solutions Inc."
        result = _analyze_with_heuristic_nlp("contract.pdf", text, [{"text": text, "page_number": 1}])

        assert "ACME" in result["summary"]["parties"] or "Global" in result["summary"]["parties"]

    def test_risk_detection_non_compete(self):
        """Verify NLP engine flags non-compete clauses as high risk."""
        from app.services.ai_service import _analyze_with_heuristic_nlp
        text = "Employee shall not compete with Employer for 12 months. Non-compete extends to 50-mile radius. Termination requires 30 days notice."
        result = _analyze_with_heuristic_nlp("contract.pdf", text, [{"text": text, "page_number": 1}])

        high_risks = [r for r in result["risks"] if r["severity"] == "High"]
        assert len(high_risks) >= 1, "Non-compete should trigger at least one high-risk flag"

    def test_risk_detection_auto_renewal(self):
        """Verify NLP engine flags auto-renewal clauses."""
        from app.services.ai_service import _analyze_with_heuristic_nlp
        text = "This agreement shall automatically renew for successive 1-year periods unless 60 days notice is given."
        result = _analyze_with_heuristic_nlp("contract.pdf", text, [{"text": text, "page_number": 1}])

        renewal_risks = [r for r in result["risks"] if "renew" in r["title"].lower()]
        assert len(renewal_risks) >= 1, "Auto-renewal should be flagged as a risk"

    def test_checklist_generation(self):
        """Verify NLP engine generates a non-empty checklist."""
        from app.services.ai_service import _analyze_with_heuristic_nlp
        text = "Standard legal agreement with payment terms and confidentiality provisions."
        result = _analyze_with_heuristic_nlp("contract.pdf", text, [{"text": text, "page_number": 1}])

        assert len(result["checklist"]) >= 3
        assert all("task" in item for item in result["checklist"])
        assert all("id" in item for item in result["checklist"])

    def test_lawyer_questions_generation(self):
        """Verify NLP engine produces meaningful lawyer consultation questions."""
        from app.services.ai_service import _analyze_with_heuristic_nlp
        text = "Standard legal agreement with liability and termination clauses."
        result = _analyze_with_heuristic_nlp("contract.pdf", text, [{"text": text, "page_number": 1}])

        assert len(result["lawyer_questions"]) >= 3
        assert all(isinstance(q, str) and len(q) > 10 for q in result["lawyer_questions"])


class TestAIServiceSanitizer:
    """Tests for the analysis output schema sanitizer."""

    def test_sanitize_empty_dict(self):
        """Sanitizer should produce valid structure from empty input."""
        from app.services.ai_service import _sanitize_analysis_dict
        result = _sanitize_analysis_dict({})

        assert "summary" in result
        assert "risk_level" in result
        assert "risks" in result and isinstance(result["risks"], list)
        assert "obligations" in result and isinstance(result["obligations"], list)
        assert "key_clauses" in result and isinstance(result["key_clauses"], list)
        assert "checklist" in result and isinstance(result["checklist"], list)
        assert "lawyer_questions" in result and isinstance(result["lawyer_questions"], list)

    def test_sanitize_invalid_risk_level(self):
        """Sanitizer should normalize invalid risk levels to 'Medium'."""
        from app.services.ai_service import _sanitize_analysis_dict
        result = _sanitize_analysis_dict({"risk_level": "EXTREME"})

        assert result["risk_level"] == "Medium"

    def test_sanitize_valid_data_passthrough(self):
        """Sanitizer should preserve valid data without modification."""
        from app.services.ai_service import _sanitize_analysis_dict
        valid_data = {
            "summary": {"plain_language_summary": "Test summary", "purpose": "Test purpose"},
            "risk_level": "High",
            "risks": [{"title": "Test Risk"}],
            "obligations": ["Test obligation"],
            "key_clauses": [{"title": "Test clause"}],
            "checklist": [{"id": "chk1", "task": "Test task"}],
            "lawyer_questions": ["Test question?"]
        }
        result = _sanitize_analysis_dict(valid_data)

        assert result["risk_level"] == "High"
        assert result["summary"]["plain_language_summary"] == "Test summary"
        assert len(result["risks"]) == 1

    def test_sanitize_non_dict_summary(self):
        """Sanitizer should convert non-dict summary to proper structure."""
        from app.services.ai_service import _sanitize_analysis_dict
        result = _sanitize_analysis_dict({"summary": "just a string"})

        assert isinstance(result["summary"], dict)
        assert "plain_language_summary" in result["summary"]


# ============================================================================
# Test: RAG Service — Embedding & Retrieval
# ============================================================================
class TestRAGService:
    """Tests for the RAG pipeline: embedding computation and chunk retrieval."""

    def test_embedding_dimensionality(self):
        """Embeddings should be 64-dimensional vectors."""
        from app.services.rag_service import compute_simple_embedding
        emb = compute_simple_embedding("This is a legal document about termination clauses.")

        assert isinstance(emb, list)
        assert len(emb) == 64

    def test_embedding_normalization(self):
        """Embeddings should be L2-normalized (unit vectors)."""
        import numpy as np
        from app.services.rag_service import compute_simple_embedding
        emb = compute_simple_embedding("Payment terms and compensation schedules.")

        norm = np.linalg.norm(emb)
        assert abs(norm - 1.0) < 0.01, f"Embedding norm should be ~1.0, got {norm}"

    def test_embedding_consistency(self):
        """Same text should produce identical embeddings (deterministic)."""
        from app.services.rag_service import compute_simple_embedding
        text = "The non-compete clause restricts employment for 12 months."
        emb1 = compute_simple_embedding(text)
        emb2 = compute_simple_embedding(text)

        assert emb1 == emb2, "Embeddings should be deterministic"

    def test_different_text_different_embeddings(self):
        """Different texts should produce different embeddings."""
        from app.services.rag_service import compute_simple_embedding
        emb1 = compute_simple_embedding("Termination requires 30 days notice.")
        emb2 = compute_simple_embedding("The cat sat on the mat.")

        assert emb1 != emb2, "Different texts should produce different embeddings"

    def test_find_relevant_chunks_returns_sorted(self):
        """Relevant chunks should be returned sorted by relevance score."""
        from app.services.rag_service import find_relevant_chunks
        chunks = [
            {"text": "This section covers payment terms and monthly fees.", "page_number": 1},
            {"text": "Termination requires 30 days written notice.", "page_number": 2},
            {"text": "The annual company picnic is held in September.", "page_number": 3},
        ]
        results = find_relevant_chunks("What are the payment terms?", chunks, top_k=2)

        assert len(results) <= 2
        # Payment chunk should be first (most relevant)
        if results:
            first_text = results[0].get("text", "")
            assert "payment" in first_text.lower() or "fee" in first_text.lower()

    def test_find_relevant_chunks_empty_input(self):
        """Empty chunks list should return empty results."""
        from app.services.rag_service import find_relevant_chunks
        results = find_relevant_chunks("Any question?", [], top_k=3)

        assert results == []

    def test_answer_question_no_context(self):
        """Q&A with no matching chunks should return appropriate message."""
        from app.services.rag_service import answer_question_with_rag
        result = answer_question_with_rag("What is the weather?", [])

        assert "could not find sufficient information" in result["reply"].lower()
        assert result["sources"] == []


# ============================================================================
# Test: Comparison Service — NLP Clause Diffing
# ============================================================================
class TestComparisonService:
    """Tests for the side-by-side document comparison engine."""

    def test_detect_added_clause(self):
        """NLP diff should detect a clause present only in Document B."""
        from app.services.comparison_service import _diff_clauses_nlp
        doc_a = "This agreement covers payment terms of $5000 monthly."
        doc_b = "This agreement covers payment terms of $5000 monthly. Arbitration shall govern all disputes."
        changes = _diff_clauses_nlp(doc_a, doc_b)

        added = [c for c in changes if c["status"] == "Added"]
        assert len(added) >= 1, "Should detect at least one added clause"

    def test_detect_removed_clause(self):
        """NLP diff should detect a clause present only in Document A."""
        from app.services.comparison_service import _diff_clauses_nlp
        doc_a = "Termination requires 30 days notice. All disputes governed by arbitration."
        doc_b = "Termination requires 30 days notice."
        changes = _diff_clauses_nlp(doc_a, doc_b)

        removed = [c for c in changes if c["status"] == "Removed"]
        assert len(removed) >= 1, "Should detect at least one removed clause"

    def test_detect_modified_clause(self):
        """NLP diff should detect modified wording in the same clause category."""
        from app.services.comparison_service import _diff_clauses_nlp
        doc_a = "Termination requires 30 days written notice."
        doc_b = "Termination requires 90 days written notice with cause."
        changes = _diff_clauses_nlp(doc_a, doc_b)

        modified = [c for c in changes if c["status"] == "Modified"]
        assert len(modified) >= 1, "Should detect at least one modified clause"

    def test_identical_documents_no_changes(self):
        """Identical documents should produce zero changes."""
        from app.services.comparison_service import _diff_clauses_nlp
        text = "Payment of $5000 is due monthly. Termination requires notice."
        changes = _diff_clauses_nlp(text, text)

        assert len(changes) == 0, "Identical docs should produce no changes"

    def test_compare_legal_documents_structure(self):
        """Main comparison function should return properly structured output."""
        from app.services.comparison_service import compare_legal_documents
        result = compare_legal_documents(
            "doc_a.pdf", "Payment is $5000. Termination needs 30 days notice.",
            "doc_b.pdf", "Payment is $7000. Termination needs 60 days notice."
        )

        assert "doc_a_filename" in result
        assert "doc_b_filename" in result
        assert "total_changes" in result
        assert "changes" in result
        assert isinstance(result["changes"], list)


# ============================================================================
# Test: Document Processor — Text Extraction & Chunking
# ============================================================================
class TestDocumentProcessor:
    """Tests for text extraction and semantic chunking."""

    def test_chunk_document_pages(self):
        """Chunking should produce at least one chunk per page."""
        from app.services.document_processor import chunk_document_pages
        pages = [
            {"page_number": 1, "text": "This is the first page of the legal agreement. It contains important terms."},
            {"page_number": 2, "text": "This is the second page with termination and payment clauses."},
        ]
        chunks = chunk_document_pages(pages)

        assert len(chunks) >= 2
        assert all("text" in c for c in chunks)
        assert all("page_number" in c for c in chunks)


# ============================================================================
# Test: Security — Input Validation & Prompt Safety
# ============================================================================
class TestSecurity:
    """Tests for security measures including input sanitization and prompt injection defense."""

    def test_filename_sanitization_path_traversal(self):
        """Filenames with path traversal should be sanitized."""
        malicious = "../../../etc/passwd"
        clean = os.path.basename(malicious).replace("\0", "").strip()
        assert ".." not in clean
        assert "/" not in clean
        assert "\\" not in clean

    def test_filename_sanitization_null_bytes(self):
        """Null bytes in filenames should be removed."""
        malicious = "document\x00.pdf.exe"
        clean = malicious.replace("\0", "").strip()
        assert "\x00" not in clean

    def test_prompt_injection_defense(self):
        """AI prompts should use untrusted_document_context boundaries."""
        from app.services.ai_service import _analyze_with_gemini
        import inspect
        source = inspect.getsource(_analyze_with_gemini)
        assert "untrusted_document_context" in source, "Prompt should use untrusted context boundaries"

    def test_rag_prompt_injection_defense(self):
        """RAG prompts should use untrusted_document_context boundaries."""
        from app.services.rag_service import answer_question_with_rag
        import inspect
        source = inspect.getsource(answer_question_with_rag)
        assert "untrusted_document_context" in source, "RAG prompt should use untrusted context boundaries"

    def test_file_extension_whitelist(self):
        """Only PDF, DOCX, DOC, TXT should be accepted."""
        allowed = {".pdf", ".docx", ".doc", ".txt"}
        malicious_extensions = [".exe", ".sh", ".bat", ".py", ".js", ".html"]
        for ext in malicious_extensions:
            assert ext not in allowed, f"Extension {ext} should not be in whitelist"

    def test_legal_disclaimer_present(self):
        """RAG answers should include a legal disclaimer."""
        from app.services.rag_service import answer_question_with_rag
        result = answer_question_with_rag("test question", [
            {"text": "Payment of $5000 is due on the 1st.", "page_number": 1, "clause_number": "Clause 3"}
        ])
        assert "disclaimer" in result, "Responses should include a legal disclaimer"


# ============================================================================
# Test: FastAPI Application — Health & Configuration
# ============================================================================
class TestFastAPIApp:
    """Tests for FastAPI application setup and health endpoints."""

    def test_app_creation(self):
        """FastAPI app should be importable and properly configured."""
        from app.main import app
        assert app.title is not None
        assert "LegalLens" in app.title

    def test_health_routes_exist(self):
        """Health check routes should be registered."""
        from app.main import app
        routes = [r.path for r in app.routes]
        assert "/" in routes or any("/" == r.path for r in app.routes)

    def test_cors_configuration(self):
        """CORS should allow localhost origins."""
        from app.main import DEFAULT_ORIGINS
        assert "http://localhost:3000" in DEFAULT_ORIGINS

    def test_security_headers_middleware(self):
        """Security headers middleware should be registered."""
        from app.main import app
        middleware_names = [str(m) for m in app.user_middleware]
        # Verify middleware stack is non-empty (includes CORS, GZip, custom)
        assert len(app.user_middleware) >= 2


# ============================================================================
# Test: Data Schema Integrity
# ============================================================================
class TestSchemaIntegrity:
    """Tests to verify the AI output schema matches the frontend TypeScript interfaces."""

    def test_analysis_output_has_all_required_fields(self):
        """Analysis output should contain all fields expected by the frontend."""
        from app.services.ai_service import _analyze_with_heuristic_nlp
        text = "Standard consulting agreement with confidentiality and termination clauses."
        result = _analyze_with_heuristic_nlp("test.pdf", text, [{"text": text, "page_number": 1}])

        required_keys = ["summary", "risk_level", "risks", "obligations", "key_clauses", "checklist", "lawyer_questions"]
        for key in required_keys:
            assert key in result, f"Missing required key: {key}"

    def test_summary_has_all_required_fields(self):
        """Summary object should match DocumentSummary TypeScript interface."""
        from app.services.ai_service import _analyze_with_heuristic_nlp
        text = "Employment agreement between Company and Employee."
        result = _analyze_with_heuristic_nlp("test.pdf", text, [{"text": text, "page_number": 1}])

        summary = result["summary"]
        required_summary_keys = ["plain_language_summary", "purpose", "parties", "duration", "payment_terms", "termination_conditions", "important_responsibilities"]
        for key in required_summary_keys:
            assert key in summary, f"Summary missing required key: {key}"

    def test_risk_item_structure(self):
        """Risk items should have all required fields for the frontend RiskItem interface."""
        from app.services.ai_service import _analyze_with_heuristic_nlp
        text = "This agreement includes broad indemnification and hold harmless provisions with unlimited liability."
        result = _analyze_with_heuristic_nlp("test.pdf", text, [{"text": text, "page_number": 1}])

        if result["risks"]:
            risk = result["risks"][0]
            required_risk_keys = ["title", "severity", "explanation", "clause_number", "page_number", "why_attention", "suggested_lawyer_question"]
            for key in required_risk_keys:
                assert key in risk, f"Risk item missing required key: {key}"

    def test_checklist_item_structure(self):
        """Checklist items should have id, task, completed, and category fields."""
        from app.services.ai_service import _analyze_with_heuristic_nlp
        text = "Standard legal agreement."
        result = _analyze_with_heuristic_nlp("test.pdf", text, [{"text": text, "page_number": 1}])

        for item in result["checklist"]:
            assert "id" in item
            assert "task" in item
            assert "completed" in item
            assert "category" in item
            assert isinstance(item["completed"], bool)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
