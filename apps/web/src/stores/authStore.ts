import { create } from 'zustand';
import { User, LoginRequest, RegisterRequest } from '@creatormatch/shared-types';
import { apiClient } from '@/lib/api-client';

interface AuthResponse {
  user: User;
  tokens: { accessToken: string; expiresIn: number };
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /**
   * `true` until the first refreshUser() call settles. The dashboard
   * layout uses this to avoid bouncing logged-in users to /login on hard
   * refresh, before the access token can be issued from the httpOnly
   * refresh cookie.
   */
  isInitializing: boolean;

  initialize: () => Promise<void>;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: User | null) => void;
}

/**
 * NOTE: identity state is intentionally held in memory only — never
 * persisted to localStorage. localStorage is XSS-readable, so persisting
 * even the user object risks identity disclosure across origins. The
 * httpOnly refresh cookie + the 401-retry interceptor in api-client.ts
 * is what actually keeps users logged in across reloads.
 */
export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,
  isInitializing: true,

  initialize: async () => {
    if (!get().isInitializing) return;
    try {
      const response = await apiClient.get<{ user: User }>('/auth/me');
      set({ user: response.user, isAuthenticated: true, isInitializing: false });
    } catch {
      set({ user: null, isAuthenticated: false, isInitializing: false });
    }
  },

  login: async (credentials) => {
    set({ isLoading: true });
    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
      apiClient.setAccessToken(response.tokens.accessToken);
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        isInitializing: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      const response = await apiClient.post<AuthResponse>('/auth/register', data);
      apiClient.setAccessToken(response.tokens.accessToken);
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        isInitializing: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore — we still clear local state.
    }
    apiClient.clearAccessToken();
    set({ user: null, isAuthenticated: false });
  },

  refreshUser: async () => {
    try {
      const response = await apiClient.get<{ user: User }>('/auth/me');
      set({ user: response.user, isAuthenticated: true, isInitializing: false });
    } catch {
      set({ user: null, isAuthenticated: false, isInitializing: false });
    }
  },

  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
  },
}));
