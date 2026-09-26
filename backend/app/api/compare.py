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
    if doc_a_id and doc_b_id and doc_a_id.strip() == doc_b_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document A and Document B cannot be the identical document record. Please select two different documents to compare.",
        )

    try:
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    except Exception:
        pass

    allowed_exts = {".pdf", ".docx", ".doc", ".txt"}
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    text_a = ""
    text_b = ""
    name_a = "Document Version A"
    name_b = "Document Version B"

    save_path_a = None
    save_path_b = None

    # ---- Document A ----
    if doc_a_id and doc_a_id.strip():
        d = db.query(Document).filter(
            Document.id == doc_a_id.strip(), Document.user_id == current_user.id
        ).first()
        if not d:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document A not found or access denied")
        name_a = d.filename
        if d.chunks and len(d.chunks) > 0:
            text_a = "\n\n".join(c.chunk_text for c in d.chunks)
        elif d.file_path and os.path.isfile(d.file_path):
            pages = extract_text_from_file(d.file_path)
            text_a = "\n\n".join(p["text"] for p in pages)
        else:
            text_a = ""
    elif doc_a and doc_a.filename:
        clean_name = _sanitize_filename(doc_a.filename)
        ext_a = os.path.splitext(clean_name)[1].lower()
        if ext_a not in allowed_exts:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Unsupported format for Document A ({ext_a}). Only PDF, DOCX, and TXT files are supported.",
            )
        save_path_a = os.path.join(settings.UPLOAD_DIR, f"cmp_a_{current_user.id}_{clean_name}")
        try:
            content = await doc_a.read()
            if len(content) > max_bytes:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"Document A exceeds maximum upload limit of {settings.MAX_UPLOAD_SIZE_MB} MB.",
                )
            with open(save_path_a, "wb") as f:
                f.write(content)
            name_a = clean_name
            pages = extract_text_from_file(save_path_a)
            text_a = "\n\n".join(p["text"] for p in pages)
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to process doc_a upload: {e}")
            raise HTTPException(status_code=500, detail="Failed to process Document A.")
        finally:
            if save_path_a and os.path.isfile(save_path_a):
                try:
                    os.remove(save_path_a)
                except OSError:
                    pass
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide Document A either by selecting an existing document or uploading a file.",
        )

    # ---- Document B ----
    if doc_b_id and doc_b_id.strip():
        d = db.query(Document).filter(
            Document.id == doc_b_id.strip(), Document.user_id == current_user.id
        ).first()
        if not d:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document B not found or access denied")
        name_b = d.filename
        if d.chunks and len(d.chunks) > 0:
            text_b = "\n\n".join(c.chunk_text for c in d.chunks)
        elif d.file_path and os.path.isfile(d.file_path):
            pages = extract_text_from_file(d.file_path)
            text_b = "\n\n".join(p["text"] for p in pages)
        else:
            text_b = ""
    elif doc_b and doc_b.filename:
        clean_name = _sanitize_filename(doc_b.filename)
        ext_b = os.path.splitext(clean_name)[1].lower()
        if ext_b not in allowed_exts:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Unsupported format for Document B ({ext_b}). Only PDF, DOCX, and TXT files are supported.",
            )
        save_path_b = os.path.join(settings.UPLOAD_DIR, f"cmp_b_{current_user.id}_{clean_name}")
        try:
            content = await doc_b.read()
            if len(content) > max_bytes:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"Document B exceeds maximum upload limit of {settings.MAX_UPLOAD_SIZE_MB} MB.",
                )
            with open(save_path_b, "wb") as f:
                f.write(content)
            name_b = clean_name
            pages = extract_text_from_file(save_path_b)
            text_b = "\n\n".join(p["text"] for p in pages)
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to process doc_b upload: {e}")
            raise HTTPException(status_code=500, detail="Failed to process Document B.")
        finally:
            if save_path_b and os.path.isfile(save_path_b):
                try:
                    os.remove(save_path_b)
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
