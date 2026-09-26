import os
import re
from typing import List, Dict, Any

def extract_text_from_file(file_path: str) -> List[Dict[str, Any]]:
    """
    Extracts text per page from PDF or DOCX file.
    Returns a list of dicts: [{'page_number': 1, 'text': '...'}]
    """
    ext = os.path.splitext(file_path)[1].lower()
    pages_data = []

    if ext == ".pdf":
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(file_path)
            for i, page in enumerate(doc):
                text = page.get_text("text").strip()
                if text:
                    pages_data.append({
                        "page_number": i + 1,
                        "text": text
                    })
            doc.close()
        except Exception as e:
            # Secondary fallback: Pure-Python pypdf parser
            try:
                import pypdf
                reader = pypdf.PdfReader(file_path)
                for i, page in enumerate(reader.pages):
                    t = page.extract_text() or ""
                    if t.strip():
                        pages_data.append({
                            "page_number": i + 1,
                            "text": t.strip()
                        })
            except Exception as e2:
                # Both parsers failed; leave pages_data empty so clean 422 is returned
                pass
    elif ext in [".docx", ".doc"]:
        try:
            import docx
            doc = docx.Document(file_path)
            full_text = []
            page_num = 1
            current_page_text = []

            for paragraph in doc.paragraphs:
                p_text = paragraph.text.strip()
                if p_text:
                    current_page_text.append(p_text)
                if len("\n".join(current_page_text).split()) > 350:
                    pages_data.append({
                        "page_number": page_num,
                        "text": "\n".join(current_page_text)
                    })
                    page_num += 1
                    current_page_text = []

            if current_page_text:
                pages_data.append({
                    "page_number": page_num,
                    "text": "\n".join(current_page_text)
                })
        except Exception:
            # Fallback: pure standard library zipfile + XML extraction
            try:
                import zipfile
                import xml.etree.ElementTree as ET
                with zipfile.ZipFile(file_path, "r") as z:
                    xml_bytes = z.read("word/document.xml")
                root = ET.fromstring(xml_bytes)
                ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
                paras = []
                for p in root.iter(f"{{{ns}}}p"):
                    texts = [t.text for t in p.iter(f"{{{ns}}}t") if t.text]
                    if texts:
                        para_str = "".join(texts).strip()
                        if para_str:
                            paras.append(para_str)
                if paras:
                    page_num = 1
                    current_page_text = []
                    for p in paras:
                        current_page_text.append(p)
                        if len("\n".join(current_page_text).split()) > 350:
                            pages_data.append({
                                "page_number": page_num,
                                "text": "\n".join(current_page_text)
                            })
                            page_num += 1
                            current_page_text = []
                    if current_page_text:
                        pages_data.append({
                            "page_number": page_num,
                            "text": "\n".join(current_page_text)
                        })
            except Exception:
                pass
    else:
        # Plain text fallback - ensure we never read binary ZIP or PDF files as raw text
        try:
            with open(file_path, "rb") as f:
                header = f.read(4)
            if not header.startswith(b"PK") and not header.startswith(b"%PDF"):
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    text = f.read()
                    if text.strip():
                        pages_data.append({"page_number": 1, "text": text.strip()})
        except Exception:
            pass

    return pages_data


def chunk_document_pages(pages_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Chunks extracted pages into semantic blocks, preserving page number and detecting clause headers.
    """
    chunks = []
    chunk_id_counter = 1

    clause_regex = re.compile(
        r'^(?:SECTION|CLAUSE|ARTICLE|\d+\.|\d+\)\s+|[A-Z\s]{4,}:)', re.IGNORECASE
    )

    for page_item in pages_data:
        page_num = page_item["page_number"]
        page_text = page_item["text"]

        # Split text by paragraphs or double newlines
        paragraphs = [p.strip() for p in page_text.split("\n\n") if p.strip()]

        current_chunk_paragraphs = []
        current_clause_num = None

        for p in paragraphs:
            # Check if paragraph starts with a clause identifier
            first_line = p.split("\n")[0]
            if clause_regex.search(first_line):
                # Try to extract section identifier like "Clause 4", "Section 2.1", "Article III"
                match = re.search(r'(Section\s+\d+|Clause\s+\d+|Article\s+[IVX\d]+|\d+\.\d+)', first_line, re.IGNORECASE)
                if match:
                    current_clause_num = match.group(0)
                else:
                    current_clause_num = first_line[:30]

            current_chunk_paragraphs.append(p)
            combined_text = "\n\n".join(current_chunk_paragraphs)

            # Chunk size threshold ~500 characters or 100 words
            if len(combined_text) >= 400:
                chunks.append({
                    "chunk_id": f"chunk_{chunk_id_counter}",
                    "page_number": page_num,
                    "clause_number": current_clause_num or f"Section P{page_num}",
                    "text": combined_text
                })
                chunk_id_counter += 1
                current_chunk_paragraphs = []

        if current_chunk_paragraphs:
            combined_text = "\n\n".join(current_chunk_paragraphs)
            chunks.append({
                "chunk_id": f"chunk_{chunk_id_counter}",
                "page_number": page_num,
                "clause_number": current_clause_num or f"Section P{page_num}",
                "text": combined_text
            })
            chunk_id_counter += 1

    return chunks
