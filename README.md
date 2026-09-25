# LegalLens AI — Full-Stack GenAI Legal Assistance Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https.mit-license.org)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js-000000.svg)](https://nextjs.org/)

**LegalLens AI** is a production-quality GenAI legal document intelligence platform designed to make legal documents plain-English understandable, navigate contract obligations, highlight potential attention areas/risks, perform grounded RAG Q&A with exact page/clause citations, compare agreement revisions side-by-side, generate actionable checklists, and prepare structured questions for legal professionals.

---

## 1. Features & Capabilities

- **Plain-Language Summarization**: Converts dense legal text into understandable summaries highlighting purpose, parties, duration, payment, and termination.
- **Categorized Clause Extraction**: Automatically categorizes clauses into Payment, Termination, Confidentiality, Liability, IP, Renewal, and Dispute Resolution.
- **AI Attention Radar Dashboard**: Evaluates attention levels (High, Medium, Low) and highlights unusual clauses (e.g. automatic renewal deadlines, non-competes, broad indemnification).
- **Grounded RAG Document Q&A**: Interactive chat assistant grounded strictly in the document with page numbers and clause citations.
- **Side-by-Side Document Comparison**: Uploads Document A & Document B to highlight added (green), removed (red), and modified (yellow) clauses with plain-English change explanations.
- **Before You Sign Checklist**: Generates an interactive, toggleable verification checklist with a progress bar.
- **Lawyer Question Preparation**: Curates tailored questions for legal consultation with copy to clipboard functionality.

---

## 2. Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Lucide React Icons, Recharts.
- **Backend**: Python 3.10+, FastAPI, Pydantic, SQLAlchemy, PyMuPDF (`fitz`), `python-docx`, Passlib (bcrypt), PyJWT.
- **AI & RAG Architecture**: AI Provider Abstraction Layer supporting Google Gemini API with smart local heuristic NLP fallback engine for zero-failure presentation reliability.
- **Database**: PostgreSQL with `pgvector` extension (with automatic SQLite fallback for zero-setup execution).

---

## 3. Project Architecture

```text
c:\Users\dhake\OneDrive\Apps\Desktop\hack2skill/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI Routers (auth, documents, chat, compare, demo)
│   │   ├── core/         # Config & Security JWT helpers
│   │   ├── database/     # SQLAlchemy Session
│   │   ├── models/       # Database ORM Models
│   │   ├── schemas/      # Pydantic Request/Response Models
│   │   ├── services/     # PyMuPDF parser, AI Abstraction, RAG Engine, Comparison Engine
│   │   └── main.py       # FastAPI Entrypoint
│   └── requirements.txt
├── frontend/
│   ├── app/              # Next.js Pages (Landing, Auth, Dashboard, Document Analysis, Compare)
│   ├── components/       # Navbar & Footer with legal disclaimers
│   ├── lib/              # Central Axios API client
│   └── package.json
├── database/
│   └── schema.sql        # PostgreSQL + pgvector schema
├── .env.example
├── docker-compose.yml
└── README.md
```

---

## 4. Quick Start & Installation

### Option A: 1-Click Launch (Windows - Recommended)
Simply double-click:
```cmd
start-app.bat
```
This automatically boots both the FastAPI backend (`http://localhost:8000`) and the Next.js frontend (`http://localhost:3000`).

---

### Option B: From Workspace Root
You can run directly from the workspace root (`c:\Users\dhake\OneDrive\Apps\Desktop\hack2skill`):

```bash
# Start frontend from root:
npm run dev

# Or install all frontend dependencies from root:
npm run install:all
```

---

### Option C: Manual Multi-Terminal Setup

#### 1. Backend Setup
```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```
FastAPI interactive Swagger documentation is available at `http://localhost:8000/docs`.

#### 2. Frontend Setup
```bash
cd frontend

# Install Node dependencies
npm install

# Start Next.js development server
npm run dev
```

Open `http://localhost:3000` in your web browser.

---

## 5. Troubleshooting: "npm file missing / ENOENT" Error

If you encountered:
```text
npm error code ENOENT
npm error syscall open
npm error path ...\package.json
npm error enoent Could not read package.json: Error: ENOENT: no such file or directory
```

### Why this happens:
This occurs when `npm` is executed in a terminal whose current working directory does not contain a `package.json` (for example, running `npm run dev` while inside `backend/` or when the terminal opened in a parent folder).

### How to resolve:
1. **From Project Root:** We have configured a root `package.json`. Make sure your terminal prompt says `...\hack2skill>`, then run:
   ```bash
   npm run dev
   ```
2. **From Frontend Folder:** If navigating manually, switch into the `frontend` directory first:
   ```bash
   cd frontend
   npm run dev
   ```
3. **If Port 3000 is Already in Use:** If a dev server is already running, Next.js will automatically offer `http://localhost:3001` or `3002`. You can also close running node processes or restart `start-app.bat`.

---

## 6. RAG Retrieval Pipeline Explanation

1. **Document Upload**: PDF or DOCX file is uploaded to FastAPI endpoint.
2. **Text Extraction & Cleaning**: PyMuPDF extracts text page-by-page.
3. **Semantic Chunking**: Paragraphs are chunked into ~400-character blocks with page numbers and clause headers.
4. **Vector Embedding**: Embeddings are generated and stored in PostgreSQL (`pgvector`) or SQLite.
5. **Similarity Search**: User questions are converted to embeddings; top relevant chunks are retrieved via Cosine Similarity.
6. **Grounded Generation**: Retrieved chunks are passed to the Gemini LLM with strict instructions to cite clause & page numbers. If no relevant info exists, it states: *"I could not find sufficient information about this in the uploaded document."*

---

## 7. Important Legal Disclaimer

> **LegalLens AI provides general legal information and document assistance. It does not replace professional legal advice from a qualified attorney.** Always consult a licensed lawyer for contract execution, litigation, or formal legal advice.
