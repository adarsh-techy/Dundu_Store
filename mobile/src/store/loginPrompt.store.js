/**
 * Zustand store for the global login prompt modal.
 * Any screen can call show() to open the prompt.
 */
import { create } from 'zustand';

const useLoginPromptStore = create((set) => ({
  visible: false,
  message: null,
  show: (message = null) => set({ visible: true, message }),
  hide: () => set({ visible: false, message: null }),
}));

export default useLoginPromptStore;
