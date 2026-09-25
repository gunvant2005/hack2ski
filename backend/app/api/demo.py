from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.all_models import User
from app.api.auth import get_current_user
from app.services.demo_service import seed_demo_data_if_needed
from app.schemas.schemas import DocumentOut

router = APIRouter(prefix="/demo", tags=["Demo Mode"])

@router.post("/load", response_model=DocumentOut)
def load_demo_document(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = seed_demo_data_if_needed(db, current_user.id)
    return {
        "id": doc.id,
        "user_id": doc.user_id,
        "filename": doc.filename,
        "document_type": doc.document_type,
        "status": doc.status,
        "created_at": doc.created_at,
        "risk_level": doc.analysis.risk_level if doc.analysis else "High"
    }
