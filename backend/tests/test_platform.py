import pytest
import os
from app.core.security import get_password_hash, verify_password, create_access_token, decode_access_token
from app.services.rag_service import compute_simple_embedding, find_relevant_chunks, answer_question_with_rag
from app.services.comparison_service import compare_legal_documents
from app.services.ai_service import _analyze_with_heuristic_nlp, _sanitize_analysis_dict
from app.services.document_processor import chunk_document_pages


def test_password_hashing_and_verification():
    raw_pwd = "SuperSecretPassword2026!"
    hashed = get_password_hash(raw_pwd)
    assert hashed != raw_pwd
    assert verify_password(raw_pwd, hashed) is True
    assert verify_password("WrongPassword123!", hashed) is False


def test_jwt_token_generation_and_decoding():
    user_id = "user_test_uuid_98765"
    token = create_access_token(subject=user_id)
    assert isinstance(token, str)
    assert len(token) > 20
    decoded_sub = decode_access_token(token)
    assert decoded_sub == user_id
    assert decode_access_token("invalid.token.here") is None


def test_embedding_computation_and_similarity():
    vec1 = compute_simple_embedding("The notice period for termination is thirty days.")
    vec2 = compute_simple_embedding("Either party may terminate upon thirty days notice.")
    assert len(vec1) == 64
    assert len(vec2) == 64

    chunks = [
        {"chunk_text": "Either party may terminate upon thirty days notice.", "page_number": 1, "clause_number": "Clause 3"},
        {"chunk_text": "The annual compensation and base salary is $150,000.", "page_number": 1, "clause_number": "Clause 2"}
    ]
    relevant = find_relevant_chunks("How many days notice to terminate?", chunks, top_k=1)
    assert len(relevant) >= 1
    assert "terminate" in relevant[0]["chunk_text"].lower()


def test_chunking_logic_and_edge_cases():
    p1 = "Paragraph 1 about agreement terms. " * 15
    p2 = "Paragraph 2 about compensation details. " * 15
    pages = [
        {"page_number": 1, "text": f"{p1}\n\n{p2}"},
        {"page_number": 2, "text": ""}
    ]
    chunks = chunk_document_pages(pages)
    assert len(chunks) == 2
    assert chunks[0]["page_number"] == 1
    assert "Paragraph 1" in chunks[0]["text"]


def test_heuristic_nlp_analysis():
    text = """
    EMPLOYMENT AGREEMENT
    This agreement is between TechCorp LLC and John Doe.
    Term: 12 months with automatic renewal unless notice is provided.
    Compensation: $120,000 per month.
    Termination requires 30 days written notice.
    Employee agrees to indemnify and hold harmless Employer.
    """
    chunks = [{"text": text, "page_number": 1, "clause_number": "1"}]
    analysis = _analyze_with_heuristic_nlp("Employment_Agreement.pdf", text, chunks)

    assert "summary" in analysis
    assert "risks" in analysis
    assert "key_clauses" in analysis
    assert "checklist" in analysis
    assert "lawyer_questions" in analysis
    assert len(analysis["risks"]) >= 1
    assert analysis["risk_level"] in ["High", "Medium", "Low"]


def test_document_comparison_engine():
    doc_a = "Agreement requires 30 days notice. Payment within Net 30 days."
    doc_b = "Agreement requires 60 days notice. Payment within Net 15 days. Post-employment non-compete for 12 months."

    cmp = compare_legal_documents("Agreement_v1.docx", doc_a, "Agreement_v2.docx", doc_b)
    assert cmp["total_changes"] >= 2
    assert cmp["added_count"] >= 1 or cmp["modified_count"] >= 1
    titles = [c["clause_title"] for c in cmp["changes"]]
    assert any("Termination" in t or "Compete" in t or "Payment" in t for t in titles)


def test_schema_sanitization_helper():
    raw_incomplete = {
        "summary": "Simple string summary",
        "risk_level": "UnknownLevel",
    }
    sanitized = _sanitize_analysis_dict(raw_incomplete)
    assert isinstance(sanitized["summary"], dict)
    assert sanitized["risk_level"] == "Medium"
    assert isinstance(sanitized["risks"], list)
    assert isinstance(sanitized["checklist"], list)
    assert isinstance(sanitized["lawyer_questions"], list)


def test_rag_pipeline_answer_and_disclaimer():
    chunks = [
        {
            "chunk_text": "The Consultant shall be paid a consulting fee of $150 per hour payable Net 30 days.",
            "page_number": 2,
            "clause_number": "Clause 4.1"
        }
    ]
    res = answer_question_with_rag("What is the consulting hourly rate?", chunks)
    assert "reply" in res
    assert "disclaimer" in res
    assert len(res["sources"]) >= 1
    assert res["sources"][0]["clause_number"] == "Clause 4.1"
    assert "does not replace professional legal advice" in res["disclaimer"].lower()


def test_chat_request_flexible_payload():
    from app.schemas.schemas import ChatRequest
    # Verify standard message
    c1 = ChatRequest(document_id="doc-123", message="How to terminate?")
    assert c1.message == "How to terminate?"

    # Verify 'question' alias
    c2 = ChatRequest.model_validate({"document_id": "doc-123", "question": "What are payment terms?"})
    assert c2.message == "What are payment terms?"

    # Verify 'query' alias
    c3 = ChatRequest.model_validate({"document_id": "doc-123", "query": "Is there a non-compete?"})
    assert c3.message == "Is there a non-compete?"


def test_user_create_validation():
    from app.schemas.schemas import UserCreate
    # Valid user
    u = UserCreate(name="  Jane Doe  ", email="  Jane.Doe@EXAMPLE.COM  ", password="SecurePassword123!")
    assert u.name == "Jane Doe"
    assert u.email == "jane.doe@example.com"

    # Password too short (< 8 chars)
    with pytest.raises(ValueError):
        UserCreate(name="Jane", email="jane@example.com", password="short")


def test_sanitize_filename_helper():
    from app.api.compare import _sanitize_filename
    assert _sanitize_filename("valid_contract.pdf") == "valid_contract.pdf"
    assert _sanitize_filename("../../../etc/passwd") == "passwd"
    assert _sanitize_filename("..\\..\\secret.docx") == "secret.docx"
    assert _sanitize_filename("") == "upload"
    assert "\0" not in _sanitize_filename("bad\0file.pdf")


def test_chat_and_comparison_response_sync():
    from app.schemas.schemas import ChatResponse, ComparisonResponse
    # ChatResponse auto-populates answer from reply
    cr = ChatResponse(reply="Test reply message", sources=[])
    assert cr.reply == "Test reply message"
    assert cr.answer == "Test reply message"

    # ComparisonResponse auto-populates doc_a_name and doc_b_name from doc_a_filename and doc_b_filename
    cmp = ComparisonResponse(
        doc_a_filename="Contract_A.pdf",
        doc_b_filename="Contract_B.pdf",
        total_changes=0,
        high_importance_changes=0,
        added_count=0,
        removed_count=0,
        modified_count=0,
        changes=[]
    )
    assert cmp.doc_a_name == "Contract_A.pdf"
    assert cmp.doc_b_name == "Contract_B.pdf"



