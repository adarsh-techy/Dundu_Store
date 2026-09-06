import { create } from 'zustand';

const useScratchCardStore = create((set) => ({
  isOpen: false,
  openScratchCard: () => set({ isOpen: true }),
  closeScratchCard: () => set({ isOpen: false }),
}));

export default useScratchCardStore;
