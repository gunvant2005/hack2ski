import os
from sqlalchemy.orm import Session
from app.models.all_models import User, Document, DocumentChunk, AnalysisResult
from app.core.security import get_password_hash

DEMO_EMPLOYMENT_AGREEMENT = """EMPLOYMENT AGREEMENT (FICTIONAL DEMO DOCUMENT)

This Employment Agreement ("Agreement") is entered into as of September 1, 2026, by and between Apex Global Solutions Inc. ("Employer") and Jane Doe ("Employee").

1. POSITION AND DUTIES
Employee shall serve as Senior Software Engineer, reporting to the VP of Engineering. Employee agrees to devote full professional time and best efforts to performing assigned duties.

2. COMPENSATION AND BENEFITS
Employer shall pay Employee a base salary of $135,000 per annum, payable bi-weekly in accordance with standard payroll practices. Employee shall be eligible for health insurance and 15 days paid time off per calendar year.

3. CONFIDENTIALITY & INTELLECTUAL PROPERTY
Employee acknowledges that during employment, Employee will have access to confidential technical and financial information. Employee agrees not to disclose confidential information to any third party. All intellectual property, software code, and inventions created by Employee during employment shall belong exclusively to Employer.

4. AUTOMATIC RENEWAL (ATTENTION AREA)
This Agreement shall be effective for a period of one (1) year from the start date. This Agreement shall automatically renew for successive one-year periods unless either party provides written notice of non-renewal at least sixty (60) days prior to the expiration of the current term.

5. TERMINATION & NOTICE
Either party may terminate this Agreement without cause upon providing thirty (30) days prior written notice. Employer may terminate immediately for Cause (defined as fraud, gross negligence, or felony conviction).

6. POST-EMPLOYMENT NON-COMPETE (ATTENTION AREA)
For a period of twelve (12) months following termination of employment for any reason, Employee shall not directly or indirectly engage in, perform services for, or own an interest in any business entity that competes directly with Employer within a 50-mile radius.

7. INDEMNIFICATION & LIABILITY (ATTENTION AREA)
Employee agrees to indemnify and hold harmless Employer against any third-party legal claims, costs, or damages arising out of Employee's willful misconduct or breach of company policies. Liability for indirect or consequential damages shall be governed under local applicable law.

8. DISPUTE RESOLUTION & ARBITRATION
Any controversy or claim arising out of or relating to this Agreement shall be settled by final and binding arbitration under the rules of the American Arbitration Association.
"""

def seed_demo_data_if_needed(db: Session, user_id: str) -> Document:
    """
    Seeds a fictional demo Employment Agreement for a user if it doesn't already exist.
    Returns the created Document object.
    """
    existing_doc = db.query(Document).filter(
        Document.user_id == user_id,
        Document.filename == "Sample_Employment_Agreement_Demo.pdf"
    ).first()

    if existing_doc:
        return existing_doc

    # Create Demo Document
    doc = Document(
        user_id=user_id,
        filename="Sample_Employment_Agreement_Demo.pdf",
        document_type="PDF",
        file_path="uploads/demo_sample.pdf",
        status="Analyzed"
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Chunks
    paragraphs = DEMO_EMPLOYMENT_AGREEMENT.split("\n\n")
    for i, p in enumerate(paragraphs):
        chunk = DocumentChunk(
            document_id=doc.id,
            chunk_text=p,
            page_number=1 if i < 4 else (2 if i < 7 else 3),
            clause_number=f"Clause {i+1}",
            embedding=None
        )
        db.add(chunk)

    # Analysis Result
    analysis = AnalysisResult(
        document_id=doc.id,
        summary={
            "plain_language_summary": "This is a fictional demo employment contract between Apex Global Solutions Inc. and Jane Doe for a Senior Software Engineer position. It sets an annual salary of $135,000, 30 days termination notice, a 1-year auto-renewal clause, and a 12-month post-employment non-compete restraint.",
            "purpose": "Define terms for full-time Senior Software Engineer employment.",
            "parties": "Apex Global Solutions Inc. (Employer) & Jane Doe (Employee)",
            "duration": "1 Year initial term with 60-day automatic renewal notice requirement.",
            "payment_terms": "$135,000 / year base salary payable bi-weekly.",
            "termination_conditions": "30 days written notice without cause; immediate termination for Cause.",
            "important_responsibilities": [
                "Perform engineering duties faithfully.",
                "Protect confidential technical data.",
                "Provide 60 days notice to prevent automatic contract renewal.",
                "Abide by 12-month non-compete post-employment."
            ]
        },
        risk_level="High",
        risks=[
            {
                "title": "Automatic Renewal Clause",
                "severity": "Medium",
                "explanation": "This contract automatically extends for another full year unless you submit written cancellation notice at least 60 days before the annual end date.",
                "clause_number": "Clause 4",
                "page_number": 2,
                "why_attention": "Missing the 60-day deadline will automatically lock you into another 1-year contract term.",
                "suggested_lawyer_question": "What is the exact calendar date by which written non-renewal notice must be delivered?"
            },
            {
                "title": "Post-Employment Non-Compete Restraint",
                "severity": "High",
                "explanation": "Restricts working for or establishing a competing software business within 50 miles for 12 months after leaving the company.",
                "clause_number": "Clause 6",
                "page_number": 2,
                "why_attention": "This restriction could limit your job mobility or career options in the software industry for a full year after resignation.",
                "suggested_lawyer_question": "Is this 12-month geographical non-compete clause enforceable under state employment law?"
            },
            {
                "title": "Broad Employee Indemnification Obligation",
                "severity": "Medium",
                "explanation": "Requires employee to indemnify the employer for third-party claims or damages resulting from breach of company policies.",
                "clause_number": "Clause 7",
                "page_number": 3,
                "why_attention": "Broad indemnification can create personal financial liability for workplace disputes.",
                "suggested_lawyer_question": "Can this indemnification clause be limited or removed?"
            }
        ],
        obligations=[
            "Provide 30 days written notice before resigning.",
            "Maintain strict confidentiality of trade secrets.",
            "Assign all intellectual property developed during employment to the company.",
            "Adhere to 12-month non-compete restraint after termination."
        ],
        key_clauses=[
            {
                "title": "Compensation & Base Salary",
                "clause_number": "Clause 2",
                "category": "Payment",
                "explanation": "Base salary of $135,000 annually with standard health and PTO benefits.",
                "page_number": 1,
                "importance": "High",
                "source_text": "Employer shall pay Employee a base salary of $135,000 per annum..."
            },
            {
                "title": "Termination & Notice Period",
                "clause_number": "Clause 5",
                "category": "Termination",
                "explanation": "Requires 30 days written notice for termination without cause.",
                "page_number": 2,
                "importance": "High",
                "source_text": "Either party may terminate this Agreement without cause upon providing thirty (30) days prior written notice."
            },
            {
                "title": "Confidentiality & Code Ownership",
                "clause_number": "Clause 3",
                "category": "Confidentiality",
                "explanation": "Protects trade secrets and assigns all IP rights to employer.",
                "page_number": 1,
                "importance": "Medium",
                "source_text": "All intellectual property, software code, and inventions created by Employee... belong exclusively to Employer."
            },
            {
                "title": "Binding Arbitration",
                "clause_number": "Clause 8",
                "category": "Dispute Resolution",
                "explanation": "Requires legal disputes to be resolved by binding AAA arbitration.",
                "page_number": 3,
                "importance": "Medium",
                "source_text": "Any controversy or claim... shall be settled by final and binding arbitration."
            }
        ],
        checklist=[
            {"id": "chk_1", "task": "Verify salary payment frequency and health insurance coverage start date.", "completed": True, "category": "Payment"},
            {"id": "chk_2", "task": "Mark 60-day pre-renewal notification deadline on personal calendar.", "completed": False, "category": "Renewal"},
            {"id": "chk_3", "task": "Review 12-month non-compete restraint with an employment lawyer.", "completed": False, "category": "Legal Consultation"},
            {"id": "chk_4", "task": "Confirm 30-day written notice requirement for voluntary resignation.", "completed": True, "category": "Termination"},
            {"id": "chk_5", "task": "Verify intellectual property assignment boundaries for personal side-projects.", "completed": False, "category": "IP"}
        ],
        lawyer_questions=[
            "Is the 12-month post-employment non-compete restriction enforceable in my state/region?",
            "How can I ensure my personal open-source projects or pre-existing code are excluded from IP assignment?",
            "What written notice format is required to prevent the automatic 1-year contract renewal?",
            "Can the broad employee indemnification clause in Section 7 be removed or limited?"
        ]
    )

    db.add(analysis)
    db.commit()

    return doc
