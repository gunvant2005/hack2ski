import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, JSON, Boolean
from sqlalchemy.orm import relationship
from app.database.session import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


def _now_utc() -> datetime:
    """Timezone-aware UTC datetime — compatible with Python 3.12+ deprecation of utcnow()."""
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=_now_utc)

    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")


class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    document_type = Column(String(50), nullable=False, default="PDF")
    file_path = Column(String(500), nullable=False)
    status = Column(String(50), nullable=False, default="Uploaded")  # Uploaded | Processing | Analyzed | Error
    created_at = Column(DateTime(timezone=True), default=_now_utc, index=True)

    user = relationship("User", back_populates="documents")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")
    analysis = relationship("AnalysisResult", back_populates="document", uselist=False, cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="document", cascade="all, delete-orphan")


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(String, primary_key=True, default=generate_uuid)
    document_id = Column(String, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_text = Column(Text, nullable=False)
    page_number = Column(Integer, nullable=False, default=1, index=True)
    clause_number = Column(String(100), nullable=True)
    embedding = Column(JSON, nullable=True)  # List[float] stored as JSON for cross-DB portability

    document = relationship("Document", back_populates="chunks")


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(String, primary_key=True, default=generate_uuid)
    document_id = Column(String, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    summary = Column(JSON, nullable=False)  # SummaryDetail dict
    risk_level = Column(String(20), nullable=False, default="Low")  # Low | Medium | High
    risks = Column(JSON, nullable=False, default=list)
    obligations = Column(JSON, nullable=False, default=list)
    key_clauses = Column(JSON, nullable=False, default=list)
    checklist = Column(JSON, nullable=False, default=list)
    lawyer_questions = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime(timezone=True), default=_now_utc)

    document = relationship("Document", back_populates="analysis")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    document_id = Column(String, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=_now_utc)

    user = relationship("User", back_populates="chat_sessions")
    document = relationship("Document", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan", order_by="ChatMessage.created_at")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, default=generate_uuid)
    session_id = Column(String, ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # user | assistant
    message = Column(Text, nullable=False)
    sources = Column(JSON, nullable=True, default=list)  # List[SourceCitation]
    created_at = Column(DateTime(timezone=True), default=_now_utc)

    session = relationship("ChatSession", back_populates="messages")
