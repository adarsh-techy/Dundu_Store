import { create } from 'zustand';
import { cartApi } from '../api/index';

function computeTotals(items) {
  if (!Array.isArray(items)) return { total: 0, count: 0 };
  const total = items.reduce((sum, item) => {
    const price = parseFloat(item.offer_price || item.price || 0);
    const qty = parseInt(item.quantity || 1, 10);
    return sum + price * qty;
  }, 0);
  const count = items.reduce((sum, item) => sum + parseInt(item.quantity || 1, 10), 0);
  return { total, count };
}

const useCartStore = create((set) => ({
  items: [],
  total: 0,
  count: 0,

  fetchCart: async () => {
    try {
      const res = await cartApi.get();
      const items = res.cart || res.items || [];
      const { total, count } = computeTotals(items);
      set({ items, total, count });
    } catch (error) {
      // fail silently — user might not be authenticated
    }
  },

  addItem: async (data) => {
    await cartApi.add(data);
    const res = await cartApi.get();
    const items = res.cart || res.items || [];
    const { total, count } = computeTotals(items);
    set({ items, total, count });
  },

  updateItem: async (id, qty) => {
    await cartApi.update(id, qty);
    const res = await cartApi.get();
    const items = res.cart || res.items || [];
    const { total, count } = computeTotals(items);
    set({ items, total, count });
  },

  removeItem: async (id) => {
    await cartApi.remove(id);
    const res = await cartApi.get();
    const items = res.cart || res.items || [];
    const { total, count } = computeTotals(items);
    set({ items, total, count });
  },

  clearCart: async () => {
    await cartApi.clear();
    set({ items: [], total: 0, count: 0 });
  },

  resetCart: () => {
    set({ items: [], total: 0, count: 0 });
  },
}));

export default useCartStore;
