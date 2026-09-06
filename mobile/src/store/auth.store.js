import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../api/index';
import { setLogoutCallback } from '../api/client';
import useCartStore from './cart.store';

const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  initAuth: async () => {
    set({ isLoading: true });
    try {
      const token = (await AsyncStorage.getItem('dundu_token')) || (await AsyncStorage.getItem('velora_token'));
      if (token) {
        const res = await authApi.me();
        const user = res.user || res;
        set({ user, token, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      await AsyncStorage.removeItem('dundu_token');
      await AsyncStorage.removeItem('velora_token');
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (data) => {
    const res = await authApi.login(data);
    const token = res.token || res.data?.token;
    const user = res.user || res.data?.user;
    await AsyncStorage.setItem('dundu_token', token);
    set({ user, token, isAuthenticated: true });
    return res;
  },

  signup: async (data) => {
    const res = await authApi.signup(data);
    const token = res.token || res.data?.token;
    const user = res.user || res.data?.user;
    await AsyncStorage.setItem('dundu_token', token);
    set({ user, token, isAuthenticated: true });
    return res;
  },

  logout: async () => {
    try {
      await AsyncStorage.removeItem('dundu_token');
      await AsyncStorage.removeItem('velora_token');
    } catch (e) {
      // ignore
    }
    useCartStore.getState().resetCart();
    set({ user: null, token: null, isAuthenticated: false });
  },

  updateUser: (user) => set({ user }),
}));

// Wire global logout callback after store is created
setLogoutCallback(useAuthStore.getState().logout);

export default useAuthStore;
