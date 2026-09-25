from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.all_models import User, Document, DocumentChunk, ChatSession, ChatMessage
from app.schemas.schemas import ChatRequest, ChatResponse
from app.api.auth import get_current_user
from app.services.rag_service import answer_question_with_rag

router = APIRouter(prefix="/chat", tags=["AI Q&A Chat"])

@router.post("", response_model=ChatResponse)
def ask_document_question(
    req: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify document ownership
    doc = db.query(Document).filter(Document.id == req.document_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found or access denied")

    # Get or create chat session
    session = db.query(ChatSession).filter(
        ChatSession.user_id == current_user.id,
        ChatSession.document_id == doc.id
    ).first()

    if not session:
        session = ChatSession(user_id=current_user.id, document_id=doc.id)
        db.add(session)
        db.commit()
        db.refresh(session)

    # Save user message
    user_msg = ChatMessage(session_id=session.id, role="user", message=req.message)
    db.add(user_msg)
    db.commit()

    # Load chunks for document
    chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).all()
    chunk_dicts = [
        {
            "chunk_text": c.chunk_text,
            "page_number": c.page_number,
            "clause_number": c.clause_number,
            "embedding": c.embedding
        }
        for c in chunks
    ]

    # Run RAG answer generation
    rag_result = answer_question_with_rag(req.message, chunk_dicts)

    # Save assistant message
    asst_msg = ChatMessage(
        session_id=session.id,
        role="assistant",
        message=rag_result["reply"],
        sources=rag_result["sources"]
    )
    db.add(asst_msg)
    db.commit()

    return ChatResponse(
        reply=rag_result["reply"],
        sources=rag_result["sources"],
        disclaimer=rag_result.get("disclaimer", "LegalLens AI provides informational document assistance, not professional legal advice.")
    )
