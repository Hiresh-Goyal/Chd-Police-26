import type {
  Case,
  CaseDetail,
  TimelineEvent,
  GraphData,
  Alert,
  AlertDetail,
  FraudScore,
  MoneyFlowData,
  GeospatialEvent,
  CorrelationMatrixData,
  ReportData,
  SearchResult,
} from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  // Auth
  login(username: string, password: string) {
    return this.fetch<{ access_token: string; token_type: string; role: string }>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
  }

  // Cases
  getCases() {
    return this.fetch<Case[]>('/cases');
  }

  createCase(title: string, description: string = '') {
    return this.fetch<{ id: string; title: string }>('/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description }),
    });
  }

  getCase(caseId: string) {
    return this.fetch<CaseDetail>(`/cases/${caseId}`);
  }

  uploadFile(caseId: string, file: File, fileType: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_type', fileType);
    return this.fetch<any>(`/cases/${caseId}/upload`, {
      method: 'POST',
      body: formData,
    });
  }

  analyzeCase(caseId: string) {
    return this.fetch<any>(`/cases/${caseId}/analyze`, {
      method: 'POST',
    });
  }

  // Visualizations & Data
  getTimeline(caseId: string, params?: { entity_id?: string; event_type?: string; start?: string; end?: string }) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return this.fetch<TimelineEvent[]>(`/cases/${caseId}/timeline${query ? `?${query}` : ''}`);
  }

  getGraph(caseId: string) {
    return this.fetch<GraphData>(`/cases/${caseId}/graph`);
  }

  getAlerts(caseId: string, params?: { severity?: string; rule_id?: string }) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return this.fetch<Alert[]>(`/cases/${caseId}/alerts${query ? `?${query}` : ''}`);
  }

  getAlertDetail(caseId: string, findingId: string) {
    return this.fetch<AlertDetail>(`/cases/${caseId}/alerts/${findingId}`);
  }

  getFraudScore(caseId: string) {
    return this.fetch<FraudScore>(`/cases/${caseId}/fraudscore`);
  }

  getCriminalFlow(caseId: string) {
    return this.fetch<MoneyFlowData>(`/cases/${caseId}/criminalflow`);
  }

  getGeospatial(caseId: string) {
    return this.fetch<GeospatialEvent[]>(`/cases/${caseId}/geospatial`);
  }

  getCorrelationMatrix(caseId: string) {
    return this.fetch<CorrelationMatrixData>(`/cases/${caseId}/correlation-matrix`);
  }

  getReport(caseId: string, format: 'json' | 'pdf' = 'json') {
    return this.fetch<ReportData>(`/cases/${caseId}/report?format=${format}`);
  }

  search(caseId: string, query: string) {
    return this.fetch<SearchResult>(`/cases/${caseId}/search?q=${encodeURIComponent(query)}`);
  }
}

export const apiClient = new ApiClient();
