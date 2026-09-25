import os
import logging
import shutil
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.all_models import User, Document, DocumentChunk, AnalysisResult
from app.schemas.schemas import DocumentOut, AnalysisResultOut
from app.api.auth import get_current_user
from app.core.config import settings
from app.services.document_processor import extract_text_from_file, chunk_document_pages
from app.services.ai_service import analyze_document_content
from app.services.rag_service import compute_simple_embedding

logger = logging.getLogger("legallens.documents")

router = APIRouter(prefix="/documents", tags=["Documents"])


# ---------------------------------------------------------------------------
# Helper: build DocumentOut dict from ORM model
# ---------------------------------------------------------------------------
def _doc_to_dict(doc: Document) -> dict:
    risk_lvl = doc.analysis.risk_level if doc.analysis else "Low"
    return {
        "id": doc.id,
        "user_id": doc.user_id,
        "filename": doc.filename,
        "document_type": doc.document_type,
        "status": doc.status,
        "created_at": doc.created_at,
        "risk_level": risk_lvl,
    }


# ---------------------------------------------------------------------------
# List all documents for the authenticated user
# ---------------------------------------------------------------------------
@router.get("", response_model=List[DocumentOut])
def get_user_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    docs = (
        db.query(Document)
        .filter(Document.user_id == current_user.id)
        .order_by(Document.created_at.desc())
        .all()
    )
    return [_doc_to_dict(d) for d in docs]


# ---------------------------------------------------------------------------
# Upload & auto-analyse a new document
# ---------------------------------------------------------------------------
@router.post("/upload", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # --- Filename sanitisation & path-traversal prevention ---
    raw_filename = file.filename or "uploaded_document.pdf"
    clean_filename = os.path.basename(raw_filename).replace("\0", "").strip()
    if not clean_filename:
        clean_filename = "document.pdf"

    ext = os.path.splitext(clean_filename)[1].lower()
    if ext not in {".pdf", ".docx", ".doc"}:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Invalid file type. Only PDF and DOCX files are supported.",
        )

    # --- Read & size-check before persisting ---
    contents = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(contents) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds the maximum upload limit of {settings.MAX_UPLOAD_SIZE_MB} MB.",
        )

    # --- Save to isolated user upload directory ---
    save_path = os.path.join(settings.UPLOAD_DIR, f"{current_user.id}_{clean_filename}")
    try:
        with open(save_path, "wb") as buf:
            buf.write(contents)
    except OSError as e:
        logger.error(f"Failed to write upload file: {e}")
        raise HTTPException(status_code=500, detail="Failed to save uploaded file.")

    doc_type = "PDF" if ext == ".pdf" else "DOCX"

    # --- Create DB record ---
    new_doc = Document(
        user_id=current_user.id,
        filename=clean_filename,
        document_type=doc_type,
        file_path=save_path,
        status="Processing",
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    # --- Process & analyse ---
    analysis_res = None
    try:
        pages_data = extract_text_from_file(save_path)
        chunks = chunk_document_pages(pages_data)
        full_text = "\n\n".join(c["text"] for c in chunks)

        # Bulk-insert chunks
        db_chunks = []
        for c in chunks:
            emb = compute_simple_embedding(c["text"])
            db_chunks.append(
                DocumentChunk(
                    document_id=new_doc.id,
                    chunk_text=c["text"],
                    page_number=c["page_number"],
                    clause_number=c.get("clause_number"),
                    embedding=emb,
                )
            )
        db.add_all(db_chunks)

        # Run AI analysis
        analysis_data = analyze_document_content(clean_filename, full_text, chunks)
        analysis_res = AnalysisResult(
            document_id=new_doc.id,
            summary=analysis_data["summary"],
            risk_level=analysis_data.get("risk_level", "Low"),
            risks=analysis_data.get("risks", []),
            obligations=analysis_data.get("obligations", []),
            key_clauses=analysis_data.get("key_clauses", []),
            checklist=analysis_data.get("checklist", []),
            lawyer_questions=analysis_data.get("lawyer_questions", []),
        )
        db.add(analysis_res)
        new_doc.status = "Analyzed"
        db.commit()
        logger.info(f"Document {new_doc.id} ({clean_filename}) analysed successfully.")
    except Exception as e:
        logger.error(f"Analysis failed for document {new_doc.id}: {e}", exc_info=True)
        new_doc.status = "Error"
        db.commit()

    return _doc_to_dict(new_doc)


# ---------------------------------------------------------------------------
# Get document metadata
# ---------------------------------------------------------------------------
@router.get("/{document_id}", response_model=DocumentOut)
def get_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    doc = db.query(Document).filter(
        Document.id == document_id, Document.user_id == current_user.id
    ).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return _doc_to_dict(doc)


# ---------------------------------------------------------------------------
# Get real document content (chunks) for the viewer
# ---------------------------------------------------------------------------
@router.get("/{document_id}/content")
def get_document_content(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    doc = db.query(Document).filter(
        Document.id == document_id, Document.user_id == current_user.id
    ).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    chunks = (
        db.query(DocumentChunk)
        .filter(DocumentChunk.document_id == doc.id)
        .order_by(DocumentChunk.page_number.asc())
        .all()
    )
    max_page = max((c.page_number for c in chunks), default=1)

    return {
        "id": doc.id,
        "filename": doc.filename,
        "document_type": doc.document_type,
        "total_pages": max_page,
        "chunks": [
            {
                "id": c.id,
                "page_number": c.page_number,
                "clause_number": c.clause_number,
                "chunk_text": c.chunk_text,
            }
            for c in chunks
        ],
    }


# ---------------------------------------------------------------------------
# Re-analyse an existing document (or return cached result)
# ---------------------------------------------------------------------------
@router.post("/{document_id}/analyze", response_model=AnalysisResultOut)
def analyze_document_endpoint(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    doc = db.query(Document).filter(
        Document.id == document_id, Document.user_id == current_user.id
    ).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    # Return cached analysis if already complete
    if doc.analysis:
        return doc.analysis

    pages_data = extract_text_from_file(doc.file_path)
    chunks = chunk_document_pages(pages_data)
    full_text = "\n\n".join(c["text"] for c in chunks)

    analysis_data = analyze_document_content(doc.filename, full_text, chunks)

    analysis_res = AnalysisResult(
        document_id=doc.id,
        summary=analysis_data["summary"],
        risk_level=analysis_data.get("risk_level", "Low"),
        risks=analysis_data.get("risks", []),
        obligations=analysis_data.get("obligations", []),
        key_clauses=analysis_data.get("key_clauses", []),
        checklist=analysis_data.get("checklist", []),
        lawyer_questions=analysis_data.get("lawyer_questions", []),
    )
    db.add(analysis_res)
    doc.status = "Analyzed"
    db.commit()
    db.refresh(analysis_res)
    return analysis_res


# ---------------------------------------------------------------------------
# Convenience sub-resource endpoints
# ---------------------------------------------------------------------------
def _require_analysis(document_id: str, user: User, db: Session):
    doc = db.query(Document).filter(
        Document.id == document_id, Document.user_id == user.id
    ).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    if not doc.analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not yet available. Please wait for processing to complete.",
        )
    return doc


@router.get("/{document_id}/summary")
def get_document_summary(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    doc = _require_analysis(document_id, current_user, db)
    return doc.analysis.summary


@router.get("/{document_id}/clauses")
def get_document_clauses(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    doc = _require_analysis(document_id, current_user, db)
    return doc.analysis.key_clauses


@router.get("/{document_id}/risks")
def get_document_risks(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    doc = _require_analysis(document_id, current_user, db)
    return {"risk_level": doc.analysis.risk_level, "risks": doc.analysis.risks}


@router.get("/{document_id}/checklist")
def get_document_checklist(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    doc = _require_analysis(document_id, current_user, db)
    return doc.analysis.checklist


@router.get("/{document_id}/lawyer-questions")
def get_lawyer_questions(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    doc = _require_analysis(document_id, current_user, db)
    return doc.analysis.lawyer_questions


# ---------------------------------------------------------------------------
# Delete document and all associated data
# ---------------------------------------------------------------------------
@router.delete("/{document_id}", status_code=status.HTTP_200_OK)
def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    doc = db.query(Document).filter(
        Document.id == document_id, Document.user_id == current_user.id
    ).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    # Remove file from disk
    if doc.file_path and os.path.isfile(doc.file_path):
        try:
            os.remove(doc.file_path)
        except OSError as e:
            logger.warning(f"Could not remove file {doc.file_path}: {e}")

    db.delete(doc)
    db.commit()
    logger.info(f"Document {document_id} deleted by user {current_user.id}.")
    return {"message": "Document deleted successfully", "id": document_id}
