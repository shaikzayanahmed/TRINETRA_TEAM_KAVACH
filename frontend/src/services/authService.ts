import { User } from '../types';
import { MOCK_USER } from '../mocks/mockData';

class AuthService {
  private currentUser: User | null = MOCK_USER;

  async login(callsign: string, passkey: string): Promise<{ success: boolean; user?: User; error?: string }> {
    // Simulated authentication delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    if (!callsign.trim() || !passkey.trim()) {
      return { success: false, error: 'Callsign and Security Passkey are required.' };
    }

    // Accept valid operator callsign or default mock
    this.currentUser = {
      ...MOCK_USER,
      callsign: callsign.toUpperCase(),
    };

    localStorage.setItem('trinetra_auth_token', 'mock_jwt_tactical_token_sector_07');
    return { success: true, user: this.currentUser };
  }

  logout(): void {
    this.currentUser = null;
    localStorage.removeItem('trinetra_auth_token');
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('trinetra_auth_token') || !!this.currentUser;
  }
}

export const authService = new AuthService();
