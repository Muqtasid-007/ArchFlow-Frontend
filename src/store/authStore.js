import { create } from 'zustand';
import { apiRequest, refreshAccessToken, setAccessToken } from '../lib/api.js';

export const useAuthStore = create((set, get) => ({
  user: null,
  status: 'loading',

  async bootstrap() {
    try {
      const payload = await refreshAccessToken();
      if (payload?.user) {
        set({ user: payload.user, status: 'authenticated' });
        return;
      }
    } catch {
      // fall through to guest
    }
    setAccessToken(null);
    set({ user: null, status: 'guest' });
  },

  async login(credentials) {
    const payload = await apiRequest('/auth/login', { method: 'POST', body: credentials });
    setAccessToken(payload.accessToken);
    set({ user: payload.user, status: 'authenticated' });
    return payload.user;
  },

  async register(details) {
    const payload = await apiRequest('/auth/register', { method: 'POST', body: details });
    setAccessToken(payload.accessToken);
    set({ user: payload.user, status: 'authenticated' });
    return payload.user;
  },

  async logout() {
    try {
      await apiRequest('/auth/logout', { method: 'POST', retry: false });
    } finally {
      setAccessToken(null);
      set({ user: null, status: 'guest' });
    }
  },

  async updateProfile(updates) {
    const payload = await apiRequest('/auth/me', { method: 'PATCH', body: updates });
    set({ user: payload.user });
    return payload.user;
  },

  isAuthenticated() {
    return get().status === 'authenticated';
  },
}));
