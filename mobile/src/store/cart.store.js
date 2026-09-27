import { create } from 'zustand';
import { cartApi, settingsApi } from '../api/index';
import useFreeShippingStore from './freeShipping.store';

export const MAX_CART_QTY = 99;

// Server accepts only whole numbers 1..99 for cart quantities.
export function clampQty(qty) {
  const n = parseInt(qty, 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(MAX_CART_QTY, n);
}

// Price/name/image of one cart line, for product rows, combo rows and buy-now items.
// An offer price of 0 / "0.00" means "no offer", never "free".
export function lineUnitPrice(item) {
  if (!item) return 0;
  if (item.combo_id) return Number(item.combo_offer_price) > 0 ? Number(item.combo_offer_price) : Number(item.combo_price) || 0;
  return Number(item.offer_price) > 0 ? Number(item.offer_price) : Number(item.price) || 0;
}
export function lineName(item) {
  if (!item) return 'Item';
  return item.combo_id ? (item.combo_name || 'Combo') : (item.product_name || item.name || 'Product');
}
export function lineImage(item) {
  if (!item) return null;
  return item.combo_id ? item.combo_image : (item.image || item.product_image);
}

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

const useCartStore = create((set, get) => ({
  items: [],
  total: 0,
  count: 0,
  // Mirrors GET /settings/payment (defaults match the server's fallbacks)
  deliveryCharge: 50,
  freeDeliveryThreshold: 500,

  fetchShippingSettings: async () => {
    try {
      const res = await settingsApi.getPayment();
      const s = res?.data && res.data.delivery_charge !== undefined ? res.data : res;
      const charge = Number(s?.delivery_charge);
      const threshold = Number(s?.free_delivery_threshold);
      set({
        deliveryCharge: Number.isFinite(charge) ? Math.max(0, charge) : 50,
        freeDeliveryThreshold: Number.isFinite(threshold) ? Math.max(0, threshold) : 500,
      });
    } catch (_) {
      // keep defaults
    }
  },

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
    const payload = data && data.quantity !== undefined ? { ...data, quantity: clampQty(data.quantity) } : data;
    await cartApi.add(payload);
    const res = await cartApi.get();
    const items = res.cart || res.items || [];
    const { total, count } = computeTotals(items);
    set({ items, total, count });
    const threshold = get().freeDeliveryThreshold;
    if (total > 0 && threshold > 0 && total < threshold) {
      setTimeout(() => {
        useFreeShippingStore.getState().openModal(total);
      }, 300);
    }
  },

  updateItem: async (id, qty) => {
    await cartApi.update(id, clampQty(qty));
    const res = await cartApi.get();
    const items = res.cart || res.items || [];
    const { total, count } = computeTotals(items);
    set({ items, total, count });
    const threshold = get().freeDeliveryThreshold;
    if (total > 0 && threshold > 0 && total < threshold) {
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
