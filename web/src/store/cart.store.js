import { create } from 'zustand';
import { cartApi } from '../api';

const useCartStore = create((set, get) => ({
  items: [],
  isOpen: false,
  isLoading: false,

  fetchCart: async () => {
    try {
      const res = await cartApi.get();
      set({ items: res.data.cart });
    } catch { /* not authenticated — ignore */ }
  },

  addToCart: async (product_id, variant_id, quantity = 1) => {
    set({ isLoading: true });
    try {
      const res = await cartApi.add({ product_id, variant_id, quantity });
      set({ items: res.data.cart, isOpen: true });
    } finally {
      set({ isLoading: false });
    }
  },

  updateItem: async (id, quantity) => {
    const res = await cartApi.update(id, quantity);
    set({ items: res.data.cart });
  },

  removeItem: async (id) => {
    const res = await cartApi.remove(id);
    set({ items: res.data.cart });
  },

  clearCart: () => set({ items: [] }),

  openCart: () => set({ isOpen: true }),
  closeCart: () => set({ isOpen: false }),

  totalItems: () => get().items.reduce((s, i) => s + i.quantity, 0),
  totalPrice: () => get().items.reduce((s, i) => s + (i.offer_price || i.price) * i.quantity, 0),
}));

export default useCartStore;
