import { create } from 'zustand';
import { settingsApi } from '../api/index';

const useSettingsStore = create((set, get) => ({
  offerBadgeColor: '#e91e8c',
  offerBadgeTextColor: '#ffffff',
  fetched: false,

  fetchSettings: async () => {
    if (get().fetched) return;
    try {
      const res = await settingsApi.getPayment();
      const data = res.data || res;
      set({
        offerBadgeColor: data?.offer_badge_color || '#e91e8c',
        offerBadgeTextColor: data?.offer_badge_text_color || '#ffffff',
        fetched: true,
      });
    } catch {
      set({ fetched: true });
    }
  },
}));

export default useSettingsStore;
