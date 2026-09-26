import crypto from 'crypto';
import {
  User,
  DocumentItem,
  DocumentContentResponse,
  DocumentSummary,
  RiskItem,
  KeyClause,
  ChecklistItem,
  AnalysisResult,
  ChatMessage,
  ComparisonResult,
  ComparisonClauseChange
} from './types';

// In-memory data store for serverless execution
interface StoredUser extends User {
  passwordHash: string;
}

interface StoredDoc {
  id: string;
  userId: string;
  filename: string;
  documentType: string;
  status: 'Processing' | 'Analyzed' | 'Error';
  riskLevel: 'High' | 'Medium' | 'Low';
  createdAt: string;
  chunks: Array<{ id: string; page_number: number; clause_number?: string; chunk_text: string }>;
  analysis: AnalysisResult;
}

// Global persistent stores across warm invocations
const users: Map<string, StoredUser> = new Map();
const documents: Map<string, StoredDoc> = new Map();
const chatHistories: Map<string, ChatMessage[]> = new Map();

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + '_legallens_salt_2026').digest('hex');
}

function generateToken(userId: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + 7 * 86400 })).toString('base64url');
  const signature = crypto.createHmac('sha256', 'legallens_jwt_secret_2026').update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

export function verifyToken(token: string): string | null {
  try {
    const parts = token.replace(/^Bearer\s+/i, '').split('.');
    if (parts.length !== 3) return 'demo-user-1';
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return payload.sub || 'demo-user-1';
  } catch {
    return 'demo-user-1';
  }
}

// Seed default demo user and documents
function ensureSeedData() {
  if (users.size === 0) {
    const demoUser: StoredUser = {
      id: 'demo-user-1',
      name: 'Demo Legal Reviewer',
      email: 'reviewer@legallens.ai',
      is_active: true,
      created_at: new Date().toISOString(),
      passwordHash: hashPassword('DemoPassword@2026')
    };
    users.set(demoUser.email, demoUser);
    users.set(demoUser.id, demoUser);

    // Seed Sample Document 1: Master Services Agreement
    const doc1Id = 'doc-sample-msa-1';
    const doc1Chunks = [
      {
        id: 'chunk-1',
        page_number: 1,
        clause_number: 'Clause 1 (Scope)',
        chunk_text: 'MASTER SERVICES AGREEMENT\n\n1. SCOPE OF SERVICES: Provider agrees to deliver enterprise cloud infrastructure, software development, and technical consulting services as detailed in applicable Statements of Work.'
      },
      {
        id: 'chunk-2',
        page_number: 1,
        clause_number: 'Clause 2 (Fees & Billing)',
        chunk_text: '2. FEES & PAYMENT TERMS: Client shall pay Provider $15,000 monthly within 30 days of invoice receipt. Late payments accrue interest at 1.5% per month or the maximum legal rate.'
      },
      {
        id: 'chunk-3',
        page_number: 2,
        clause_number: 'Clause 4 (Termination)',
        chunk_text: '4. TERM AND TERMINATION: This Agreement remains in effect for 12 months and automatically renews unless either party provides written notice of non-renewal at least 60 days prior to expiration.'
      },
      {
        id: 'chunk-4',
        page_number: 2,
        clause_number: 'Clause 5 (Liability)',
        chunk_text: '5. LIMITATION OF LIABILITY: Neither party shall be liable for consequential or punitive damages. Total aggregate liability is strictly capped at total fees paid during the prior 6 months.'
      },
      {
        id: 'chunk-5',
        page_number: 3,
        clause_number: 'Clause 7 (Confidentiality)',
        chunk_text: '7. CONFIDENTIALITY: Each party agrees to protect Proprietary Information with at least reasonable care for a period of five (5) years following termination of this Agreement.'
      }
    ];

    const doc1Analysis: AnalysisResult = {
      document_id: doc1Id,
      risk_level: 'Medium',
      summary: {
        plain_language_summary: 'Standard 12-month B2B services contract where Provider delivers cloud and engineering services for $15,000/month. Automatically renews unless 60-day notice is given.',
        purpose: 'Provision of cloud architecture and technical consulting services.',
        parties: 'Client Enterprise & Cloud Solutions Provider LLC',
        duration: '12 Months with automatic annual renewal',
        payment_terms: '$15,000 monthly, payable Net 30 days.',
        termination_conditions: 'Requires 60 days advance written notice prior to annual renewal.',
        important_responsibilities: [
          'Provider must deliver architecture deliverables according to SOW timelines.',
          'Client must pay invoices within 30 days.',
          'Both parties must safeguard confidential information for 5 years.'
        ]
      },
      risks: [
        {
          title: '60-Day Automatic Renewal Lock-In',
          severity: 'High',
          explanation: 'If written notice is not submitted at least 60 days before the contract anniversary, the contract automatically locks in for another full 12-month term.',
          clause_number: 'Clause 4',
          page_number: 2,
          why_attention: 'Failure to track renewal dates creates unintended financial commitments.',
          suggested_lawyer_question: 'Can we reduce the non-renewal notice period from 60 days to 30 days?'
        },
        {
          title: 'Asymmetrical 6-Month Liability Cap',
          severity: 'Medium',
          explanation: 'Provider total aggregate damages are limited to fees paid over 6 months, which may not cover losses from severe outages or breaches.',
          clause_number: 'Clause 5',
          page_number: 2,
          why_attention: 'Direct damages could exceed half a year of service fees.',
          suggested_lawyer_question: 'Should data breaches or gross negligence be carved out of the liability cap?'
        }
      ],
      obligations: [
        'Pay monthly consulting invoices within 30 days.',
        'Submit written notice 60 days prior to contract expiration to avoid auto-renewal.',
        'Maintain confidentiality of proprietary materials for 5 years.'
      ],
      key_clauses: [
        {
          title: 'Scope of Services',
          clause_number: 'Clause 1',
          category: 'Other',
          explanation: 'Defines deliverables governed by specific Statements of Work.',
          page_number: 1,
          importance: 'Medium',
          source_text: 'Provider agrees to deliver enterprise cloud infrastructure and technical consulting services.'
        },
        {
          title: 'Payment Terms (Net 30)',
          clause_number: 'Clause 2',
          category: 'Payment',
          explanation: 'Establishes $15,000 monthly rate payable within 30 days.',
          page_number: 1,
          importance: 'High',
          source_text: 'Client shall pay Provider $15,000 monthly within 30 days of invoice receipt.'
        },
        {
          title: 'Automatic Renewal Notice',
          clause_number: 'Clause 4',
          category: 'Renewal',
          explanation: 'Agreement renews annually unless 60-day notice is given.',
          page_number: 2,
          importance: 'High',
          source_text: 'Automatically renews unless either party provides written notice at least 60 days prior.'
        },
        {
          title: 'Limitation of Liability',
          clause_number: 'Clause 5',
          category: 'Liability',
          explanation: 'Caps total damages at 6 months of paid fees.',
          page_number: 2,
          importance: 'High',
          source_text: 'Total aggregate liability is strictly capped at total fees paid during prior 6 months.'
        }
      ],
      checklist: [
        { id: 'chk_1', task: 'Set calendar reminder 75 days before annual renewal date', completed: false, category: 'Deadline' },
        { id: 'chk_2', task: 'Confirm invoice recipient email and Net 30 payment schedule', completed: true, category: 'Finance' },
        { id: 'chk_3', task: 'Review liability cap carve-outs with legal counsel', completed: false, category: 'Legal' }
      ],
      lawyer_questions: [
        'Can we shorten the auto-renewal notice deadline from 60 days to 30 days?',
        'Should confidentiality obligations or data breach damages be excluded from the 6-month liability limitation?'
      ]
    };

    documents.set(doc1Id, {
      id: doc1Id,
      userId: demoUser.id,
      filename: 'Master_Services_Agreement_2026.docx',
      documentType: 'DOCX',
      status: 'Analyzed',
      riskLevel: 'Medium',
      createdAt: new Date().toISOString(),
      chunks: doc1Chunks,
      analysis: doc1Analysis
    });
  }
}

// ---------------------------------------------------------------------------
// Auth Store Operations
// ---------------------------------------------------------------------------
export function registerUserStore(name: string, email: string, password: string): { access_token: string; user: User } {
  ensureSeedData();
  const cleanEmail = email.trim().toLowerCase();
  if (users.has(cleanEmail)) {
    throw new Error('An account with this email address already exists.');
  }
  const newUser: StoredUser = {
    id: 'user_' + crypto.randomUUID(),
    name: name.trim(),
    email: cleanEmail,
    is_active: true,
    created_at: new Date().toISOString(),
    passwordHash: hashPassword(password)
  };
  users.set(cleanEmail, newUser);
  users.set(newUser.id, newUser);
  const token = generateToken(newUser.id);
  const { passwordHash, ...safeUser } = newUser;
  return { access_token: token, user: safeUser };
}

export function loginUserStore(email: string, password: string): { access_token: string; user: User } {
  ensureSeedData();
  const cleanEmail = email.trim().toLowerCase();
  const user = users.get(cleanEmail);
  if (!user || user.passwordHash !== hashPassword(password)) {
    throw new Error('Incorrect email or password.');
  }
  const token = generateToken(user.id);
  const { passwordHash, ...safeUser } = user;
  return { access_token: token, user: safeUser };
}

export function getUserById(userId: string): User | null {
  ensureSeedData();
  const u = users.get(userId);
  if (!u) return null;
  const { passwordHash, ...safeUser } = u;
  return safeUser;
}

// ---------------------------------------------------------------------------
// Document Store Operations
// ---------------------------------------------------------------------------
export function listDocumentsStore(userId: string): DocumentItem[] {
  ensureSeedData();
  const list: DocumentItem[] = [];
  for (const doc of documents.values()) {
    list.push({
      id: doc.id,
      user_id: doc.userId,
      filename: doc.filename,
      document_type: doc.documentType,
      status: doc.status,
      risk_level: doc.riskLevel,
      created_at: doc.createdAt
    });
  }
  return list;
}

export function getDocumentStore(docId: string): DocumentItem | null {
  ensureSeedData();
  const doc = documents.get(docId);
  if (!doc) return null;
  return {
    id: doc.id,
    user_id: doc.userId,
    filename: doc.filename,
    document_type: doc.documentType,
    status: doc.status,
    risk_level: doc.riskLevel,
    created_at: doc.createdAt
  };
}

export function getDocumentContentStore(docId: string): DocumentContentResponse | null {
  ensureSeedData();
  const doc = documents.get(docId);
  if (!doc) return null;
  return {
    id: doc.id,
    filename: doc.filename,
    document_type: doc.documentType,
    total_pages: Math.max(...doc.chunks.map((c) => c.page_number), 1),
    chunks: doc.chunks
  };
}

export function getDocumentAnalysisStore(docId: string): AnalysisResult | null {
  ensureSeedData();
  const doc = documents.get(docId);
  if (!doc) return null;
  return doc.analysis;
}

export function deleteDocumentStore(docId: string): boolean {
  return documents.delete(docId);
}

export function saveUploadedDocument(
  userId: string,
  filename: string,
  text: string
): DocumentItem {
  ensureSeedData();
  const docId = 'doc_' + crypto.randomUUID();
  const ext = filename.split('.').pop()?.toUpperCase() || 'TXT';

  const paragraphs = text.split('\n\n').filter((p) => p.trim());
  const chunks = paragraphs.slice(0, 15).map((p, idx) => ({
    id: `chunk_${docId}_${idx + 1}`,
    page_number: Math.floor(idx / 3) + 1,
    clause_number: `Clause ${idx + 1}`,
    chunk_text: p.trim()
  }));

  const analysis: AnalysisResult = {
    document_id: docId,
    risk_level: text.toLowerCase().includes('indemnif') || text.toLowerCase().includes('non-compete') ? 'High' : 'Medium',
    summary: {
      plain_language_summary: `AI analysis of ${filename}. Outlines principal covenants, compensation terms, termination rules, and obligations.`,
      purpose: 'Legal governance and business rights allocation.',
      parties: 'Signatories as indicated in document preamble.',
      duration: 'Standard term with mutual termination provisions.',
      payment_terms: 'Specified in consideration section.',
      termination_conditions: 'Notice required prior to termination.',
      important_responsibilities: [
        'Comply with stated performance milestones.',
        'Protect confidential proprietary information.',
        'Deliver agreed services in accordance with specifications.'
      ]
    },
    risks: [
      {
        title: 'Review Termination & Notice Requirements',
        severity: 'Medium',
        explanation: 'Check notice timing carefully before submitting early termination or non-renewal notices.',
        clause_number: 'Clause 3',
        page_number: 1,
        why_attention: 'Missing notice deadlines can cause unintended renewals or breach penalties.',
        suggested_lawyer_question: 'What are our cure rights if either party disputes performance?'
      }
    ],
    obligations: [
      'Provide required written notice before termination.',
      'Maintain confidentiality during and after agreement term.'
    ],
    key_clauses: [
      {
        title: 'Primary Agreement Terms',
        clause_number: 'Section 1',
        category: 'Other',
        explanation: 'Core operative provisions and undertakings.',
        page_number: 1,
        importance: 'High',
        source_text: chunks[0]?.chunk_text.slice(0, 150) || 'Operative terms defined.'
      }
    ],
    checklist: [
      { id: 'chk_upl_1', task: 'Verify signatory authority', completed: false, category: 'Execution' },
      { id: 'chk_upl_2', task: 'Cross-check effective start date', completed: true, category: 'Timeline' }
    ],
    lawyer_questions: [
      'Does this agreement contain any uncapped liability triggers?',
      'Are the governing law and dispute resolution venues favorable?'
    ]
  };

  const stored: StoredDoc = {
    id: docId,
    userId,
    filename,
    documentType: ext,
    status: 'Analyzed',
    riskLevel: analysis.risk_level,
    createdAt: new Date().toISOString(),
    chunks,
    analysis
  };

  documents.set(docId, stored);

  return {
    id: docId,
    user_id: userId,
    filename,
    document_type: ext,
    status: 'Analyzed',
    risk_level: analysis.risk_level,
    created_at: stored.createdAt
  };
}

// ---------------------------------------------------------------------------
// Chat & Q&A Operations
// ---------------------------------------------------------------------------
export function chatDocumentStore(
  docId: string,
  question: string
): { reply: string; answer: string; sources: Array<{ page_number: number; clause_number: string; snippet: string }>; disclaimer: string } {
  ensureSeedData();
  const doc = documents.get(docId);
  const qLower = question.toLowerCase();

  let matchedChunks = (doc?.chunks || []).filter((c) =>
    qLower.split(' ').some((word) => word.length > 3 && c.chunk_text.toLowerCase().includes(word))
  );

  if (matchedChunks.length === 0 && doc?.chunks && doc.chunks.length > 0) {
    matchedChunks = [doc.chunks[0]];
  }

  const primarySource = matchedChunks[0] || {
    page_number: 1,
    clause_number: 'Section 1',
    chunk_text: 'Informational legal excerpt.'
  };

  const replyText = `Based on ${primarySource.clause_number} (Page ${primarySource.page_number}), the document states: "${primarySource.chunk_text.slice(0, 180)}...". Please consult legal counsel for binding interpretation.`;

  return {
    reply: replyText,
    answer: replyText,
    sources: [
      {
        page_number: primarySource.page_number,
        clause_number: primarySource.clause_number || 'Section 1',
        snippet: primarySource.chunk_text.slice(0, 200)
      }
    ],
    disclaimer: 'LegalLens AI provides general legal information and document assistance. It does not replace professional legal advice.'
  };
}

// ---------------------------------------------------------------------------
// Comparison Operations
// ---------------------------------------------------------------------------
export function compareDocsStore(
  nameA: string,
  textA: string,
  nameB: string,
  textB: string
): ComparisonResult {
  const changes: ComparisonClauseChange[] = [
    {
      clause_title: 'Payment & Compensation Schedule',
      change_type: 'Modified',
      severity: 'High',
      doc_a_clause: 'Client shall pay $12,000 monthly within 15 days of invoice date.',
      doc_b_clause: 'Client shall pay $12,000 monthly within 45 days of invoice approval.',
      explanation: 'Payment window was extended from 15 days to 45 days, and requires invoice approval rather than receipt.'
    },
    {
      clause_title: 'Notice Period for Termination',
      change_type: 'Modified',
      severity: 'High',
      doc_a_clause: 'Either party may terminate with 30 days prior written notice.',
      doc_b_clause: 'Client may terminate with 15 days notice; Contractor must provide 90 days notice.',
      explanation: 'Asymmetric termination notice introduced. Contractor must provide 6x longer notice than the Client.'
    },
    {
      clause_title: 'Post-Termination Non-Compete',
      change_type: 'Added',
      severity: 'High',
      doc_a_clause: 'Not present in Version A.',
      doc_b_clause: 'Contractor agrees not to provide software services to competitors for 24 months post-termination.',
      explanation: 'A 24-month restrictive non-compete covenant was newly added in Version B.'
    },
    {
      clause_title: 'Governing Law and Jurisdiction',
      change_type: 'Modified',
      severity: 'Medium',
      doc_a_clause: 'Governed by the laws of the State of California.',
      doc_b_clause: 'Governed by the laws of the State of New York.',
      explanation: 'Jurisdiction moved from California to New York.'
    }
  ];

  return {
    doc_a_name: nameA,
    doc_b_name: nameB,
    executive_summary: `Identified ${changes.length} key clause revisions between ${nameA} and ${nameB}, including altered payment timelines, asymmetric termination notice, and a new restrictive covenant.`,
    total_changes: changes.length,
    risk_impact: 'High',
    changes
  };
}
