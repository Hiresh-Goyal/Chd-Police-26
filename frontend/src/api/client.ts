const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function fetchApi<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`);
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  return response.json();
}

export const getTimeline = (caseId: string) => fetchApi<any>(`/api/timeline?caseId=${caseId}`);
export const getGraph = (caseId: string) => fetchApi<any>(`/api/graph?caseId=${caseId}`);
export const getAlerts = (caseId: string) => fetchApi<any>(`/api/alerts?caseId=${caseId}`);
export const getAlertDetail = (alertId: string) => fetchApi<any>(`/api/alerts/${alertId}`);
export const getFraudScore = (caseId: string) => fetchApi<any>(`/api/fraudscore?caseId=${caseId}`);
export const getCase = (caseId: string) => fetchApi<any>(`/api/cases/${caseId}`);
export const getCriminalFlow = (caseId: string) => fetchApi<any>(`/api/criminalflow?caseId=${caseId}`);
