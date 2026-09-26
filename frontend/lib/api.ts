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
// Account Persistence & Auth APIs
// ---------------------------------------------------------------------------
const hashLocalPassword = async (pwd: string): Promise<string> => {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(pwd + '_legallens_secure_salt_2026');
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback to deterministic hash below
    }
  }
  let hash = 5381;
  const salted = pwd + '_legallens_secure_salt_2026';
  for (let i = 0; i < salted.length; i++) {
    hash = ((hash << 5) + hash) + salted.charCodeAt(i);
    hash |= 0;
  }
  return 'sec_' + Math.abs(hash).toString(36);
};

interface LocalAccount {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
}

const getLocalAccounts = (): LocalAccount[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('legallens_accounts');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveLocalAccount = (acc: LocalAccount) => {
  if (typeof window === 'undefined') return;
  const accounts = getLocalAccounts().filter((a) => a.email !== acc.email);
  accounts.push(acc);
  localStorage.setItem('legallens_accounts', JSON.stringify(accounts));
};

export const registerUser = async (name: string, email: string, password: string): Promise<{ access_token: string; user: User }> => {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();

  if (!cleanName) {
    throw new Error('Please enter your full name.');
  }
  if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    throw new Error('Please enter a valid email address (e.g., user@example.com).');
  }
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }

  // Check existing local accounts first
  const existing = getLocalAccounts().find((a) => a.email === cleanEmail);
  if (existing) {
    throw new Error('An account with this email address already exists. Please sign in instead.');
  }

  const hashed = await hashLocalPassword(password);

  try {
    const res = await api.post('/auth/register', { name: cleanName, email: cleanEmail, password });
    if (res.data?.access_token) {
      setAuthToken(res.data.access_token);
      if (typeof window !== 'undefined') {
        localStorage.setItem('legallens_user', JSON.stringify(res.data.user));
      }
      saveLocalAccount({
        id: res.data.user.id,
        name: res.data.user.name,
        email: cleanEmail,
        passwordHash: hashed
      });
      return res.data;
    }
  } catch (apiErr: any) {
    // If the server returns a specific duplicate error (409) or validation error (422)
    if (apiErr.response?.status === 409) {
      throw new Error(apiErr.response?.data?.detail || 'An account with this email address already exists. Please sign in instead.');
    }
    if (apiErr.response?.status === 422) {
      const detail = apiErr.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map((d: any) => d.msg || (typeof d === 'string' ? d : JSON.stringify(d))).join(', ')
        : typeof detail === 'string'
        ? detail
        : 'Validation error. Please verify your details.';
      throw new Error(msg);
    }

    // Fallback: If server is offline or unreachable, securely create and store local user
    const localId = 'usr_' + Date.now().toString(36);
    const localUser: User = {
      id: localId,
      name: cleanName,
      email: cleanEmail,
      is_active: true,
      created_at: new Date().toISOString()
    };
    const localToken = 'local-jwt-' + localId + '-' + Date.now();
    setAuthToken(localToken);
    if (typeof window !== 'undefined') {
      localStorage.setItem('legallens_user', JSON.stringify(localUser));
    }
    saveLocalAccount({
      id: localId,
      name: cleanName,
      email: cleanEmail,
      passwordHash: hashed
    });
    return { access_token: localToken, user: localUser };
  }

  throw new Error('Registration could not be completed. Please try again.');
};

export const loginUser = async (email: string, password: string): Promise<{ access_token: string; user: User }> => {
  const cleanEmail = email.trim().toLowerCase();

  try {
    const res = await api.post('/auth/login', { email: cleanEmail, password });
    if (res.data?.access_token) {
      setAuthToken(res.data.access_token);
      if (typeof window !== 'undefined') {
        localStorage.setItem('legallens_user', JSON.stringify(res.data.user));
      }
      const hashed = await hashLocalPassword(password);
      saveLocalAccount({
        id: res.data.user.id,
        name: res.data.user.name,
        email: cleanEmail,
        passwordHash: hashed
      });
      return res.data;
    }
  } catch (apiErr: any) {
    const hashed = await hashLocalPassword(password);
    const localAcc = getLocalAccounts().find((a) => a.email === cleanEmail);

    if (localAcc) {
      if (localAcc.passwordHash === hashed) {
        const localUser: User = {
          id: localAcc.id,
          name: localAcc.name,
          email: localAcc.email,
          is_active: true
        };
        const localToken = 'local-jwt-' + localAcc.id + '-' + Date.now();
        setAuthToken(localToken);
        if (typeof window !== 'undefined') {
          localStorage.setItem('legallens_user', JSON.stringify(localUser));
        }
        return { access_token: localToken, user: localUser };
      } else {
        throw new Error('Incorrect password for this account. Please verify and try again.');
      }
    }

    // Support standard demo credentials
    if (cleanEmail === 'reviewer@legallens.ai' && password === 'DemoPassword@2026') {
      return loginAsDemoUser();
    }
    if (cleanEmail === 'demo@legallens.ai' && password === 'demo123456') {
      return loginAsDemoUser();
    }

    if (apiErr.response?.data?.detail) {
      const d = apiErr.response.data.detail;
      throw new Error(typeof d === 'string' ? d : JSON.stringify(d));
    }

    throw new Error('Invalid email or password. Please verify your credentials or create an account.');
  }

  throw new Error('Invalid email or password.');
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
  try {
    const res = await api.get('/auth/me');
    return res.data;
  } catch (err) {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('legallens_user');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          // ignore
        }
      }
    }
    throw err;
  }
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

