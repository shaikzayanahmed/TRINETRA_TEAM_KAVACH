import { apiService } from '../services/apiService';

export const targetApi = {
  getAll: () => apiService.getTargets(),
  getById: (id: string) => apiService.getTargetById(id),
};

export const alertApi = {
  getAll: () => apiService.getAlerts(),
  getById: (id: string) => apiService.getAlertById(id),
  resolve: (id: string, resolvedBy?: string) => apiService.resolveAlert(id, resolvedBy),
};

export const evidenceApi = {
  getAll: () => apiService.getEvidence(),
  getById: (id: string) => apiService.getEvidenceById(id),
};

export const fenceApi = {
  getAll: () => apiService.getVirtualFences(),
  toggle: (id: string, status: 'ACTIVE' | 'INACTIVE') => apiService.toggleVirtualFence(id, status),
};

export const edgeNodeApi = {
  getAll: () => apiService.getEdgeNodes(),
  getById: (id: string) => apiService.getEdgeNodeById(id),
};

export const environmentApi = {
  get: () => apiService.getEnvironment(),
};

export const analyticsApi = {
  get: () => apiService.getAnalytics(),
};

export const reportApi = {
  get: () => apiService.getReports(),
  generate: () => apiService.generateReport(),
};
