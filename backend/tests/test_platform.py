import pytest
import os
from app.core.security import get_password_hash, verify_password, create_access_token
from app.services.rag_service import compute_simple_embedding, find_relevant_chunks
from app.services.comparison_service import compare_legal_documents
from app.services.ai_service import _analyze_with_heuristic_nlp
from app.services.document_processor import chunk_document_pages

def test_password_hashing_and_verification():
    raw_pwd = "SuperSecretPassword2026!"
    hashed = get_password_hash(raw_pwd)
    assert hashed != raw_pwd
    assert verify_password(raw_pwd, hashed) is True
    assert verify_password("WrongPassword123!", hashed) is False

def test_jwt_token_generation():
    token = create_access_token(subject="user_test_12345")
    assert isinstance(token, str)
    assert len(token) > 20

def test_embedding_computation_and_similarity():
    vec1 = compute_simple_embedding("The notice period for termination is thirty days.")
    vec2 = compute_simple_embedding("Either party may terminate upon thirty days notice.")
    vec3 = compute_simple_embedding("The annual compensation and base salary is $150,000.")
    assert len(vec1) == 64
    assert len(vec2) == 64
    
    chunks = [
        {"chunk_text": "Either party may terminate upon thirty days notice.", "page_number": 1, "clause_number": "Clause 3"},
        {"chunk_text": "The annual compensation and base salary is $150,000.", "page_number": 1, "clause_number": "Clause 2"}
    ]
    relevant = find_relevant_chunks("How many days notice to terminate?", chunks, top_k=1)
    assert len(relevant) >= 1
    assert "terminate" in relevant[0]["chunk_text"].lower()

def test_chunking_logic():
    p1 = "Paragraph 1 about agreement terms. " * 15
    p2 = "Paragraph 2 about compensation details. " * 15
    pages = [
        {"page_number": 1, "text": f"{p1}\n\n{p2}"}
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

def test_document_comparison_engine():
    doc_a = "Agreement requires 30 days notice. Payment within Net 30 days."
    doc_b = "Agreement requires 60 days notice. Payment within Net 15 days. Post-employment non-compete for 12 months."
    
    cmp = compare_legal_documents("Agreement_v1.docx", doc_a, "Agreement_v2.docx", doc_b)
    assert cmp["total_changes"] >= 2
    assert cmp["added_count"] >= 1 or cmp["modified_count"] >= 1
    titles = [c["clause_title"] for c in cmp["changes"]]
    assert any("Termination" in t or "Compete" in t or "Payment" in t for t in titles)
