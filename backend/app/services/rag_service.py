import os
import re
import numpy as np
from typing import List, Dict, Any
from app.core.config import settings

def compute_simple_embedding(text: str) -> List[float]:
    """
    Computes a lightweight semantic embedding vector for a text string.
    Uses TF-IDF / word-hashing vectorization for fast local execution without external API latency.
    """
    words = re.findall(r'\w+', text.lower())
    vocab_size = 64
    vec = [0.0] * vocab_size
    for word in words:
        idx = hash(word) % vocab_size
        vec[idx] += 1.0
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = (np.array(vec) / norm).tolist()
    return vec

def find_relevant_chunks(question: str, chunks: List[Dict[str, Any]], top_k: int = 3) -> List[Dict[str, Any]]:
    """
    Retrieves the top_k most relevant document chunks for a query using cosine similarity.
    """
    if not chunks:
        return []

    q_vec = np.array(compute_simple_embedding(question))
    scores = []

    for chunk in chunks:
        c_text = chunk.get("chunk_text") or chunk.get("text") or ""
        # Check direct keyword overlap boost
        q_words = set(re.findall(r'\w+', question.lower())) - {"what", "is", "the", "are", "if", "in", "on", "a", "an", "this", "my"}
        c_words = set(re.findall(r'\w+', c_text.lower()))
        keyword_overlap = len(q_words.intersection(c_words))

        c_vec = chunk.get("embedding")
        if not c_vec or len(c_vec) != len(q_vec):
            c_vec = compute_simple_embedding(c_text)

        c_vec_np = np.array(c_vec)
        cos_sim = float(np.dot(q_vec, c_vec_np))
        total_score = cos_sim + (keyword_overlap * 0.25)
        scores.append((total_score, chunk))

    scores.sort(key=lambda x: x[0], reverse=True)
    return [item[1] for item in scores[:top_k] if item[0] > 0.05]


def answer_question_with_rag(question: str, chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    RAG pipeline:
    1. Search relevant chunks
    2. Build grounded context
    3. Generate response with citations or fallback message if context is insufficient
    """
    relevant_chunks = find_relevant_chunks(question, chunks, top_k=3)

    if not relevant_chunks:
        return {
            "reply": "I could not find sufficient information about this in the uploaded document.",
            "sources": [],
            "disclaimer": "LegalLens AI provides general legal information and document assistance. It does not replace professional legal advice."
        }

    # Build sources metadata
    sources = []
    context_str = ""
    for idx, chunk in enumerate(relevant_chunks):
        page_num = chunk.get("page_number", 1)
        clause_num = chunk.get("clause_number", f"Section P{page_num}")
        snippet = chunk.get("chunk_text") or chunk.get("text") or ""
        sources.append({
            "page_number": page_num,
            "clause_number": clause_num,
            "snippet": snippet[:200] + "..." if len(snippet) > 200 else snippet
        })
        context_str += f"\n--- Source {idx+1} (Page {page_num}, {clause_num}) ---\n{snippet}\n"

    # Call Gemini if API key available, otherwise use local grounded template response
    api_key = settings.LLM_API_KEY
    if api_key and len(api_key.strip()) > 5:
        try:
            import google.genai as genai
            client = genai.Client(api_key=api_key)
            prompt = f"""
You are a legal document assistant answering user questions based STRICTLY on the retrieved context below.

User Question: "{question}"

Retrieved Document Context:
{context_str}

Instructions:
1. Answer the question directly using ONLY information in the context.
2. Explicitly cite the Clause number and Page number in your answer (e.g. "Based on Clause 8 on Page 4...").
3. If the answer cannot be found in the provided context, state EXACTLY: "I could not find sufficient information about this in the uploaded document."
4. Do NOT invent legal rules, facts, or clauses.
5. End with a reminder that this response is informational and not legal advice.
"""
            candidate_models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]
            response = None
            for m in candidate_models:
                try:
                    response = client.models.generate_content(
                        model=m,
                        contents=prompt
                    )
                    if response and response.text:
                        break
                except Exception as m_err:
                    print(f"[RAG] Model {m} failed: {m_err}. Trying fallback...")

            if response and response.text:
                reply_text = response.text.strip()
                return {
                    "reply": reply_text,
                    "sources": sources,
                    "disclaimer": "LegalLens AI provides general legal information and document assistance. It does not replace professional legal advice."
                }
        except Exception as e:
            print(f"[RAG Warning] Gemini API call error: {e}. Using grounded template engine.")

    # Local Grounded Template fallback engine
    primary_source = sources[0]
    page_str = f"Page {primary_source['page_number']}"
    clause_str = primary_source['clause_number']
    snippet_text = primary_source['snippet']

    # Synthesize grounded answer
    q_lower = question.lower()
    if "terminate" in q_lower or "resign" in q_lower or "cancel" in q_lower:
        reply = f"Based on {clause_str} ({page_str}), termination requires formal written notice in accordance with specified timelines. Excerpt: \"{snippet_text[:150]}\""
    elif "pay" in q_lower or "salary" in q_lower or "fee" in q_lower or "cost" in q_lower:
        reply = f"According to {clause_str} ({page_str}), payment terms and compensation are governed by the specified schedules. Excerpt: \"{snippet_text[:150]}\""
    elif "renew" in q_lower or "duration" in q_lower or "term" in q_lower:
        reply = f"As stated in {clause_str} ({page_str}), agreement duration and renewal terms require attention prior to contract expiration dates. Excerpt: \"{snippet_text[:150]}\""
    else:
        reply = f"Based on {clause_str} ({page_str}), the document addresses this topic as follows: \"{snippet_text[:220]}\""

    return {
        "reply": reply,
        "sources": sources,
        "disclaimer": "LegalLens AI provides general legal information and document assistance. It does not replace professional legal advice."
    }
