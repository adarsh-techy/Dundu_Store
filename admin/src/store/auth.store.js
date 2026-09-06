import { create } from 'zustand';
import { authApi } from '../api';

const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('dundu_admin_token') || localStorage.getItem('velora_admin_token'),
  isLoading: true,

  setToken: (token) => {
    localStorage.setItem('dundu_admin_token', token);
    set({ token });
  },

  fetchMe: async () => {
    if (!get().token) { set({ isLoading: false }); return; }
    try {
      const res = await authApi.me();
      const user = res.data.user;
      if (!['admin', 'super_admin'].includes(user.role)) {
        localStorage.removeItem('dundu_admin_token');
        localStorage.removeItem('velora_admin_token');
        set({ token: null, user: null, isLoading: false });
        return;
      }
      set({ user, isLoading: false });
    } catch {
      localStorage.removeItem('dundu_admin_token');
      localStorage.removeItem('velora_admin_token');
      set({ token: null, user: null, isLoading: false });
    }
  },

  logout: () => {
    localStorage.removeItem('velora_admin_token');
    set({ user: null, token: null });
  },

  isSuperAdmin: () => get().user?.role === 'super_admin',

  hasPermission: (key) => {
    const user = get().user;
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    return Array.isArray(user.permissions) && user.permissions.includes(key);
  },
}));

export default useAuthStore;
