import { ApiClient } from './api';
import { UserProfile } from '../types';

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: UserProfile;
}

export class AuthService {
  public static async login(email: string, password: string): Promise<LoginResponse> {
    const data = await ApiClient.post<LoginResponse>('/auth/login', { email, password });
    localStorage.setItem('agent40_access_token', data.access_token);
    localStorage.setItem('agent40_refresh_token', data.refresh_token);
    return data;
  }

  public static async getMe(): Promise<UserProfile> {
    return ApiClient.get<UserProfile>('/auth/me');
  }

  public static logout(): void {
    localStorage.removeItem('agent40_access_token');
    localStorage.removeItem('agent40_refresh_token');
  }

  public static getStoredToken(): string | null {
    return localStorage.getItem('agent40_access_token');
  }
}
