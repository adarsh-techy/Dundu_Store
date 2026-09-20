import { create } from 'zustand';

/**
 * Global Popup Coordinator Store
 * Ensures strictly that ONLY 1 marketing/gamification popup is active/displayed
 * at a time for any user. Prevents stacking, overlapping, or multiple simultaneous popups.
 */
const usePopupCoordinator = create((set, get) => ({
  activePopup: null, // null | 'birthday' | 'spin_wheel' | 'scratch_card' | 'festival' | 'free_shipping' | 'login_prompt'

  /**
   * Request permission to show a popup.
   * Returns true if permission granted (slot acquired or already held by this popup).
   * Returns false if another popup is currently occupying the screen.
   */
  requestPopup: (popupId) => {
    const current = get().activePopup;
    if (!current) {
      set({ activePopup: popupId });
      return true;
    }
    if (current === popupId) {
      return true;
    }
    return false;
  },

  /**
   * Release the popup slot so another eligible feature can display next when appropriate.
   */
  releasePopup: (popupId) => {
    const current = get().activePopup;
    if (!current || current === popupId) {
      set({ activePopup: null });
    }
  },
}));

export default usePopupCoordinator;
