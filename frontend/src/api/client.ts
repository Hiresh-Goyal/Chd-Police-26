/**
 * DigitalSentinel API Client
 * Written by Member 4 — Member 5 imports from here.
 * 
 * Provides an Axios/fetch base client with BASE_URL from VITE_API_URL and JWT token injection.
 */

/// <reference types="vite/client" />

import type {
  AnalyzeResponse,
  CanonicalEventAPI,
  CaseAPI,
  CorrelationMatrixData,
  CriminalFlowData,
  EvidenceFileType,
  FindingAPI,
  FindingDetailAPI,
  FraudScoreAPI,
  GeospatialData,
  GraphData,
  HealthResponse,
  LoginResponse,
  UploadResponse,
} from '../types/api';

const BASE_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) ||
  'http://localhost:8000/api';

export interface RequestConfig extends RequestInit {
  params?: Record<string, any>;
  headers?: Record<string, string>;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
}

type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;

const requestInterceptors: RequestInterceptor[] = [];

// Base request wrapper
async function request<T = any>(endpoint: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
  let finalConfig: RequestConfig = {
    ...config,
    headers: {
      ...config.headers,
    },
  };

  // Run interceptors
  for (const interceptor of requestInterceptors) {
    finalConfig = await interceptor(finalConfig);
  }

  // Automatic JWT Bearer header injection
  const token = typeof window !== 'undefined' ? localStorage.getItem('ds_token') : null;
  if (token && finalConfig.headers && !finalConfig.headers['Authorization']) {
    finalConfig.headers['Authorization'] = `Bearer ${token}`;
  }

  // Build URL with query params
  let fullUrl = endpoint.startsWith('http')
    ? endpoint
    : `${BASE_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;

  if (finalConfig.params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(finalConfig.params)) {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryString;
    }
  }

  const response = await fetch(fullUrl, finalConfig);

  let responseData: any;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    responseData = await response.json();
  } else {
    responseData = await response.text();
  }

  if (!response.ok) {
    const errorMsg =
      (responseData && typeof responseData === 'object' && responseData.detail) ||
      `Request failed with status ${response.status}: ${response.statusText}`;
    const err = new Error(errorMsg);
    (err as any).response = {
      status: response.status,
      data: responseData,
    };
    throw err;
  }

  return {
    data: responseData as T,
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  };
}

/**
 * Axios-compatible API instance
 */
export const api = {
  get: <T = any>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> =>
    request<T>(url, { ...config, method: 'GET' }),

  post: <T = any>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> => {
    const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
    const headers: Record<string, string> = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...config?.headers,
    };
    const body = isFormData ? data : (data !== undefined ? JSON.stringify(data) : undefined);

    return request<T>(url, {
      ...config,
      method: 'POST',
      headers,
      body,
    });
  },

  put: <T = any>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> => {
    const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
    const headers: Record<string, string> = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...config?.headers,
    };
    return request<T>(url, {
      ...config,
      method: 'PUT',
      headers,
      body: isFormData ? data : (data !== undefined ? JSON.stringify(data) : undefined),
    });
  },

  delete: <T = any>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> =>
    request<T>(url, { ...config, method: 'DELETE' }),

  interceptors: {
    request: {
      use: (fn: RequestInterceptor) => {
        requestInterceptors.push(fn);
      },
    },
  },
};

/* ----------------------------------------------------
   Exported API Functions (consumed by Member 5 hooks)
---------------------------------------------------- */

// Health
export const getHealth = async (): Promise<HealthResponse> => {
  const res = await api.get<HealthResponse>('/health');
  return res.data;
};

// Authentication
export const login = async (credentials: { username: string; password: string }): Promise<LoginResponse> => {
  const res = await api.post<LoginResponse>('/auth/login', credentials);
  if (res.data.access_token && typeof window !== 'undefined') {
    localStorage.setItem('ds_token', res.data.access_token);
    localStorage.setItem('ds_role', res.data.role);
    localStorage.setItem('ds_user', res.data.username);
  }
  return res.data;
};

export const logout = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('ds_token');
    localStorage.removeItem('ds_role');
    localStorage.removeItem('ds_user');
  }
};

// Cases
export const getCases = async (): Promise<CaseAPI[]> => {
  const res = await api.get<CaseAPI[]>('/cases');
  return res.data;
};

export const getCase = async (caseId: string): Promise<CaseAPI> => {
  const res = await api.get<CaseAPI>(`/cases/${caseId}`);
  return res.data;
};

export const createCase = async (data: { name?: string; title?: string; description?: string }): Promise<CaseAPI> => {
  const res = await api.post<CaseAPI>('/cases', data);
  return res.data;
};

// Evidence Upload
export const uploadEvidence = async (
  caseId: string,
  file: File,
  fileType: EvidenceFileType | string
): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('file_type', fileType);

  const res = await api.post<UploadResponse>(`/cases/${caseId}/upload`, formData);
  return res.data;
};

// Analysis
export const analyzeCase = async (caseId: string): Promise<AnalyzeResponse> => {
  const res = await api.post<AnalyzeResponse>(`/cases/${caseId}/analyze`);
  return res.data;
};

// Timeline
export const getTimeline = async (
  caseId: string,
  params?: { entity_id?: string; event_type?: string; start?: string; end?: string }
): Promise<CanonicalEventAPI[]> => {
  const res = await api.get<CanonicalEventAPI[]>(`/cases/${caseId}/timeline`, { params });
  return res.data;
};

// Graph
export const getGraph = async (caseId: string): Promise<GraphData> => {
  const res = await api.get<GraphData>(`/cases/${caseId}/graph`);
  return res.data;
};

// Alerts
export const getAlerts = async (caseId: string): Promise<FindingAPI[]> => {
  const res = await api.get<FindingAPI[]>(`/cases/${caseId}/alerts`);
  return res.data;
};

export const getAlertDetail = async (caseId: string, findingId: string): Promise<FindingDetailAPI> => {
  const res = await api.get<FindingDetailAPI>(`/cases/${caseId}/alerts/${findingId}`);
  return res.data;
};

// FraudScore
export const getFraudScore = async (caseId: string): Promise<FraudScoreAPI> => {
  const res = await api.get<FraudScoreAPI>(`/cases/${caseId}/fraudscore`);
  return res.data;
};

// CriminalFlow
export const getCriminalFlow = async (caseId: string): Promise<CriminalFlowData> => {
  const res = await api.get<CriminalFlowData>(`/cases/${caseId}/criminalflow`);
  return res.data;
};

// Geospatial
export const getGeospatial = async (caseId: string): Promise<GeospatialData> => {
  const res = await api.get<GeospatialData>(`/cases/${caseId}/geospatial`);
  return res.data;
};

// Correlation Matrix
export const getCorrelationMatrix = async (caseId: string): Promise<CorrelationMatrixData> => {
  const res = await api.get<CorrelationMatrixData>(`/cases/${caseId}/correlation-matrix`);
  return res.data;
};

// Snapshot Report
export const getCaseReport = async (caseId: string): Promise<any> => {
  const res = await api.get<any>(`/cases/${caseId}/report`);
  return res.data;
};
