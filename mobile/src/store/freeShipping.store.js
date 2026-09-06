import { create } from 'zustand';

const useFreeShippingStore = create((set) => ({
  isOpen: false,
  customTotal: null,
  openModal: (total = null) => set({ isOpen: true, customTotal: total }),
  closeModal: () => set({ isOpen: false, customTotal: null }),
}));

export default useFreeShippingStore;
