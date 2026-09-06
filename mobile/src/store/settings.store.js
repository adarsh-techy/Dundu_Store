import { create } from 'zustand';
import { settingsApi, festivalApi } from '../api/index';

const useSettingsStore = create((set) => ({
  // Offer badge
  offerBadgeColor: '#e91e8c',
  offerBadgeTextColor: '#ffffff',

  // Festival theme (defaults = normal dark theme)
  festivalEnabled: false,
  festivalName: '',
  festivalEmoji: '🎉',
  festivalBgColor: '#FFFFFF',
  festivalNavbarColor: '#040d04',
  festivalNavbarTextColor: '#FFFFFF',
  festivalLogoUrl: null,
  festivalBannerText: '',

  // Festival popup
  festivalPopupEnabled: false,
  festivalPopupHeading: '',
  festivalPopupSubtext: '',
  festivalPopupCoupon: '',
  festivalPopupBadgeText: '',
  festivalPopupBtnText: 'Shop Now 🛍️',
  festivalPopupBtnColor: '#E91E8C',
  festivalPopupExpiresAt: null,

  fetchSettings: async () => {
    try {
      const [payRes, festRes] = await Promise.allSettled([
        settingsApi.getPayment(),
        festivalApi.getConfig(),
      ]);

      let pay = {};
      if (payRes.status === 'fulfilled' && payRes.value) {
        const pVal = payRes.value;
        pay = pVal.data?.data || pVal.data || pVal;
      }

      let festRaw = {};
      if (festRes.status === 'fulfilled' && festRes.value) {
        const fVal = festRes.value;
        festRaw = fVal.festival || fVal.data?.festival || fVal.data || fVal;
      }

      const festEnabled = String(festRaw.festival_enabled) === 'true';

      // Popup respects expiry time
      let popupEnabled = festEnabled && String(festRaw.festival_popup_enabled) === 'true';
      if (popupEnabled && festRaw.festival_popup_expires_at) {
        popupEnabled = new Date(festRaw.festival_popup_expires_at) > new Date();
      }

      set({
        offerBadgeColor: pay?.offer_badge_color || '#e91e8c',
        offerBadgeTextColor: pay?.offer_badge_text_color || '#ffffff',

        festivalEnabled: festEnabled,
        festivalName: festRaw.festival_name || '',
        festivalEmoji: festRaw.festival_emoji || '🎉',

        // Apply festival colors only when ON, otherwise restore defaults
        festivalBgColor:         festEnabled ? (festRaw.festival_bg_color          || '#FFF7ED') : '#FFFFFF',
        festivalNavbarColor:     festEnabled ? (festRaw.festival_navbar_color      || '#7C3AED') : '#040d04',
        festivalNavbarTextColor: festEnabled ? (festRaw.festival_navbar_text_color || '#FFFFFF') : '#FFFFFF',
        festivalLogoUrl:         festEnabled ? (festRaw.festival_logo_url          || null)    : null,
        festivalBannerText:      festEnabled ? (festRaw.festival_banner_text       || '')      : '',

        festivalPopupEnabled:   popupEnabled,
        festivalPopupHeading:   festRaw.festival_popup_heading   || '',
        festivalPopupSubtext:   festRaw.festival_popup_subtext   || '',
        festivalPopupCoupon:    festRaw.festival_popup_coupon    || '',
        festivalPopupBadgeText: festRaw.festival_popup_badge_text|| '',
        festivalPopupBtnText:   festRaw.festival_popup_btn_text  || 'Shop Now 🛍️',
        festivalPopupBtnColor:  festRaw.festival_popup_btn_color || '#E91E8C',
        festivalPopupExpiresAt: festRaw.festival_popup_expires_at|| null,
      });
    } catch (_) {
      // Silently fail — keep existing defaults
    }
  },
}));

export default useSettingsStore;
