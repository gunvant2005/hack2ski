from pydantic import BaseModel, EmailStr, field_validator, model_validator
from pydantic import ConfigDict
from typing import List, Optional, Any, Dict
from datetime import datetime


# ---------------------------------------------------------------------------
# Auth Schemas
# ---------------------------------------------------------------------------
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name must not be blank")
        return v.strip()

    @field_validator("email")
    @classmethod
    def email_normalize(cls, v: str) -> str:
        return str(v).strip().lower()

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str

    @field_validator("email")
    @classmethod
    def email_normalize(cls, v: str) -> str:
        return str(v).strip().lower()


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


# ---------------------------------------------------------------------------
# Document Schemas
# ---------------------------------------------------------------------------
class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    filename: str
    document_type: str
    status: str
    created_at: datetime
    risk_level: Optional[str] = "Low"


# ---------------------------------------------------------------------------
# Analysis Schemas
# ---------------------------------------------------------------------------
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
    category: str  # Payment, Termination, Liability, Confidentiality, IP, Renewal, Dispute Resolution, Other
    explanation: str
    page_number: int
    importance: str  # High, Medium, Low
    source_text: str


class RiskItem(BaseModel):
    title: str
    severity: str  # High, Medium, Low
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
    summary: Any  # SummaryDetail or raw dict from JSON column
    risk_level: str
    risks: List[Any]
    obligations: List[str]
    key_clauses: List[Any]
    checklist: List[Any]
    lawyer_questions: List[str]
    created_at: datetime


# ---------------------------------------------------------------------------
# Chat & RAG Schemas
# ---------------------------------------------------------------------------
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

    @field_validator("message")
    @classmethod
    def message_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Message must not be blank")
        return v.strip()


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


# ---------------------------------------------------------------------------
# Document Comparison Schemas
# ---------------------------------------------------------------------------
class ClauseDiffItem(BaseModel):
    clause_title: str
    status: str  # Added, Removed, Modified
    importance: str  # High, Medium, Low
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
    changes: List[ClauseDiffItem]

    @model_validator(mode="after")
    def sync_names(self):
        if not self.doc_a_name:
            self.doc_a_name = self.doc_a_filename
        if not self.doc_b_name:
            self.doc_b_name = self.doc_b_filename
        return self
