import axios, { AxiosError, AxiosResponse } from 'axios';
import {
  User,
  DocumentItem,
  DocumentContentResponse,
  AnalysisResult,
  DocumentSummary,
  KeyClause,
  RisksResponse,
  ChecklistItem,
  ComparisonResult,
  ChatMessage,
} from './types';

const envApi = process.env.NEXT_PUBLIC_API_URL || '';
const API_BASE_URL = (envApi && !envApi.includes('backend-mauve-nu-93')) ? envApi : '/api';

// ---------------------------------------------------------------------------
// Token helpers — SSR-safe wrappers
// ---------------------------------------------------------------------------
export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('legallens_token');
  }
  return null;
};

export const setAuthToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('legallens_token', token);
  }
};

export const removeAuthToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('legallens_token');
    localStorage.removeItem('legallens_user');
  }
};

export const getStoredUser = (): User | null => {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem('legallens_user');
    try {
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }
  return null;
};

// ---------------------------------------------------------------------------
// Axios instance with timeout and auth interceptors
// ---------------------------------------------------------------------------
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60_000, // 60s — generous for Gemini calls
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global response error handler
api.interceptors.response.use(
  (res: AxiosResponse) => res,
  (err: AxiosError) => {
    // Auto-logout on 401 only for protected endpoints (not login/register)
    if (err.response?.status === 401) {
      const url = err.config?.url || '';
      const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register');
      if (!isAuthEndpoint) {
        removeAuthToken();
        if (typeof window !== 'undefined') {
          const path = window.location.pathname;
          if (path !== '/login' && path !== '/register') {
            window.location.href = '/login';
          }
        }
      }
    }
    // Re-throw so callers can still catch & display specific error messages
    return Promise.reject(err);
  },
);

// ---------------------------------------------------------------------------
// Auth APIs
// ---------------------------------------------------------------------------
export const registerUser = async (name: string, email: string, password: string): Promise<{ access_token: string; user: User }> => {
  const res = await api.post('/auth/register', { name, email, password });
  if (res.data.access_token) {
    setAuthToken(res.data.access_token);
    if (typeof window !== 'undefined') {
      localStorage.setItem('legallens_user', JSON.stringify(res.data.user));
    }
  }
  return res.data;
};

export const loginUser = async (email: string, password: string): Promise<{ access_token: string; user: User }> => {
  const res = await api.post('/auth/login', { email, password });
  if (res.data.access_token) {
    setAuthToken(res.data.access_token);
    if (typeof window !== 'undefined') {
      localStorage.setItem('legallens_user', JSON.stringify(res.data.user));
    }
  }
  return res.data;
};

export const loginAsDemoUser = (): { access_token: string; user: User } => {
  const demoToken = 'demo-session-token-' + Date.now();
  const demoUser: User = {
    id: 'demo-user-1',
    name: 'Demo Reviewer',
    email: 'reviewer@legallens.ai',
    is_active: true,
    created_at: new Date().toISOString()
  };
  setAuthToken(demoToken);
  if (typeof window !== 'undefined') {
    localStorage.setItem('legallens_user', JSON.stringify(demoUser));
  }
  return { access_token: demoToken, user: demoUser };
};

export const getMe = async (): Promise<User> => {
  const res = await api.get('/auth/me');
  return res.data;
};

// ---------------------------------------------------------------------------
// Document APIs
// ---------------------------------------------------------------------------
export const getDocuments = async (): Promise<DocumentItem[]> => {
  const res = await api.get('/documents');
  return res.data;
};

export const uploadDocument = async (
  file: File,
  onProgress?: (percent: number) => void,
): Promise<DocumentItem> => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress
      ? (evt) => {
          const pct = evt.total ? Math.round((evt.loaded / evt.total) * 100) : 0;
          onProgress(pct);
        }
      : undefined,
  });
  return res.data;
};

export const getDocument = async (id: string): Promise<DocumentItem> => {
  const res = await api.get(`/documents/${id}`);
  return res.data;
};

export const getDocumentContent = async (id: string): Promise<DocumentContentResponse> => {
  const res = await api.get(`/documents/${id}/content`);
  return res.data;
};

export const analyzeDocument = async (id: string): Promise<AnalysisResult> => {
  const res = await api.post(`/documents/${id}/analyze`);
  return res.data;
};

export const getDocumentSummary = async (id: string): Promise<DocumentSummary> => {
  const res = await api.get(`/documents/${id}/summary`);
  return res.data;
};

export const getDocumentClauses = async (id: string): Promise<KeyClause[]> => {
  const res = await api.get(`/documents/${id}/clauses`);
  return res.data;
};

export const getDocumentRisks = async (id: string): Promise<RisksResponse> => {
  const res = await api.get(`/documents/${id}/risks`);
  return res.data;
};

export const getDocumentChecklist = async (id: string): Promise<ChecklistItem[]> => {
  const res = await api.get(`/documents/${id}/checklist`);
  return res.data;
};

export const getLawyerQuestions = async (id: string): Promise<string[]> => {
  const res = await api.get(`/documents/${id}/lawyer-questions`);
  return res.data;
};

export const deleteDocument = async (id: string): Promise<{ message: string; id: string }> => {
  const res = await api.delete(`/documents/${id}`);
  return res.data;
};

// ---------------------------------------------------------------------------
// Chat API
// ---------------------------------------------------------------------------
export const askDocumentQuestion = async (
  document_id: string,
  message: string,
): Promise<{ reply: string; answer?: string; sources: Array<{ page_number?: number; clause_number?: string; text?: string; snippet?: string }> }> => {
  const res = await api.post('/chat', { document_id, message });
  return res.data;
};

export const getChatHistory = async (document_id: string): Promise<ChatMessage[]> => {
  const res = await api.get(`/chat/${document_id}/history`);
  return res.data;
};

// ---------------------------------------------------------------------------
// Compare API
// ---------------------------------------------------------------------------
export const compareDocuments = async (
  docAFile?: File,
  docBFile?: File,
  docAId?: string,
  docBId?: string,
): Promise<ComparisonResult> => {
  const formData = new FormData();
  if (docAFile) formData.append('doc_a', docAFile);
  if (docBFile) formData.append('doc_b', docBFile);
  if (docAId) formData.append('doc_a_id', docAId);
  if (docBId) formData.append('doc_b_id', docBId);

  const res = await api.post('/compare', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 90_000, // comparison can take longer
  });
  return res.data;
};

export default api;

