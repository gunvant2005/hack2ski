import os
import logging
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.all_models import User, Document
from app.schemas.schemas import ComparisonResponse
from app.api.auth import get_current_user
from app.core.config import settings
from app.services.document_processor import extract_text_from_file
from app.services.comparison_service import compare_legal_documents

logger = logging.getLogger("legallens.compare")

router = APIRouter(prefix="/compare", tags=["Document Comparison"])


def _sanitize_filename(filename: str) -> str:
    return os.path.basename(filename or "upload").replace("\0", "").strip() or "upload"


@router.post("", response_model=ComparisonResponse)
async def compare_documents_endpoint(
    doc_a: UploadFile = File(None),
    doc_b: UploadFile = File(None),
    doc_a_id: str = Form(None),
    doc_b_id: str = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    text_a = ""
    text_b = ""
    name_a = "Document Version A"
    name_b = "Document Version B"

    # ---- Document A ----
    if doc_a_id:
        d = db.query(Document).filter(
            Document.id == doc_a_id, Document.user_id == current_user.id
        ).first()
        if not d:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document A not found")
        name_a = d.filename
        pages = extract_text_from_file(d.file_path)
        text_a = "\n\n".join(p["text"] for p in pages)
    elif doc_a and doc_a.filename:
        clean_name = _sanitize_filename(doc_a.filename)
        save_path = os.path.join(settings.UPLOAD_DIR, f"cmp_a_{current_user.id}_{clean_name}")
        try:
            content = await doc_a.read()
            with open(save_path, "wb") as f:
                f.write(content)
            name_a = clean_name
            pages = extract_text_from_file(save_path)
            text_a = "\n\n".join(p["text"] for p in pages)
        except Exception as e:
            logger.error(f"Failed to process doc_a upload: {e}")
            raise HTTPException(status_code=500, detail="Failed to process Document A.")
        finally:
            # Clean up temp file
            if os.path.isfile(save_path):
                try:
                    os.remove(save_path)
                except OSError:
                    pass
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide Document A either by selecting an existing document or uploading a file.",
        )

    # ---- Document B ----
    if doc_b_id:
        d = db.query(Document).filter(
            Document.id == doc_b_id, Document.user_id == current_user.id
        ).first()
        if not d:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document B not found")
        name_b = d.filename
        pages = extract_text_from_file(d.file_path)
        text_b = "\n\n".join(p["text"] for p in pages)
    elif doc_b and doc_b.filename:
        clean_name = _sanitize_filename(doc_b.filename)
        save_path = os.path.join(settings.UPLOAD_DIR, f"cmp_b_{current_user.id}_{clean_name}")
        try:
            content = await doc_b.read()
            with open(save_path, "wb") as f:
                f.write(content)
            name_b = clean_name
            pages = extract_text_from_file(save_path)
            text_b = "\n\n".join(p["text"] for p in pages)
        except Exception as e:
            logger.error(f"Failed to process doc_b upload: {e}")
            raise HTTPException(status_code=500, detail="Failed to process Document B.")
        finally:
            if os.path.isfile(save_path):
                try:
                    os.remove(save_path)
                except OSError:
                    pass
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide Document B either by selecting an existing document or uploading a file.",
        )

    if not text_a.strip() or not text_b.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="One or both documents appear to be empty or could not be parsed.",
        )

    result = compare_legal_documents(name_a, text_a, name_b, text_b)
    logger.info(f"Comparison: '{name_a}' vs '{name_b}' → {result['total_changes']} changes found.")
    return result
