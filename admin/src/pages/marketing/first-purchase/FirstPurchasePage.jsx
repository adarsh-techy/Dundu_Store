import React, { useEffect, useState, useRef } from 'react';
import {
  Tag,
  Plus,
  Trash2,
  Smartphone,
  Save,
  CheckCircle2,
  Sparkles,
  Gift,
  Coins,
  Percent,
  Check,
  ShoppingBag,
  RotateCcw
} from 'lucide-react';
import { firstPurchaseApi } from '../../../api';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Spinner from '../../../components/ui/Spinner';
import toast from 'react-hot-toast';

const DEFAULT_SLABS = [
  { min_order: 0, max_order: 500, discount_amount: 50 },
  { min_order: 500, max_order: 1000, discount_amount: 100 },
  { min_order: 1000, max_order: 1500, discount_amount: 150 },
  { min_order: 1500, max_order: 999999, discount_amount: 200 },
];

const TIER_COLORS = [
  {
    border: 'border-l-4 border-l-emerald-500 border-slate-200/80',
    bg: 'bg-gradient-to-r from-emerald-50/70 via-white to-white',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    discountColor: 'text-emerald-700',
    tag: 'Starter Tier'
  },
  {
    border: 'border-l-4 border-l-indigo-500 border-slate-200/80',
    bg: 'bg-gradient-to-r from-indigo-50/70 via-white to-white',
    badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    discountColor: 'text-indigo-700',
    tag: 'Silver Tier'
  },
  {
    border: 'border-l-4 border-l-amber-500 border-slate-200/80',
    bg: 'bg-gradient-to-r from-amber-50/70 via-white to-white',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    discountColor: 'text-amber-700',
    tag: 'Gold Tier'
  },
  {
    border: 'border-l-4 border-l-rose-500 border-slate-200/80',
    bg: 'bg-gradient-to-r from-rose-50/70 via-white to-white',
    badge: 'bg-rose-100 text-rose-800 border-rose-200',
    discountColor: 'text-rose-700',
    tag: 'Platinum Tier'
  },
  {
    border: 'border-l-4 border-l-purple-500 border-slate-200/80',
    bg: 'bg-gradient-to-r from-purple-50/70 via-white to-white',
    badge: 'bg-purple-100 text-purple-800 border-purple-200',
    discountColor: 'text-purple-700',
    tag: 'Diamond Tier'
  },
];

export default function FirstPurchasePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sampleCart, setSampleCart] = useState(750);

  const initialDataRef = useRef(null);

  const [data, setData] = useState({
    enabled: true,
    discount_amount: 100,
    min_order: 0,
    coupon_code: 'WELCOME100',
    auto_apply: true,
    title: '1st Order Welcome Discount',
    subtitle: 'Special welcome savings automatically applied on your first order!',
    slabs: DEFAULT_SLABS,
  });

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await firstPurchaseApi.get();
      const resData = res.data || res;
      const cleanData = {
        enabled: resData.enabled !== false,
        discount_amount: Number(resData.discount_amount ?? 100),
        min_order: Number(resData.min_order ?? 0),
        coupon_code: resData.coupon_code || 'WELCOME100',
        auto_apply: resData.auto_apply !== false,
        title: (resData.title || '1st Order Welcome Discount').replace(/^[^\w\s]+/, '').trim(),
        subtitle: resData.subtitle || 'Special welcome savings automatically applied on your first order!',
        slabs: resData.slabs && resData.slabs.length > 0 ? resData.slabs : DEFAULT_SLABS,
      };
      setData(cleanData);
      initialDataRef.current = JSON.stringify(cleanData);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  // Track if user made changes
  const isDirty = initialDataRef.current !== null && JSON.stringify({
    enabled: data.enabled,
    discount_amount: data.discount_amount,
    min_order: data.min_order,
    coupon_code: data.coupon_code,
    auto_apply: data.auto_apply,
    title: data.title,
    subtitle: data.subtitle,
    slabs: data.slabs,
  }) !== initialDataRef.current;

  const handleDiscard = () => {
    if (initialDataRef.current) {
      setData(JSON.parse(initialDataRef.current));
      toast('Changes discarded', { icon: '↩️' });
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      await firstPurchaseApi.update(data);
      toast.success('Welcome offer settings saved!');
      initialDataRef.current = JSON.stringify({
        enabled: data.enabled,
        discount_amount: data.discount_amount,
        min_order: data.min_order,
        coupon_code: data.coupon_code,
        auto_apply: data.auto_apply,
        title: data.title,
        subtitle: data.subtitle,
        slabs: data.slabs,
      });
      fetchConfig();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSlab = () => {
    const currentSlabs = data.slabs || [];
    const lastSlab = currentSlabs[currentSlabs.length - 1];
    const newMin = lastSlab
      ? lastSlab.max_order < 999999
        ? lastSlab.max_order
        : lastSlab.min_order + 500
      : 0;
    const newMax = newMin + 500;
    const newDiscount = lastSlab ? lastSlab.discount_amount + 50 : 50;

    setData((prev) => ({
      ...prev,
      slabs: [
        ...currentSlabs,
        { min_order: newMin, max_order: newMax, discount_amount: newDiscount },
      ],
    }));
  };

  const handleUpdateSlab = (index, field, value) => {
    const updatedSlabs = [...(data.slabs || [])];
    updatedSlabs[index] = {
      ...updatedSlabs[index],
      [field]: value,
    };
    setData((prev) => ({ ...prev, slabs: updatedSlabs }));
  };

  const handleRemoveSlab = (index) => {
    if ((data.slabs || []).length <= 1) {
      toast.error('You must keep at least 1 discount tier.');
      return;
    }
    const updatedSlabs = (data.slabs || []).filter((_, i) => i !== index);
    setData((prev) => ({ ...prev, slabs: updatedSlabs }));
  };

  // Sample preview calculations (based on sampleCart)
  const matchedSlab = (data.slabs || []).find(
    (s) => sampleCart >= s.min_order && sampleCart < s.max_order
  );
  const sampleDiscount = data.enabled
    ? matchedSlab
      ? matchedSlab.discount_amount
      : data.discount_amount || 0
    : 0;
  const samplePayable = Math.max(0, sampleCart - sampleDiscount);

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-16">
      {/* Colorful Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 p-6 sm:p-7 rounded-3xl border border-purple-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-3 py-1 rounded-full shadow-xs">
              <Sparkles className="h-3 w-3" />
              1st Purchase Rewards
            </span>
            {data.enabled ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-1 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Live in Store
              </span>
            ) : (
              <span className="text-xs font-bold text-slate-500 bg-slate-200/80 px-2.5 py-1 rounded-full">
                Offer Disabled
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-2">
            1st Purchase Welcome Offer
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Reward new shoppers with tiered cart discounts and instant savings.
          </p>
        </div>

        {/* Header Action: Save button appears when user makes changes, with green bg and white text */}
        <div className="flex items-center gap-3">
          {isDirty && (
            <button
              type="button"
              onClick={handleDiscard}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border border-slate-300 text-slate-700 bg-white font-semibold text-xs hover:bg-slate-50 transition-colors shadow-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Discard
            </button>
          )}

          {isDirty ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer animate-fadeIn"
            >
              <Save className="h-4 w-4 text-white" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white border border-slate-200 text-slate-500 text-xs font-semibold shadow-xs">
              <Check className="h-3.5 w-3.5 text-blue-600" />
              Saved
            </div>
          )}
        </div>
      </div>

      {/* Main Dual Pane Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Setup & Slabs Form (7 cols) */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-6">
          
          {/* Card 1: Activation & Offer Details */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-5">
            {/* Enable switch */}
            <div className="flex items-center justify-between pb-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
                  <Gift className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-base">Enable Welcome Discount</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Automatically apply discount when a new buyer checks out
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setData((p) => ({ ...p, enabled: !p.enabled }))}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${
                  data.enabled ? 'bg-emerald-500' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                    data.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Coupon Code Pill */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Coupon Code
              </label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-500" />
                  <Input
                    value={data.coupon_code}
                    onChange={(e) => setData({ ...data, coupon_code: e.target.value.toUpperCase() })}
                    placeholder="WELCOME100"
                    className="pl-10 font-mono text-sm uppercase font-bold text-purple-900 border-purple-200 bg-purple-50/30 focus:border-purple-500"
                    required
                  />
                </div>
                <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-3 py-2 rounded-xl">
                  1st Order Only
                </span>
              </div>
            </div>

            {/* Headline */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Banner Headline
              </label>
              <Input
                value={data.title}
                onChange={(e) => setData({ ...data, title: e.target.value })}
                placeholder="e.g. 1st Order Welcome Discount"
                className="font-semibold text-slate-900"
                required
              />
            </div>

            {/* Subtitle */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Banner Subtitle
              </label>
              <Input
                value={data.subtitle}
                onChange={(e) => setData({ ...data, subtitle: e.target.value })}
                placeholder="e.g. Special welcome savings automatically applied on your first order!"
                className="text-slate-700 text-sm"
                required
              />
            </div>
          </div>

          {/* Card 2: Colorful Tier Slabs */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-xs">
                  <Coins className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Discount Tiers</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Reward higher cart spend with bigger discounts
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddSlab}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-xs hover:opacity-95 transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Tier
              </button>
            </div>

            {/* Slabs List with Distinct Color Accents */}
            <div className="space-y-3 pt-1">
              {(data.slabs || []).map((slab, idx) => {
                const colorConfig = TIER_COLORS[idx % TIER_COLORS.length];
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 p-4 rounded-2xl border ${colorConfig.border} ${colorConfig.bg} shadow-xs transition-all`}
                  >
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                      {/* Min Cart */}
                      <div>
                        <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                          Min Cart (₹)
                        </span>
                        <Input
                          type="number"
                          min="0"
                          value={slab.min_order}
                          onChange={(e) =>
                            handleUpdateSlab(idx, 'min_order', parseFloat(e.target.value) || 0)
                          }
                          className="w-full text-xs font-bold bg-white"
                        />
                      </div>

                      {/* Max Cart */}
                      <div>
                        <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                          Max Cart (₹)
                        </span>
                        <Input
                          type="number"
                          min="0"
                          value={slab.max_order}
                          onChange={(e) =>
                            handleUpdateSlab(idx, 'max_order', parseFloat(e.target.value) || 0)
                          }
                          className="w-full text-xs font-bold bg-white"
                        />
                      </div>

                      {/* Discount Amount */}
                      <div>
                        <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                          Discount (₹ OFF)
                        </span>
                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            value={slab.discount_amount}
                            onChange={(e) =>
                              handleUpdateSlab(idx, 'discount_amount', parseFloat(e.target.value) || 0)
                            }
                            className={`w-full text-sm font-black bg-white ${colorConfig.discountColor}`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Delete action */}
                    <button
                      type="button"
                      onClick={() => handleRemoveSlab(idx)}
                      title="Remove Tier"
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-100/70 transition-colors shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-slate-500 pt-1">
              Shoppers cart total automatically unlocks the matching tier discount at checkout.
            </p>
          </div>

          {/* Bottom Save Action: Only shows when changes are made, with Blue background and White text */}
          {isDirty && (
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-blue-950">You have unsaved changes</p>
                  <p className="text-[11px] text-blue-700">Click below to publish the updated discount slabs.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleDiscard}
                  className="px-4 py-2.5 rounded-xl border border-blue-300 text-blue-800 bg-white font-semibold text-xs hover:bg-blue-100/50 transition-colors"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Save className="h-4 w-4 text-white" />
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Right: Vibrant Customer Mobile Preview (5 cols) */}
        <div className="lg:col-span-5 sticky top-6 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center">
            <div className="w-full flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-purple-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Live Customer Preview
                </span>
              </div>
              <span className="text-[11px] font-bold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full">
                1st Order Customer
              </span>
            </div>

            {/* Smartphone Mockup */}
            <div className="my-6 relative w-[290px] h-[540px] rounded-[42px] border-[9px] border-slate-900 shadow-2xl overflow-hidden bg-slate-950 flex flex-col justify-between p-4 text-left">
              {/* Top Speaker Notch */}
              <div className="w-20 h-4 bg-slate-900 rounded-full mx-auto" />

              {/* Mobile App Screen Content */}
              <div className="w-full bg-slate-100 rounded-2xl p-3.5 space-y-3 shadow-inner my-auto text-slate-900">
                {/* Store Header */}
                <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider text-center border-b border-slate-200/80 pb-1.5">
                  DUNDU STORE CHECKOUT
                </div>

                {/* Vibrant Gradient Welcome Banner */}
                {data.enabled ? (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-pink-500 text-white shadow-md space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-sm text-yellow-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Sparkles className="h-2.5 w-2.5 text-yellow-300" />
                        1st Order Gift
                      </span>
                      <span className="font-mono text-[10px] font-bold bg-amber-400 text-slate-950 px-2 py-0.5 rounded-md shadow-xs">
                        {data.coupon_code}
                      </span>
                    </div>
                    <p className="text-xs font-bold leading-tight drop-shadow-xs">{data.title}</p>
                    <p className="text-[11px] text-purple-100 leading-tight opacity-90">{data.subtitle}</p>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-200 text-slate-500 text-center text-xs font-semibold">
                    1st Purchase Offer is currently disabled
                  </div>
                )}

                {/* Checkout Summary Card */}
                <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Order Subtotal</span>
                    <span className="font-semibold text-slate-900">₹{sampleCart}</span>
                  </div>

                  {data.enabled && sampleDiscount > 0 && (
                    <div className="flex items-center justify-between text-emerald-800 font-bold bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                      <span className="flex items-center gap-1.5">
                        <Tag className="h-3 w-3 text-emerald-600" />
                        1st Order Discount
                      </span>
                      <span className="text-emerald-700 font-black">-₹{sampleDiscount}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-slate-500">
                    <span>Delivery Fee</span>
                    <span className="font-bold text-emerald-600">FREE</span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between font-black text-sm text-slate-900">
                    <span>Total Amount</span>
                    <span className="text-base text-slate-900 font-black">₹{samplePayable}</span>
                  </div>
                </div>

                {/* Savings Pill */}
                {data.enabled && sampleDiscount > 0 && (
                  <div className="text-center">
                    <span className="inline-block text-[11px] font-black text-emerald-800 bg-emerald-100 px-3.5 py-1 rounded-full border border-emerald-300 shadow-2xs">
                      Customer saves ₹{sampleDiscount} today!
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom Home Indicator */}
              <div className="w-24 h-1 bg-slate-800 rounded-full mx-auto" />
            </div>

            {/* Colorful Interactive Cart Slider */}
            <div className="w-full bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4 border border-purple-100 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-purple-900">Test Cart Subtotal:</span>
                <span className="font-mono font-extrabold text-sm text-purple-700 bg-white px-2 py-0.5 rounded-lg border border-purple-200">
                  ₹{sampleCart}
                </span>
              </div>
              <input
                type="range"
                min="200"
                max="3000"
                step="50"
                value={sampleCart}
                onChange={(e) => setSampleCart(parseInt(e.target.value, 10))}
                className="w-full accent-purple-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-bold text-purple-400">
                <span>₹200</span>
                <span>₹1,500</span>
                <span>₹3,000</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
