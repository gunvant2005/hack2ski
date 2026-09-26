import re
import uuid
from pydantic import BaseModel, EmailStr, field_validator, model_validator, StringConstraints
from pydantic import ConfigDict
from typing import List, Optional, Any, Dict, Annotated
from datetime import datetime

MAX_NAME_LENGTH = 100
MAX_EMAIL_LENGTH = 255
MAX_MESSAGE_LENGTH = 4000
MAX_DOC_ID_LENGTH = 64


def _validate_non_empty_stripped(value: str, field_name: str) -> str:
    if not value:
        raise ValueError(f"{field_name} must not be empty")
    stripped = value.strip()
    if not stripped:
        raise ValueError(f"{field_name} must not be blank")
    if len(stripped) > 10000:
        raise ValueError(f"{field_name} exceeds maximum length")
    return stripped


def _validate_no_control_chars(value: str, field_name: str) -> str:
    if not value:
        return value
    if re.search(r"[\x00-\x08\x0b-\x1f\x7f]", value):
        raise ValueError(f"{field_name} contains invalid control characters")
    return value


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = _validate_non_empty_stripped(v, "Name")
        v = _validate_no_control_chars(v, "Name")
        if len(v) > MAX_NAME_LENGTH:
            raise ValueError(f"Name must be at most {MAX_NAME_LENGTH} characters")
        if re.search(r"[<>]", v):
            raise ValueError("Name contains invalid characters")
        return v

    @field_validator("email")
    @classmethod
    def email_normalize(cls, v: str) -> str:
        if not v:
            raise ValueError("Email is required")
        normalized = str(v).strip().lower()
        if len(normalized) > MAX_EMAIL_LENGTH:
            raise ValueError(f"Email must be at most {MAX_EMAIL_LENGTH} characters")
        return normalized

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if not v:
            raise ValueError("Password is required")
        from app.core.security import validate_password_strength
        valid, errors = validate_password_strength(v)
        if not valid:
            raise ValueError("; ".join(errors))
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str

    @field_validator("email")
    @classmethod
    def email_normalize(cls, v: str) -> str:
        return str(v).strip().lower()

    @field_validator("password")
    @classmethod
    def password_not_empty(cls, v: str) -> str:
        if not v or not str(v).strip():
            raise ValueError("Password must not be empty")
        return v


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    email: str
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    filename: str
    document_type: str
    status: str
    created_at: datetime
    risk_level: Optional[str] = "Low"


class SummaryDetail(BaseModel):
    plain_language_summary: str
    purpose: str
    parties: str
    duration: str
    payment_terms: str
    termination_conditions: str
    important_responsibilities: List[str]


class KeyClauseItem(BaseModel):
    title: str
    clause_number: str
    category: str
    explanation: str
    page_number: int
    importance: str
    source_text: str


class RiskItem(BaseModel):
    title: str
    severity: str
    explanation: str
    clause_number: str
    page_number: int
    why_attention: str
    suggested_lawyer_question: str


class ChecklistItem(BaseModel):
    id: str
    task: str
    completed: bool = False
    category: str


class AnalysisResultOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    document_id: str
    summary: Any
    risk_level: str
    risks: List[Any]
    obligations: List[str]
    key_clauses: List[Any]
    checklist: List[Any]
    lawyer_questions: List[str]
    created_at: datetime


class SourceCitation(BaseModel):
    clause_number: Optional[str] = None
    page_number: Optional[int] = 1
    snippet: Optional[str] = ""
    text: Optional[str] = None


class ChatRequest(BaseModel):
    document_id: str
    message: str

    @model_validator(mode="before")
    @classmethod
    def resolve_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "message" not in data or not data["message"]:
                for alt in ["question", "query", "prompt", "text"]:
                    if data.get(alt):
                        data["message"] = data[alt]
                        break
        return data

    @field_validator("document_id")
    @classmethod
    def validate_document_id(cls, v: str) -> str:
        v = str(v or "").strip()
        if not v:
            raise ValueError("document_id is required")
        if len(v) > MAX_DOC_ID_LENGTH:
            raise ValueError("document_id is too long")
        if not re.match(r"^[A-Za-z0-9\-_]+$", v):
            raise ValueError("document_id contains invalid characters")
        return v

    @field_validator("message")
    @classmethod
    def message_not_empty(cls, v: str) -> str:
        v = _validate_non_empty_stripped(v, "Message")
        v = _validate_no_control_chars(v, "Message")
        if len(v) > MAX_MESSAGE_LENGTH:
            raise ValueError(f"Message must be at most {MAX_MESSAGE_LENGTH} characters")
        from app.core.safety import sanitize_user_message, check_prompt_injection
        sanitized = sanitize_user_message(v)
        detected, flags = check_prompt_injection(sanitized)
        if detected:
            raise ValueError(f"Message contains disallowed patterns: {', '.join(flags[:2])}")
        return sanitized


class ChatMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    role: str
    message: str
    sources: Optional[List[SourceCitation]] = []
    created_at: datetime


class ChatResponse(BaseModel):
    reply: str
    answer: Optional[str] = None
    sources: List[SourceCitation]
    disclaimer: str = (
        "LegalLens AI provides general legal information and document assistance. "
        "It does not replace professional legal advice from a qualified attorney."
    )

    @model_validator(mode="after")
    def sync_answer(self):
        if not self.answer:
            self.answer = self.reply
        return self


class ClauseDiffItem(BaseModel):
    clause_title: str
    status: str
    importance: str
    doc_a_text: Optional[str] = None
    doc_b_text: Optional[str] = None
    explanation: str


class ComparisonResponse(BaseModel):
    doc_a_filename: str
    doc_b_filename: str
    doc_a_name: Optional[str] = None
    doc_b_name: Optional[str] = None
    total_changes: int
    high_importance_changes: int
    added_count: int
    removed_count: int
    modified_count: int
    inconsistent_count: int = 0
    similarity_score: float = 0.0
    overview: Optional[str] = None
    disclaimer: str = (
        "LegalLens AI provides general legal information and document assistance. "
        "It does not replace professional legal advice from a qualified attorney."
    )
    changes: List[ClauseDiffItem]

    @model_validator(mode="after")
    def sync_names(self):
        if not self.doc_a_name:
            self.doc_a_name = self.doc_a_filename
        if not self.doc_b_name:
            self.doc_b_name = self.doc_b_filename
        return self


class ComparisonRequest(BaseModel):
    doc_a_id: Optional[str] = None
    doc_b_id: Optional[str] = None

    @field_validator("doc_a_id", "doc_b_id")
    @classmethod
    def validate_doc_id(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = str(v).strip()
        if not v:
            return None
        if len(v) > MAX_DOC_ID_LENGTH:
            raise ValueError("Document ID is too long")
        if not re.match(r"^[A-Za-z0-9\-_]+$", v):
            raise ValueError("Document ID contains invalid characters")
        return v

