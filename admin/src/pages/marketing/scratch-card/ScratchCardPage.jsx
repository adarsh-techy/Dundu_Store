import React, { useEffect, useState, useRef } from 'react';
import {
  Gift,
  Trophy,
  History,
  CheckCircle2,
  Plus,
  Edit3,
  Trash2,
  Search,
  RotateCcw,
  X,
  ChevronLeft,
  ChevronRight,
  Save,
  Smartphone,
  Copy,
  Check,
  Sparkles,
  Coins,
  Tag,
  Zap,
  ShoppingBag,
  Percent,
  Award
} from 'lucide-react';
import { scratchCardApi } from '../../../api';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Spinner from '../../../components/ui/Spinner';
import toast from 'react-hot-toast';

export default function ScratchCardPage() {
  const [activeTab, setActiveTab] = useState('settings'); // 'settings' | 'prizes' | 'logs'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const initialDataRef = useRef(null);

  const [data, setData] = useState({
    enabled: true,
    min_order: 499,
    payment_methods: 'all',
    auto_grant: true,
    title: 'Scratch & Win Guaranteed Rewards',
    subtitle: 'Scratch the card to reveal your instant discount prize!',
    foil_color: '#C0C0C0',
    min_orders: 0,
    active_from: '',
    active_until: '',
    max_per_day: 1,
    cooldown_hours: 24,
    total_scratches: 0,
    prizes: [],
  });

  // Simulator state
  const [isScratched, setIsScratched] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Logs state
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logSearch, setLogSearch] = useState('');

  // Prize modal state
  const [prizeModalOpen, setPrizeModalOpen] = useState(false);
  const [editingPrize, setEditingPrize] = useState(null);
  const [prizeForm, setPrizeForm] = useState({
    label: '',
    type: 'coupon',
    value: 100,
    coupon_code: '',
    color: '#4C1D95',
    text_color: '#FFFFFF',
    probability: 25,
    is_active: true,
  });

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await scratchCardApi.getConfig();
      const resData = res.data || res;
      setData(resData);
      initialDataRef.current = JSON.stringify({
        enabled: resData.enabled !== false,
        min_order: resData.min_order,
        payment_methods: resData.payment_methods || 'all',
        title: resData.title || '',
        subtitle: resData.subtitle || '',
        min_orders: resData.min_orders || 0,
        max_per_day: resData.max_per_day || 1,
      });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load scratch card configuration.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (pageNo = 1) => {
    try {
      setLogsLoading(true);
      const res = await scratchCardApi.getLogs({ page: pageNo });
      const resData = res.data || res;
      setLogs(resData.logs || []);
      setLogsPage(pageNo);
    } catch {
      // silent
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs(logsPage);
    }
  }, [activeTab, logsPage]);

  // Dirty state tracking: true if user changed any setting
  const isDirty = initialDataRef.current !== null && JSON.stringify({
    enabled: data.enabled !== false,
    min_order: data.min_order,
    payment_methods: data.payment_methods || 'all',
    title: data.title || '',
    subtitle: data.subtitle || '',
    min_orders: data.min_orders || 0,
    max_per_day: data.max_per_day || 1,
  }) !== initialDataRef.current;

  const handleDiscard = () => {
    if (initialDataRef.current) {
      const parsed = JSON.parse(initialDataRef.current);
      setData((prev) => ({
        ...prev,
        ...parsed,
      }));
      toast('Changes discarded', { icon: '↩️' });
    }
  };

  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      await scratchCardApi.updateSettings(data);
      toast.success('Scratch card settings saved!');
      initialDataRef.current = JSON.stringify({
        enabled: data.enabled !== false,
        min_order: data.min_order,
        payment_methods: data.payment_methods || 'all',
        title: data.title || '',
        subtitle: data.subtitle || '',
        min_orders: data.min_orders || 0,
        max_per_day: data.max_per_day || 1,
      });
      fetchConfig();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const openAddPrizeModal = () => {
    setEditingPrize(null);
    setPrizeForm({
      label: '',
      type: 'coupon',
      value: 100,
      coupon_code: '',
      color: '#4C1D95',
      text_color: '#FFFFFF',
      probability: 25,
      is_active: true,
    });
    setPrizeModalOpen(true);
  };

  const openEditPrizeModal = (prize) => {
    setEditingPrize(prize);
    setPrizeForm({
      label: prize.label,
      type: prize.type,
      value: prize.value,
      coupon_code: prize.coupon_code || '',
      color: prize.color || '#4C1D95',
      text_color: prize.text_color || '#FFFFFF',
      probability: prize.probability || 10,
      is_active: prize.is_active !== false,
    });
    setPrizeModalOpen(true);
  };

  const handleSavePrize = async (e) => {
    e.preventDefault();
    try {
      if (editingPrize) {
        await scratchCardApi.updatePrize(editingPrize.id, prizeForm);
        toast.success('Prize card updated!');
      } else {
        await scratchCardApi.createPrize(prizeForm);
        toast.success('Prize card created!');
      }
      setPrizeModalOpen(false);
      fetchConfig();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save prize.');
    }
  };

  const handleDeletePrize = async (id) => {
    if (!window.confirm('Delete this prize card from the pool?')) return;
    try {
      await scratchCardApi.deletePrize(id);
      toast.success('Prize card removed.');
      fetchConfig();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete prize.');
    }
  };

  const samplePrize = data.prizes?.[0] || {
    label: '₹100 Cashback Voucher',
    coupon_code: 'SCRATCH100',
    type: 'coupon',
    value: 100,
  };

  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Filter logs by search term
  const filteredLogs = logs.filter((log) => {
    if (!logSearch) return true;
    const q = logSearch.toLowerCase();
    return (
      (log.user_name && log.user_name.toLowerCase().includes(q)) ||
      (log.phone && log.phone.includes(q)) ||
      (log.prize_label && log.prize_label.toLowerCase().includes(q)) ||
      (log.coupon_code && log.coupon_code.toLowerCase().includes(q))
    );
  });

  const totalPrizeProbability = (data.prizes || []).reduce(
    (sum, p) => sum + (Number(p.probability) || 0),
    0
  );

  // Color theme presets for prize cards
  const colorThemes = [
    { name: 'Cosmic Violet', bg: '#4C1D95', text: '#FFFFFF', gradient: 'from-purple-900 to-indigo-950' },
    { name: 'Royal Gold', bg: '#78350F', text: '#FFFFFF', gradient: 'from-amber-800 to-yellow-950' },
    { name: 'Emerald Fortune', bg: '#064E3B', text: '#FFFFFF', gradient: 'from-emerald-900 to-teal-950' },
    { name: 'Neon Rose', bg: '#831843', text: '#FFFFFF', gradient: 'from-pink-900 to-rose-950' },
    { name: 'Electric Sapphire', bg: '#1E3A8A', text: '#FFFFFF', gradient: 'from-blue-900 to-cyan-950' },
  ];

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-16">
      {/* Colorful Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-violet-600/15 via-pink-500/15 to-amber-500/15 p-6 sm:p-7 rounded-3xl border border-purple-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white px-3 py-1 rounded-full shadow-xs">
              <Sparkles className="h-3 w-3" />
              Gamified Checkout Rewards
            </span>
            {data.enabled ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-1 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Live in App & Web
              </span>
            ) : (
              <span className="text-xs font-bold text-slate-500 bg-slate-200/80 px-2.5 py-1 rounded-full">
                Offer Disabled
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-2">
            Scratch & Win Cards
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Reward customers with dynamic digital scratch cards for placing orders.
          </p>
        </div>

        {/* Header Action: Save button appears on change with blue background and white text */}
        <div className="flex items-center gap-3">
          {isDirty && (
            <button
              type="button"
              onClick={handleDiscard}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border border-slate-300 text-slate-700 bg-white font-semibold text-xs hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Discard
            </button>
          )}

          {isDirty ? (
            <button
              type="button"
              onClick={handleSaveSettings}
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

      {/* Colorful Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Scratched Cards */}
        <div className="bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-white rounded-3xl p-5 border border-purple-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">
              Total Scratches
            </span>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {Number(data.total_scratches || 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-purple-600/80 font-medium">Customer scratch events</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
            <Gift className="h-6 w-6" />
          </div>
        </div>

        {/* KPI 2: Active Prize Pool */}
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white rounded-3xl p-5 border border-amber-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              Active Prizes
            </span>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {(data.prizes || []).length} Cards
            </div>
            <p className="text-[11px] text-amber-600/80 font-medium">
              {totalPrizeProbability}% total win pool
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
            <Trophy className="h-6 w-6" />
          </div>
        </div>

        {/* KPI 3: Min Order Spend */}
        <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-white rounded-3xl p-5 border border-emerald-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Min Order Value
            </span>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              ₹{data.min_order}
            </div>
            <p className="text-[11px] text-emerald-600/80 font-medium">Threshold to earn card</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <ShoppingBag className="h-6 w-6" />
          </div>
        </div>

        {/* KPI 4: Daily Limit & Modes */}
        <div className="bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-white rounded-3xl p-5 border border-blue-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              Daily Limit
            </span>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {data.max_per_day} Card / Day
            </div>
            <p className="text-[11px] text-blue-600/80 font-medium capitalize">
              {data.payment_methods === 'all' ? 'All payment modes' : data.payment_methods.replace('_', ' ')}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Zap className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Colorful Tabs Bar */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap gap-2 max-w-fit">
        {[
          {
            id: 'settings',
            label: 'Offer Settings & Studio',
            icon: Gift,
            activeClass: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20',
          },
          {
            id: 'prizes',
            label: `Prize Rewards (${(data.prizes || []).length})`,
            icon: Trophy,
            activeClass: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20',
          },
          {
            id: 'logs',
            label: `Winners History (${data.total_scratches || 0})`,
            icon: History,
            activeClass: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20',
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                active
                  ? tab.activeClass
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: SETTINGS & PREVIEW */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Setup & Eligibility Form (7 cols) */}
          <form onSubmit={handleSaveSettings} className="lg:col-span-7 space-y-6">
            
            {/* Card 1: Main Toggle & Card Copy */}
            <div className="bg-white rounded-3xl border border-purple-200/60 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-sm shadow-purple-500/20">
                    <Gift className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-base">Enable Scratch Card Offer</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Show scratch card popups to eligible shoppers on checkout & order confirmation
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setData((p) => ({ ...p, enabled: !p.enabled }))}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
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

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Card Heading Title
                </label>
                <Input
                  value={data.title}
                  onChange={(e) => setData({ ...data, title: e.target.value })}
                  placeholder="e.g. Scratch & Win Guaranteed Rewards"
                  className="font-bold text-slate-900 border-slate-200 focus:border-purple-500 focus:ring-purple-200"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Card Subtitle (Instruction)
                </label>
                <Input
                  value={data.subtitle}
                  onChange={(e) => setData({ ...data, subtitle: e.target.value })}
                  placeholder="e.g. Scratch the card to reveal your instant discount prize!"
                  className="text-slate-700 text-sm border-slate-200 focus:border-purple-500 focus:ring-purple-200"
                  required
                />
              </div>
            </div>

            {/* Card 2: Simple Eligibility */}
            <div className="bg-white rounded-3xl border border-amber-200/60 p-6 shadow-sm space-y-5">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
                <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-500/20">
                  <Coins className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Who Gets a Scratch Card?</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Define order amount and customer milestone rules
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Minimum Order Value (₹)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={data.min_order}
                    onChange={(e) => setData({ ...data, min_order: parseFloat(e.target.value) || 0 })}
                    placeholder="499"
                    className="font-bold text-slate-900 border-slate-200 focus:border-amber-500 focus:ring-amber-200"
                    required
                  />
                  <p className="text-xs text-slate-400 mt-1">Minimum cart spend required to earn a card</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Customer Milestone
                  </label>
                  <select
                    value={data.min_orders}
                    onChange={(e) => setData({ ...data, min_orders: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                  >
                    <option value={0}>All Customers (Any Order)</option>
                    <option value={1}>After 1 Completed Order</option>
                    <option value={2}>After 2 Completed Orders</option>
                    <option value={3}>After 3 Completed Orders</option>
                    <option value={5}>After 5 Completed Orders</option>
                  </select>
                  <p className="text-xs text-slate-400 mt-1">When customer unlocks the card</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Max Scratches Per Day
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={data.max_per_day}
                    onChange={(e) => setData({ ...data, max_per_day: parseInt(e.target.value, 10) || 1 })}
                    className="font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Payment Method
                  </label>
                  <select
                    value={data.payment_methods}
                    onChange={(e) => setData({ ...data, payment_methods: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                  >
                    <option value="all">All Modes (Prepaid & COD)</option>
                    <option value="prepaid_only">Online Payments Only</option>
                    <option value="cod_only">COD Only</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Bottom Save Action: Shows only when dirty, with Blue background and White text */}
            {isDirty && (
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-blue-950">You have unsaved changes</p>
                    <p className="text-[11px] text-blue-700">Click below to publish the updated scratch settings.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleDiscard}
                    className="px-4 py-2.5 rounded-xl border border-blue-300 text-blue-800 bg-white font-semibold text-xs hover:bg-blue-100/50 transition-colors cursor-pointer"
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

          {/* Right: Vibrant Live Scratch Card Mockup (5 cols) */}
          <div className="lg:col-span-5 sticky top-6">
            <div className="relative bg-white rounded-3xl border border-purple-200/80 p-6 shadow-sm flex flex-col items-center overflow-hidden">
              {/* Colorful Background Aura */}
              <div className="absolute -top-16 -right-16 w-52 h-52 bg-gradient-to-br from-amber-400/20 via-pink-400/20 to-purple-500/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-16 -left-16 w-52 h-52 bg-gradient-to-tr from-purple-400/20 via-indigo-400/20 to-teal-400/20 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 w-full flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                    <Smartphone className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Interactive Phone Preview
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsScratched(!isScratched)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50 text-xs font-bold text-purple-700 hover:bg-purple-100 transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  {isScratched ? 'Reset Foil' : 'Scratch Card'}
                </button>
              </div>

              {/* Smartphone Frame with Cosmic Gradient Screen */}
              <div className="relative z-10 my-6 w-[280px] h-[520px] rounded-[40px] border-[8px] border-slate-900 shadow-2xl overflow-hidden bg-gradient-to-b from-slate-950 via-indigo-950 to-purple-950 flex flex-col justify-between p-5 text-center text-white">
                {/* Speaker Notch */}
                <div className="w-20 h-4 bg-slate-900 rounded-full mx-auto" />

                <div className="w-full space-y-4 my-auto">
                  <div className="space-y-1.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 text-slate-950 px-2.5 py-0.5 rounded-full shadow-md">
                      <Sparkles className="h-2.5 w-2.5" />
                      Guaranteed Reward
                    </span>
                    <h3 className="text-sm font-extrabold text-white leading-snug">
                      {data.title}
                    </h3>
                    <p className="text-xs text-purple-200/80 leading-relaxed px-1">
                      {data.subtitle}
                    </p>
                  </div>

                  {/* Foil Scratch Card Container */}
                  <div
                    onClick={() => setIsScratched(!isScratched)}
                    className="relative w-full h-48 rounded-2xl cursor-pointer overflow-hidden border border-amber-400/40 shadow-xl select-none group transition-transform active:scale-98"
                  >
                    {!isScratched ? (
                      /* Holographic Metallic Gold Foil Layer */
                      <div className="absolute inset-0 bg-gradient-to-tr from-amber-200 via-yellow-100 to-amber-300 flex flex-col items-center justify-center p-4">
                        <div className="absolute inset-0 bg-radial from-white/40 via-transparent to-amber-400/30 opacity-60 pointer-events-none" />
                        <div className="relative w-12 h-12 rounded-full bg-white/95 border-2 border-amber-300 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Gift className="h-6 w-6 text-amber-600" />
                        </div>
                        <p className="relative text-xs font-black text-slate-900 tracking-wider uppercase mt-3">
                          Tap to Scratch
                        </p>
                        <span className="relative text-[10px] font-bold text-amber-900 bg-amber-200/80 px-2.5 py-0.5 rounded-full mt-1">
                          Reveal Instant Prize
                        </span>
                      </div>
                    ) : (
                      /* Vibrant Revealed Celebratory Prize Card */
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-950 text-white flex flex-col items-center justify-center p-4 border border-amber-400/50 animate-fadeIn">
                        <div className="absolute -top-6 -right-6 w-20 h-20 bg-amber-400/20 rounded-full blur-xl pointer-events-none" />
                        <span className="text-[10px] font-black text-amber-300 uppercase tracking-widest bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 rounded-full mb-1">
                          Congratulations!
                        </span>
                        <Trophy className="h-8 w-8 text-amber-400 my-1 drop-shadow-md animate-bounce" />
                        <p className="text-xs font-extrabold text-white text-center leading-tight">
                          {samplePrize.label}
                        </p>
                        {samplePrize.coupon_code && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyCode(samplePrize.coupon_code);
                            }}
                            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-mono text-xs font-black tracking-wider transition-colors shadow-md cursor-pointer"
                          >
                            <span>{samplePrize.coupon_code}</span>
                            {copiedCode ? <Check className="h-3 w-3 text-emerald-800" /> : <Copy className="h-3 w-3 opacity-70" />}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-purple-200/70 font-medium">
                    {isScratched ? 'Click card to reset simulation' : 'Click the foil card to scratch & reveal'}
                  </p>
                </div>

                {/* Bottom Bar */}
                <div className="w-24 h-1 bg-slate-800 rounded-full mx-auto" />
              </div>

              {/* Quick Summary Pill below Phone */}
              <div className="relative z-10 w-full bg-gradient-to-r from-purple-50 via-pink-50 to-amber-50 rounded-2xl p-3.5 border border-purple-100 flex items-center justify-between text-xs text-slate-700 font-bold">
                <span className="flex items-center gap-1.5 text-purple-900">
                  <ShoppingBag className="h-3.5 w-3.5 text-purple-600" />
                  Min spend: ₹{data.min_order}
                </span>
                <span className="flex items-center gap-1.5 text-amber-900">
                  <Zap className="h-3.5 w-3.5 text-amber-600" />
                  Max {data.max_per_day} per day
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRIZE REWARDS */}
      {activeTab === 'prizes' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-purple-500/10 p-6 rounded-3xl border border-amber-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                  Reward Pool
                </span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  totalPrizeProbability === 100
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}>
                  Total Odds: {totalPrizeProbability}%
                </span>
              </div>
              <h2 className="text-lg font-extrabold text-slate-900 mt-1">Prize Reward Cards</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Manage discounts, coupons, vouchers, and the probability of winning each card.
              </p>
            </div>

            <Button
              type="button"
              onClick={openAddPrizeModal}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add Prize Card
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {(data.prizes || []).map((prize) => {
              const isCoupon = prize.type === 'coupon';
              const isCashback = prize.type === 'cashback';
              const isFreeShipping = prize.type === 'free_shipping';

              const badgeColor = isCoupon
                ? 'bg-purple-100 text-purple-800 border-purple-200'
                : isCashback
                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                : isFreeShipping
                ? 'bg-sky-100 text-sky-800 border-sky-200'
                : 'bg-slate-100 text-slate-700 border-slate-200';

              return (
                <div
                  key={prize.id}
                  className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-4 hover:shadow-md hover:border-purple-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border ${badgeColor}`}>
                        {prize.type.replace('_', ' ')}
                      </span>
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                        {prize.probability}% Chance
                      </span>
                    </div>

                    {/* Rich Styled Prize Card Body */}
                    <div
                      className="relative overflow-hidden p-4 rounded-2xl flex flex-col justify-between h-32 shadow-sm"
                      style={{
                        backgroundColor: prize.color || '#4C1D95',
                        color: prize.text_color || '#FFFFFF',
                      }}
                    >
                      {/* Holographic Gloss Line */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />

                      <div className="flex items-start justify-between gap-2">
                        <p className="font-extrabold text-sm leading-snug line-clamp-2">
                          {prize.label}
                        </p>
                        <Trophy className="h-5 w-5 text-amber-300 shrink-0" />
                      </div>

                      <div className="flex items-end justify-between pt-2 border-t border-white/15">
                        {prize.coupon_code ? (
                          <div className="flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded-lg bg-white/20 backdrop-blur-xs font-bold tracking-wider">
                            <Tag className="h-3 w-3 text-amber-300" />
                            <span>{prize.coupon_code}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] opacity-80 font-medium">Auto-applied</span>
                        )}
                        <span className="text-base font-black text-amber-300">
                          {prize.value ? `₹${prize.value}` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Win Chance Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold text-slate-500">
                        <span>Pool Odds</span>
                        <span>{prize.probability}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-amber-500 to-orange-500 h-1.5 rounded-full"
                          style={{ width: `${Math.min(100, prize.probability)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openEditPrizeModal(prize)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-purple-600" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePrize(prize.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: WINNERS HISTORY */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-white">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                  Live Audit Log
                </span>
                <span className="text-xs font-bold text-slate-600">
                  {data.total_scratches || 0} Total Claims
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-1">Recent Scratched Cards</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time log of shoppers who scratched cards and the prizes they unlocked.
              </p>
            </div>

            <div className="relative min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Search customer, phone, code..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
            </div>
          </div>

          {logsLoading ? (
            <div className="py-20 flex justify-center"><Spinner size="lg" /></div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              No scratch card history found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-3.5 px-6">Customer</th>
                    <th className="py-3.5 px-6">Reward Won</th>
                    <th className="py-3.5 px-6">Coupon Code</th>
                    <th className="py-3.5 px-6 text-right">Revealed Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((log) => {
                    const initials = (log.user_name || 'Customer')
                      .split(' ')
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase();

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                              {initials}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{log.user_name || 'Customer'}</p>
                              <p className="text-xs text-slate-400 font-mono">{log.phone || '-'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-2">
                            <div className="p-1 rounded-lg bg-amber-100 text-amber-700">
                              <Trophy className="h-3.5 w-3.5" />
                            </div>
                            <span className="font-bold text-slate-900">{log.prize_label}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-6">
                          {log.coupon_code ? (
                            <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 font-bold border border-purple-200">
                              {log.coupon_code}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-6 text-right text-xs text-slate-500 font-medium">
                          {new Date(log.scratched_at).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Page {logsPage}</span>
            <div className="flex items-center gap-2">
              <button
                disabled={logsPage <= 1}
                onClick={() => setLogsPage((p) => p - 1)}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={logs.length < 20}
                onClick={() => setLogsPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Prize Modal */}
      {prizeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-3xl border border-purple-200 shadow-2xl p-6 space-y-5 animate-scaleIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                  <Trophy className="h-4 w-4" />
                </div>
                <h3 className="font-extrabold text-base text-slate-900">
                  {editingPrize ? 'Edit Prize Card' : 'Add New Prize Card'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPrizeModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSavePrize} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Prize Title
                </label>
                <Input
                  value={prizeForm.label}
                  onChange={(e) => setPrizeForm({ ...prizeForm, label: e.target.value })}
                  placeholder="e.g. ₹100 Cashback Voucher"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Type
                  </label>
                  <select
                    value={prizeForm.type}
                    onChange={(e) => setPrizeForm({ ...prizeForm, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="coupon">Discount Coupon</option>
                    <option value="cashback">Cashback</option>
                    <option value="free_shipping">Free Shipping</option>
                    <option value="no_prize">Better Luck Next Time</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Value (₹)
                  </label>
                  <Input
                    type="number"
                    value={prizeForm.value}
                    onChange={(e) => setPrizeForm({ ...prizeForm, value: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Coupon Code
                  </label>
                  <Input
                    value={prizeForm.coupon_code}
                    onChange={(e) => setPrizeForm({ ...prizeForm, coupon_code: e.target.value.toUpperCase() })}
                    placeholder="SCRATCH100"
                    className="font-mono text-xs uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Win Chance (%)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={prizeForm.probability}
                    onChange={(e) => setPrizeForm({ ...prizeForm, probability: parseInt(e.target.value, 10) || 10 })}
                  />
                </div>
              </div>

              {/* Color Theme Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Card Theme Accent
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {colorThemes.map((thm) => (
                    <button
                      key={thm.name}
                      type="button"
                      onClick={() => setPrizeForm({ ...prizeForm, color: thm.bg, text_color: thm.text })}
                      className={`h-7 px-3 rounded-xl text-[10px] font-bold text-white transition-transform ${
                        prizeForm.color === thm.bg
                          ? 'ring-2 ring-purple-600 ring-offset-2 scale-105'
                          : 'opacity-85 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: thm.bg }}
                    >
                      {thm.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Preview Inside Modal */}
              <div
                className="p-3.5 rounded-2xl flex items-center justify-between shadow-xs"
                style={{ backgroundColor: prizeForm.color, color: prizeForm.text_color }}
              >
                <div>
                  <p className="text-xs font-extrabold">{prizeForm.label || 'Prize Preview'}</p>
                  <p className="text-[10px] opacity-80 font-mono mt-0.5">{prizeForm.coupon_code || 'CODE'}</p>
                </div>
                <span className="text-sm font-black text-amber-300">
                  {prizeForm.value ? `₹${prizeForm.value}` : ''}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setPrizeModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  {editingPrize ? 'Save Changes' : 'Create Prize'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
