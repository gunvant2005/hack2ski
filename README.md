# LegalLens AI — Full-Stack GenAI Legal Document Intelligence Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https.mit-license.org)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js-000000.svg)](https://nextjs.org/)
[![Google Gemini](https://img.shields.io/badge/AI-Google%20Gemini-4285F4.svg)](https://ai.google.dev/)

---

## Problem Statement

**80% of individuals and small businesses sign legal contracts without fully understanding their rights, obligations, or hidden risks.** Dense legal language, buried renewal clauses, broad indemnification terms, and non-compete restrictions routinely catch signers off-guard. Traditional legal review is expensive ($200–$500/hour), slow (days/weeks), and inaccessible to most people.

### The Challenge

- Complex legal jargon prevents understanding of critical contract terms
- Hidden auto-renewal, liability, and non-compete clauses go unnoticed until it's too late
- No affordable way to compare contract revisions for meaningful changes
- Lack of structured preparation before lawyer consultations wastes expensive billable hours
- No existing tool provides grounded, citation-backed Q&A strictly tied to document content

---

## Our Solution: LegalLens AI

**LegalLens AI** is a production-quality, full-stack **Generative AI** legal document intelligence platform powered by **Google Gemini** that makes legal documents plain-English understandable. It provides:

1. **Plain-Language Summarization** — Converts dense legal text into clear, structured summaries highlighting purpose, parties, duration, payment terms, and termination conditions.
2. **Categorized Clause Extraction** — Automatically categorizes clauses into Payment, Termination, Confidentiality, Liability, IP, Renewal, and Dispute Resolution.
3. **AI Attention Radar Dashboard** — Evaluates attention levels (High, Medium, Low) and highlights unusual clauses (e.g., automatic renewal deadlines, non-competes, broad indemnification).
4. **Grounded RAG Document Q&A** — Interactive chat assistant grounded strictly in the document with page numbers and clause citations. Never hallucinated.
5. **Side-by-Side Document Comparison** — Upload Document A & Document B to highlight added (green), removed (red), and modified (yellow) clauses with plain-English change explanations.
6. **Before You Sign Checklist** — Generates an interactive, toggleable verification checklist with a progress bar.
7. **Lawyer Question Preparation** — Curates tailored questions for legal consultation with copy-to-clipboard functionality.

---

## 🌐 Live Production Deployments (Vercel)

| Service | Live Production URL | Status |
| :--- | :--- | :--- |
| **Frontend Web App** | [https://frontend-ten-rouge-36.vercel.app](https://frontend-ten-rouge-36.vercel.app) | `Active` |
| **Backend API Service** | [https://backend-mauve-nu-93.vercel.app](https://backend-mauve-nu-93.vercel.app) | `Active` |
| **Interactive API Docs** | [https://backend-mauve-nu-93.vercel.app/docs](https://backend-mauve-nu-93.vercel.app/docs) | `Active` |

---

## GenAI Services Utilized

### Google Gemini (Primary AI Engine)

LegalLens AI uses **Google Gemini** as its primary Generative AI engine across all core features:

| Feature | GenAI Usage | Model |
| :--- | :--- | :--- |
| **Document Analysis** | Structured JSON output with summaries, risks, clauses, checklist, lawyer questions | `gemini-2.0-flash` |
| **RAG Q&A Chat** | Grounded question answering with document citations | `gemini-2.0-flash` |
| **Document Comparison** | Clause-level structural diff with plain-English explanations | `gemini-2.0-flash` |
| **Fallback Engine** | Multi-model cascade: `gemini-2.0-flash` → `gemini-1.5-flash` → `gemini-1.5-pro` | Cascade |

### RAG (Retrieval-Augmented Generation) Pipeline

Every answer is grounded in the actual document content — never hallucinated:

1. **Document Upload** → PDF/DOCX text extraction (PyMuPDF / python-docx)
2. **Semantic Chunking** → ~400-character blocks with page numbers and clause headers
3. **Vector Embedding** → TF-IDF vectorization stored in PostgreSQL (pgvector)
4. **Cosine Similarity Retrieval** → Query-to-chunk matching with keyword overlap boosting
5. **Grounded Generation** → Top-K chunks + strict citation prompt → Gemini API → Cited answer

### Prompt Security & Guardrails

- All prompts use `<untrusted_document_context>` boundaries to prevent injection from document content
- Strict output schema validation with JSON sanitization
- Legal disclaimer enforcement on all AI-generated outputs
- Model output parsed and validated before display

### Smart NLP Fallback Engine

A local heuristic NLP engine provides zero-failure reliability:

- **Document Type Classification**: Regex-based detection of Employment, NDA, Rental, Privacy Policy
- **Party Extraction**: Between...and... pattern matching for contracting entities
- **Risk Pattern Matching**: Auto-renewal, non-compete, broad indemnification detection
- **Clause Categorization**: Payment, Termination, Confidentiality, Liability, IP, Dispute Resolution

---

## Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Lucide React Icons
- **Backend**: Python 3.10+, FastAPI, Pydantic, SQLAlchemy, PyMuPDF (`fitz`), `python-docx`, Passlib (bcrypt), PyJWT
- **AI & RAG**: Google Gemini API with multi-model cascade fallback + local NLP heuristic engine
- **Database**: PostgreSQL with `pgvector` extension (with automatic SQLite fallback)
- **Security**: JWT authentication, bcrypt password hashing, rate limiting, CORS, security headers, prompt injection defense
- **Testing**: Pytest with 40+ unit/integration tests covering AI, RAG, comparison, security, and API
- **Deployment**: Vercel (frontend + backend), Docker Compose for local development

---

## Project Architecture

```text
hack2skill/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI Routers (auth, documents, chat, compare)
│   │   ├── core/         # Config & Security JWT helpers
│   │   ├── database/     # SQLAlchemy Session
│   │   ├── models/       # Database ORM Models
│   │   ├── schemas/      # Pydantic Request/Response Models
│   │   ├── services/     # AI Service, RAG Engine, Comparison Engine, Document Processor
│   │   └── main.py       # FastAPI Entrypoint with middleware stack
│   ├── tests/            # Pytest comprehensive test suite (40+ tests)
│   └── requirements.txt
├── frontend/
│   ├── app/              # Next.js Pages (Landing, Auth, Dashboard, Analysis, Compare)
│   ├── components/       # Navbar & Footer
│   ├── lib/              # API client, types, utilities
│   └── package.json
├── database/
│   └── schema.sql        # PostgreSQL + pgvector schema
├── scripts/
│   └── comprehensive_test.py  # End-to-end integration test suite
├── docker-compose.yml
└── README.md
```

---

## Quick Start & Installation

### Option A: 1-Click Launch (Windows)
```cmd
start-app.bat
```
This automatically boots both the FastAPI backend (`http://localhost:8000`) and the Next.js frontend (`http://localhost:3000`).

### Option B: From Workspace Root
```bash
npm run dev          # Start frontend
npm run install:all  # Install all dependencies
```

### Option C: Manual Multi-Terminal Setup

#### 1. Backend Setup
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
FastAPI interactive Swagger documentation: `http://localhost:8000/docs`

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your web browser.

### Option D: Docker Compose
```bash
docker-compose up --build
```

---

## Running Tests

```bash
cd backend
python -m pytest tests/ -v --tb=short
```

The test suite covers:
- **AI Service**: Document type detection, risk flagging, NLP heuristics, schema validation
- **RAG Service**: Embedding computation, chunk retrieval, grounded Q&A
- **Comparison Service**: Clause diffing, change detection, structural output
- **Security**: Prompt injection defense, filename sanitization, file extension whitelist
- **API**: Health endpoints, CORS configuration, middleware stack
- **Schema Integrity**: Frontend-backend interface contract validation

---

## Efficiency Optimizations

- **GZip Compression**: All responses >1KB are compressed via middleware
- **Analysis Caching**: In-memory LRU cache prevents redundant Gemini API calls for the same document
- **Cache-Control Headers**: GET endpoints include appropriate cache directives
- **Lazy Loading**: Frontend uses conditional rendering and dynamic tab switching
- **Bulk Chunk Insertion**: Document chunks are batch-inserted into the database
- **Smart Fallback Cascade**: Gemini model cascade tries faster models first (`flash` before `pro`)

---

## Security Measures

- **JWT Authentication**: Bcrypt password hashing + signed JWT tokens (HS256)
- **Rate Limiting**: Sliding window rate limiter on auth endpoints (30 req/min)
- **Security Headers**: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, HSTS, Referrer-Policy, Permissions-Policy
- **CORS Whitelist**: Explicit origin allowlist + regex matching for Vercel deployments
- **Prompt Injection Defense**: `<untrusted_document_context>` boundaries in all GenAI prompts
- **File Validation**: Extension whitelist, size limits, path traversal prevention, null byte sanitization
- **Global Error Handler**: Never leaks stack traces to clients
- **Input Sanitization**: Pydantic validation on all request schemas

---

## Important Legal Disclaimer

> **LegalLens AI provides general legal information and document assistance. It does not replace professional legal advice from a qualified attorney.** Always consult a licensed lawyer for contract execution, litigation, or formal legal advice.
