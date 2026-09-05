import { apiService } from '../services/apiService';

export const cameraApi = {
  getAll: () => apiService.getCameras(),
  getById: (id: string) => apiService.getCameraById(id),
};
