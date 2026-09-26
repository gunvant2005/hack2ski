import os
import re
import logging
from typing import List, Dict, Any, Tuple, Optional

logger = logging.getLogger("legallens.document_processor")


# ---------------------------------------------------------------------------
# Helpers: RTF stripping (stdlib-only fallback — no external dep required)
# ---------------------------------------------------------------------------
def _strip_rtf(rtf_text: str) -> str:
    r"""
    Minimal but robust RTF -> plaintext converter using regex.
    Handles \controlwords, braces, \'hh hex escapes, and skips fonttbl/colortbl/stylesheet info groups.
    """
    if not rtf_text:
        return ""
    s = rtf_text

    # Skip leading garbage before {\rtf
    idx = s.find("{\\rtf")
    if idx != -1:
        s = s[idx:]

    def _hex_replace(match: "re.Match[str]") -> str:
        hx = match.group(1)
        try:
            return bytes.fromhex(hx).decode("cp1252", errors="ignore")
        except Exception:
            return ""

    # Resolve \'hh escapes
    s = re.sub(r"\\'([0-9a-fA-F]{2})", _hex_replace, s)

    # Remove info groups we want to skip entirely: \fonttbl, \colortbl, \stylesheet, \info
    # by walking braces and stripping their contents
    def _strip_named_group(src: str, name: str) -> str:
        pat = re.compile(r"\{" + re.escape(name) + r"[^}]*\}")
        prev = None
        cur = src
        while prev != cur:
            prev = cur
            cur = pat.sub("", cur)
        return cur

    for skip_group in ("\\fonttbl", "\\colortbl", "\\stylesheet", "\\info", "\\filetbl"):
        s = _strip_named_group(s, skip_group)

    # Remove \controlword tokens (optionally followed by non-whitespace parameter up to space/brace)
    # Examples: \b, \i0, \par, \fs24, \lang1033
    s = re.sub(r"\\[a-zA-Z]+-?\d* ?", "", s)

    # Remove braces, keeping any inner content (already mostly handled above)
    s = s.replace("{", "").replace("}", "")

    # Normalize newlines: paragraph breaks -> blank lines
    s = s.replace("\r\n", "\n").replace("\r", "\n")
    s = re.sub(r"\n{3,}", "\n\n", s)

    # Strip residual backslashes that precede special chars (for example \{ \} \\)
    s = re.sub(r"\\([{}_~|%&#$^@-])", r"\1", s)

    # Final cleanup of control char leftovers
    s = re.sub(r"[\\]", " ", s)
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\n +", "\n", s)
    return s.strip()


# ---------------------------------------------------------------------------
# Helpers: metadata extraction
# ---------------------------------------------------------------------------
def _extract_document_metadata(full_text: str) -> Dict[str, Any]:
    """Scan document text for useful metadata patterns."""
    meta: Dict[str, Any] = {
        "parties": [],
        "dates": [],
        "dollar_amounts": [],
        "governing_law": None,
        "jurisdiction": None,
        "signature_blocks_present": False,
    }
    if not full_text:
        return meta

    # Dollar amounts ($1,234.56 / £... / €...)
    for m in re.finditer(r"([$€£¥])\s*([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{2})?|[0-9]+(?:\.[0-9]{2})?)", full_text):
        try:
            amt = float(m.group(2).replace(",", ""))
            meta["dollar_amounts"].append({"currency": m.group(1), "amount": amt, "raw": m.group(0)})
        except Exception:
            pass
    # Deduplicate by raw text
    seen_raw: set = set()
    dedup_amt = []
    for a in meta["dollar_amounts"]:
        if a["raw"] not in seen_raw:
            seen_raw.add(a["raw"])
            dedup_amt.append(a)
    meta["dollar_amounts"] = dedup_amt[:20]

    # Dates: ISO (2024-01-15), US long form (January 15, 2024), numeric 01/15/2024
    date_pat = re.compile(
        r"((?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2},?\s+\d{4})|"
        r"(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})|"
        r"(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})",
        re.IGNORECASE,
    )
    seen_dates: set = set()
    for m in date_pat.finditer(full_text):
        t = (m.group(0) or "").strip()
        if t and t not in seen_dates:
            seen_dates.add(t)
            meta["dates"].append(t)
    meta["dates"] = meta["dates"][:12]

    # Parties: lines with "by and between" / "entered into by and between"
    parties_match = re.search(
        r"entered into\s+(?:by and between|among)\s+([\s\S]{0,250}?)(?:,\s+collectively|and\s+collectively|\.|\bon\s+\w+\s+\d{1,2},?\s+\d{4}\b)",
        full_text,
        re.IGNORECASE,
    )
    if parties_match:
        raw = parties_match.group(1)
        splits = re.split(r"\s+and\s+|\s*,\s*(?!and)|;", raw, flags=re.IGNORECASE)
        for p in splits:
            p = p.strip().strip("\"'()[]{}")
            if 4 <= len(p) <= 120:
                meta["parties"].append(p)

    # Governing law
    gl = re.search(
        r"governed\s+by\s+(?:the\s+laws?\s+of\s+)?([A-Za-z .,\-]{2,80}?)(?:\.|,|\s+without\s+regard|\s+and\s+venue|\s+excluding|\s+choice\s+of\s+law)",
        full_text,
        re.IGNORECASE,
    )
    if gl:
        meta["governing_law"] = gl.group(1).strip().rstrip(",.").strip()

    # Jurisdiction / venue
    jd = re.search(
        r"(?:submit\s+(?:to|itself)\s+the\s+(?:exclusive\s+)?(?:jurisdiction|courts\s+of)\s+|jurisdiction\s+and\s+venue\s+shall\s+lie\s+in\s+|venue\s+(?:shall\s+)?be\s+in\s+)([A-Za-z0-9 .,\-]{2,100}?)(?:\.|\s+and\s+any|,)",
        full_text,
        re.IGNORECASE,
    )
    if jd:
        meta["jurisdiction"] = jd.group(1).strip().rstrip(",.").strip()

    # Signature block heuristic
    if re.search(r"(?:By:|Name:|Title:|Signature:)\s{0,5}\n+\s*_{2,}", full_text, re.IGNORECASE) or \
       re.search(r"\bIN\s+WITNESS\s+WHEREOF\b", full_text, re.IGNORECASE):
        meta["signature_blocks_present"] = True

    return meta


# ---------------------------------------------------------------------------
# Helpers: table/list preservation
# ---------------------------------------------------------------------------
_LIST_BULLET_RE = re.compile(r'^\s*(?:\d+\.|[A-Z]\.|[ivxlcdm]+\.|[•\-\*\u2022\u25CF\u25CB\u25E6])\s+', re.IGNORECASE)


def _mark_paragraph_structure(text: str) -> str:
    """Annotate paragraphs so downstream chunking can preserve lists/tables cues."""
    lines = text.split("\n")
    out: List[str] = []
    for line in lines:
        s = line.rstrip()
        if not s.strip():
            out.append("")
            continue
        # Detect list items
        if _LIST_BULLET_RE.match(s):
            out.append("• " + s.strip())
            continue
        # Detect tabular rows (2+ '  ' multi-space separators OR pipe separators)
        if s.count("  ") >= 2 or (s.count("|") >= 2):
            out.append("TABLE-ROW: " + s.strip())
            continue
        out.append(s)
    return "\n".join(out)


# ---------------------------------------------------------------------------
# File extractors
# ---------------------------------------------------------------------------
def _extract_pdf(file_path: str) -> List[Dict[str, Any]]:
    pages: List[Dict[str, Any]] = []
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(file_path)
        for i, page in enumerate(doc):
            text = page.get_text("text").strip()
            if text:
                # Also check for tables: look for dense multi-space columns
                structured = _mark_paragraph_structure(text)
                pages.append({"page_number": i + 1, "text": structured})
        doc.close()
    except Exception as e:
        logger.info(f"fitz extraction failed ({e}); using pypdf fallback.")
        try:
            import pypdf
            reader = pypdf.PdfReader(file_path)
            for i, page in enumerate(reader.pages):
                t = page.extract_text() or ""
                if t.strip():
                    pages.append({
                        "page_number": i + 1,
                        "text": _mark_paragraph_structure(t.strip()),
                    })
        except Exception as e2:
            logger.warning(f"Both PDF parsers failed: {e} / {e2}")
    return pages


def _extract_docx(file_path: str) -> List[Dict[str, Any]]:
    pages: List[Dict[str, Any]] = []
    try:
        import docx
        document = docx.Document(file_path)
        page_num = 1
        buffer: List[str] = []
        word_count = 0

        def _flush() -> None:
            nonlocal buffer, word_count, pages, page_num
            if buffer:
                text = _mark_paragraph_structure("\n".join(buffer)).strip()
                if text:
                    pages.append({"page_number": page_num, "text": text})
                page_num += 1
            buffer = []
            word_count = 0

        for para in document.paragraphs:
            p_text = para.text.strip()
            if not p_text:
                continue
            w = len(p_text.split())
            buffer.append(p_text)
            word_count += w
            if word_count >= 360:
                _flush()

        # Also append table contents as structured rows
        for tbl in document.tables:
            rows_out: List[str] = []
            for row in tbl.rows:
                cells = [c.text.strip().replace("\n", " | ") for c in row.cells]
                rows_out.append("TABLE-ROW: " + " || ".join(cells))
            if rows_out:
                tbl_text = "\n".join(rows_out)
                w = len(tbl_text.split())
                buffer.append(tbl_text)
                word_count += w
                if word_count >= 360:
                    _flush()

        _flush()
        return pages
    except Exception:
        pass

    # Stdlib fallback
    try:
        import zipfile
        import xml.etree.ElementTree as ET
        with zipfile.ZipFile(file_path, "r") as z:
            xml_bytes = z.read("word/document.xml")
        root = ET.fromstring(xml_bytes)
        ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
        paras: List[str] = []
        for p in root.iter(f"{{{ns}}}p"):
            texts = [t.text for t in p.iter(f"{{{ns}}}t") if t.text]
            joined = "".join(texts).strip()
            if joined:
                paras.append(joined)
        if paras:
            page_num = 1
            buf: List[str] = []
            wc = 0
            for p in paras:
                buf.append(p)
                wc += len(p.split())
                if wc >= 360:
                    pages.append({"page_number": page_num, "text": _mark_paragraph_structure("\n".join(buf)).strip()})
                    buf = []
                    wc = 0
                    page_num += 1
            if buf:
                pages.append({"page_number": page_num, "text": _mark_paragraph_structure("\n".join(buf)).strip()})
    except Exception:
        pass
    return pages


def _extract_rtf(file_path: str) -> List[Dict[str, Any]]:
    pages: List[Dict[str, Any]] = []
    try:
        with open(file_path, "r", encoding="cp1252", errors="ignore") as f:
            raw = f.read()
        if not raw.startswith("{\\rtf"):
            # Maybe someone renamed a .txt to .rtf
            return [{"page_number": 1, "text": _mark_paragraph_structure(raw.strip())}]
        text = _strip_rtf(raw)
        if not text:
            return pages
        # Pseudo-page every ~360 words
        tokens = text.split()
        cur: List[str] = []
        pg = 1
        wc = 0
        for t in tokens:
            cur.append(t)
            wc += 1
            if wc >= 360:
                joined = _mark_paragraph_structure(" ".join(cur))
                pages.append({"page_number": pg, "text": joined})
                cur = []
                wc = 0
                pg += 1
        if cur:
            pages.append({"page_number": pg, "text": _mark_paragraph_structure(" ".join(cur))})
    except Exception as e:
        logger.warning(f"RTF extraction failed: {e}")
    return pages


def _extract_plaintext(file_path: str) -> List[Dict[str, Any]]:
    try:
        with open(file_path, "rb") as f:
            header = f.read(4)
        # Reject binary signatures (ZIP/PDF)
        if header.startswith(b"PK") or header.startswith(b"%PDF"):
            return []
    except Exception:
        return []
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()
        if text.strip():
            return [{"page_number": 1, "text": _mark_paragraph_structure(text.strip())}]
    except Exception:
        return []
    return []


def extract_text_from_file(file_path: str) -> List[Dict[str, Any]]:
    """
    Extracts text per page from PDF / DOCX / DOC / TXT / RTF files.
    For each format, tries primary parser first with robust fallback on failure.
    Returns list of dicts: [{'page_number': 1, 'text': '...', 'metadata': {...}}]
    """
    ext = os.path.splitext(file_path)[1].lower()
    pages: List[Dict[str, Any]] = []

    if ext == ".pdf":
        pages = _extract_pdf(file_path)
    elif ext in (".docx", ".doc"):
        pages = _extract_docx(file_path)
    elif ext == ".rtf":
        pages = _extract_rtf(file_path)
    elif ext in (".txt", ".md"):
        pages = _extract_plaintext(file_path)
    else:
        # Unknown text-ish extension: only try plaintext if not binary
        pages = _extract_plaintext(file_path)

    # Remove empty pages, guarantee page_number ints
    cleaned: List[Dict[str, Any]] = []
    for p in pages:
        txt = (p.get("text") or "").strip()
        if not txt:
            continue
        try:
            pn = int(p.get("page_number", 1))
        except Exception:
            pn = 1
        cleaned.append({"page_number": pn, "text": txt})

    if not cleaned:
        return cleaned

    # Compute document-level metadata from concatenated text
    full = "\n\n".join(p["text"] for p in cleaned)
    meta = _extract_document_metadata(full)

    # Assign metadata to first page and also expose via every page's key
    cleaned[0]["metadata"] = meta
    for p in cleaned[1:]:
        p["metadata"] = {"_doc_level_ref": True}
    # Also keep a top-level copy as last-page anchor so chunk loop sees it always
    cleaned[-1]["_full_metadata"] = meta
    return cleaned


# ---------------------------------------------------------------------------
# Chunking
# ---------------------------------------------------------------------------
_CLAUSE_REGEXES = [
    re.compile(r'^\s*Section\s+\d+(?:\.\d+){0,3}\b', re.IGNORECASE),
    re.compile(r'^\s*Clause\s+\d+(?:\.\d+){0,3}\b', re.IGNORECASE),
    re.compile(r'^\s*Article\s+(?:[IVX]+|\d+(?:\.\d+){0,2})\b', re.IGNORECASE),
    re.compile(r'^\s*Exhibit\s+[A-Z0-9\-]+\b', re.IGNORECASE),
    re.compile(r'^\s*Schedule\s+[A-Z0-9\-]+\b', re.IGNORECASE),
    re.compile(r'^\s*Appendix\s+[A-Z0-9\-]+\b', re.IGNORECASE),
    re.compile(r'^\s*\d+(?:\.\d+){0,3}\.?\s+[A-Z]'),
    re.compile(r'^\s*\d+\)\s+\S'),
    re.compile(r'^\s*[A-Z]\.\s+\S'),
    re.compile(r'^[A-Z][A-Z\s\-/,&]{4,60}:\s*$'),
]


def _detect_clause_label(paragraph: str) -> Optional[str]:
    if not paragraph:
        return None
    first_line = paragraph.split("\n")[0].strip()
    if not first_line:
        return None
    for rx in _CLAUSE_REGEXES:
        if rx.match(first_line):
            # extract a short canonical label
            m = re.match(r'^[^:.]{0,50}', first_line)
            if m:
                label = m.group(0).strip().rstrip(":.-").strip()
                return label[:60] if label else None
    return None


def chunk_document_pages(pages_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Split page text into overlapping semantic chunks that preserve clause boundaries.
    - Detects clause headers via multiple regex patterns.
    - Flushes a chunk when length >= 450 chars AND we've seen a clean break after a clause header.
    - Adds small tail overlap (up to 80 chars) between consecutive chunks for continuity.
    """
    chunks: List[Dict[str, Any]] = []
    chunk_id = 1

    # Collect full doc metadata once (stored on first and last page)
    full_meta: Dict[str, Any] = {}
    for p in pages_data:
        if isinstance(p.get("metadata"), dict) and not p["metadata"].get("_doc_level_ref"):
            full_meta = p["metadata"]
        if isinstance(p.get("_full_metadata"), dict):
            full_meta = p["_full_metadata"]

    for page_item in pages_data:
        page_num = page_item["page_number"]
        page_text = page_item["text"]

        # Split text by blank lines (paragraphs)
        raw_paragraphs = [p.strip() for p in re.split(r'\n\s*\n', page_text) if p.strip()]
        if not raw_paragraphs:
            # Maybe single-block text: fallback to split by single newlines then rejoin runs
            lines = [ln.strip() for ln in page_text.split("\n") if ln.strip()]
            raw_paragraphs = ["\n".join(lines)] if lines else []

        current_paragraphs: List[str] = []
        current_clause: Optional[str] = None
        current_chars = 0
        overlap_tail = ""

        def flush_current() -> None:
            nonlocal current_paragraphs, current_clause, current_chars, overlap_tail, chunks, chunk_id, page_num
            if not current_paragraphs:
                return
            combined = "\n\n".join(current_paragraphs)
            if not combined.strip():
                return
            clause_label = current_clause or f"Section P{page_num}"
            chunks.append({
                "chunk_id": f"chunk_{chunk_id}",
                "page_number": page_num,
                "clause_number": clause_label,
                "text": combined.strip(),
            })
            # keep a trailing overlap for next chunk
            tail = combined.strip()[-90:]
            # Trim to last sentence/ws boundary if possible
            space_idx = tail.rfind(" ")
            if space_idx != -1 and len(tail) - space_idx < 60:
                tail = tail[space_idx + 1:]
            overlap_tail = tail
            chunk_id += 1
            current_paragraphs = []
            current_chars = 0

        for para in raw_paragraphs:
            if not para:
                continue
            label = _detect_clause_label(para)
            if label:
                # Flush prior content only if we have enough material (>= 450 chars)
                if current_chars >= 450 and current_paragraphs:
                    flush_current()
                    current_paragraphs = []
                    current_chars = 0
                    if overlap_tail:
                        current_paragraphs.append(f"(overlap) {overlap_tail}")
                        current_chars += len(overlap_tail)
                current_clause = label

            current_paragraphs.append(para)
            current_chars += len(para) + 2

            # Hard cap to prevent runaway chunks (e.g., a whole page with no headings)
            if current_chars >= 1200:
                flush_current()

        if current_paragraphs:
            flush_current()

    # Attach top-level metadata reference to first chunk
    if chunks and full_meta:
        chunks[0]["document_metadata"] = full_meta

    return chunks


# ---------------------------------------------------------------------------
# Convenience: run full pipeline and return metadata summary
# ---------------------------------------------------------------------------
def process_document_pipeline(file_path: str) -> Dict[str, Any]:
    pages = extract_text_from_file(file_path)
    chunks = chunk_document_pages(pages)
    full_text = "\n\n".join(c["text"] for c in chunks)
    meta: Dict[str, Any] = {}
    for p in pages:
        if isinstance(p.get("metadata"), dict) and not p["metadata"].get("_doc_level_ref"):
            meta = p["metadata"]
            break
    if not meta and chunks and isinstance(chunks[0].get("document_metadata"), dict):
        meta = chunks[0]["document_metadata"]
    return {
        "pages": pages,
        "chunks": chunks,
        "full_text": full_text,
        "metadata": meta or _extract_document_metadata(full_text),
    }
