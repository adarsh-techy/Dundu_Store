import { create } from 'zustand';
import { settingsApi } from '../api';

const useSettingsStore = create((set, get) => ({
  offerBadgeColor: '#e91e8c',
  offerBadgeTextColor: '#ffffff',
  fetched: false,

  fetchSettings: async () => {
    if (get().fetched) return;
    try {
      const res = await settingsApi.getPayment();
      set({
        offerBadgeColor: res.data.offer_badge_color || '#e91e8c',
        offerBadgeTextColor: res.data.offer_badge_text_color || '#ffffff',
        fetched: true,
      });
    } catch {
      set({ fetched: true });
    }
  },
}));

export default useSettingsStore;
