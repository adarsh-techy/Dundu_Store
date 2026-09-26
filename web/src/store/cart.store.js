import { create } from 'zustand';
import { cartApi } from '../api';

/** Unit price of a cart row — works for both product rows and combo rows. */
export const cartItemPrice = (i) =>
  Number(i.combo_id ? (i.combo_offer_price || i.combo_price) : (i.offer_price || i.price)) || 0;

export const cartItemName = (i) => (i.combo_id ? i.combo_name : i.name) || 'Item';
export const cartItemImage = (i) => (i.combo_id ? i.combo_image : i.image) || null;

const useCartStore = create((set, get) => ({
  items: [],
  isOpen: false,
  isLoading: false,
  lastAdded: null,

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
      set({ items: res.data.cart, isOpen: true, lastAdded: Date.now() });
    } finally {
      set({ isLoading: false });
    }
  },

  addComboToCart: async (combo_id, combo_selections, quantity = 1) => {
    set({ isLoading: true });
    try {
      const res = await cartApi.add({ combo_id, combo_selections, quantity });
      set({ items: res.data.cart, isOpen: true, lastAdded: Date.now() });
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
  totalPrice: () => get().items.reduce((s, i) => s + cartItemPrice(i) * i.quantity, 0),
}));

export default useCartStore;
