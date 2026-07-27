import { create } from 'zustand';
import { authApi } from '../api';
import useCartStore from './cart.store';

const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('velora_token'),
  isLoading: true,

  setToken: (token) => {
    localStorage.setItem('velora_token', token);
    set({ token });
  },

  setUser: (user) => set({ user }),

  fetchMe: async () => {
    if (!get().token) { set({ isLoading: false }); return; }
    try {
      const res = await authApi.me();
      set({ user: res.data.user, isLoading: false });
    } catch {
      localStorage.removeItem('velora_token');
      set({ token: null, user: null, isLoading: false });
    }
  },

  logout: () => {
    localStorage.removeItem('velora_token');
    useCartStore.getState().clearCart();
    set({ user: null, token: null });
  },

  isAuthenticated: () => !!get().token,
}));

export default useAuthStore;
