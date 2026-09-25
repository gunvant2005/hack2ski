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
            # Fallback text extractor if fitz has an issue
            pages_data.append({
                "page_number": 1,
                "text": f"Error parsing PDF with fitz: {str(e)}"
            })
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
                # Approximate page break per ~250 words for DOCX
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
        except Exception as e:
            pages_data.append({
                "page_number": 1,
                "text": f"Error parsing DOCX: {str(e)}"
            })
    else:
        # Plain text fallback
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
                pages_data.append({"page_number": 1, "text": text})
        except Exception:
            pages_data.append({"page_number": 1, "text": "Unsupported file format."})

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
