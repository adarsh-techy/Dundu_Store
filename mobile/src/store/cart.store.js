import { create } from 'zustand';
import { cartApi } from '../api/index';
import useFreeShippingStore from './freeShipping.store';

function computeTotals(items) {
  if (!Array.isArray(items)) return { total: 0, count: 0 };
  const total = items.reduce((sum, item) => {
    let validPrice = 0;
    if (item.combo_id) {
      // Combo item — use combo pricing
      const comboOffer = item.combo_offer_price ? parseFloat(item.combo_offer_price) : 0;
      const comboReg   = item.combo_price ? parseFloat(item.combo_price) : 0;
      validPrice = comboOffer > 0 ? comboOffer : comboReg;
    } else {
      // Regular product item
      const oPrice = item.offer_price ? parseFloat(item.offer_price) : 0;
      const rPrice = item.price ? parseFloat(item.price) : (item.product_price ? parseFloat(item.product_price) : 0);
      validPrice = oPrice > 0 ? oPrice : rPrice;
    }
    const qty = parseInt(item.quantity || 1, 10);
    return sum + (validPrice * qty);
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
    if (total > 0 && total < 500) {
      setTimeout(() => {
        useFreeShippingStore.getState().openModal(total);
      }, 300);
    }
  },

  updateItem: async (id, qty) => {
    await cartApi.update(id, qty);
    const res = await cartApi.get();
    const items = res.cart || res.items || [];
    const { total, count } = computeTotals(items);
    set({ items, total, count });
    if (total > 0 && total < 500) {
      setTimeout(() => {
        useFreeShippingStore.getState().openModal(total);
      }, 300);
    }
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
