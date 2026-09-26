export interface User {
  id: string;
  name: string;
  email: string;
  is_active?: boolean;
  created_at?: string;
}

export interface DocumentItem {
  id: string;
  user_id: string;
  filename: string;
  document_type: string;
  status: 'Processing' | 'Analyzed' | 'Error';
  created_at: string;
  risk_level: 'High' | 'Medium' | 'Low';
}

export interface DocumentChunk {
  id?: string;
  page_number: number;
  clause_number?: string | null;
  chunk_text: string;
}

export interface DocumentContentResponse {
  id: string;
  filename: string;
  document_type: string;
  total_pages: number;
  chunks: DocumentChunk[];
}

export interface DocumentSummary {
  plain_language_summary: string;
  purpose: string;
  parties: string;
  duration: string;
  payment_terms: string;
  termination_conditions: string;
  important_responsibilities: string[];
}

export interface RiskItem {
  title: string;
  severity: 'High' | 'Medium' | 'Low';
  explanation: string;
  clause_number?: string;
  page_number?: number;
  why_attention?: string;
  suggested_lawyer_question?: string;
}

export interface RisksResponse {
  risk_level: 'High' | 'Medium' | 'Low';
  risks: RiskItem[];
}

export interface KeyClause {
  title: string;
  clause_number?: string;
  category: 'Payment' | 'Termination' | 'Liability' | 'Confidentiality' | 'Intellectual Property' | 'Renewal' | 'Dispute Resolution' | 'Other';
  explanation: string;
  page_number?: number;
  importance: 'High' | 'Medium' | 'Low';
  source_text?: string;
}

export interface ChecklistItem {
  id: string;
  task: string;
  completed: boolean;
  category: string;
}

export interface AnalysisResult {
  document_id: string;
  summary: DocumentSummary;
  risk_level: 'High' | 'Medium' | 'Low';
  risks: RiskItem[];
  obligations: string[];
  key_clauses: KeyClause[];
  checklist: ChecklistItem[];
  lawyer_questions: string[];
}

export interface ChatSource {
  page_number?: number;
  clause_number?: string;
  text?: string;
  snippet?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  sources?: ChatSource[];
  timestamp?: string;
}

export interface ComparisonClauseChange {
  change_type: 'Added' | 'Removed' | 'Modified' | 'Unchanged';
  clause_title: string;
  severity: 'High' | 'Medium' | 'Low';
  doc_a_clause?: string | null;
  doc_b_clause?: string | null;
  explanation: string;
}

export interface ComparisonCategoryStats {
  added: number;
  removed: number;
  modified: number;
}

export interface ComparisonResult {
  doc_a_name: string;
  doc_b_name: string;
  executive_summary: string;
  total_changes: number;
  risk_impact: 'High' | 'Medium' | 'Low';
  changes: ComparisonClauseChange[];
  category_breakdown?: Record<string, ComparisonCategoryStats>;
}
