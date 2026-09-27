import { useState, useRef, useEffect } from 'react';
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Search, Wallet as WalletIcon, Users, TrendingUp, Plus, Minus,
  History, Phone, Mail, ArrowDownCircle, ArrowUpCircle, Sliders,
  Save, AlertTriangle, ShieldCheck, Gift, RefreshCw, X, Check,
  CreditCard, CheckCircle2, Info, BookOpen, ChevronDown, Zap,
  CheckCircle, Shield, Coins, Percent, ArrowRight, Sparkles,
  HelpCircle, Award, Lock, ArrowUpRight
} from 'lucide-react';
import { walletApi } from '../../../api';
import StatCard from '../../../components/ui/StatCard';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

const REASON_LABELS = {
  order_payment: 'Paid at checkout',
  order_refund: 'Order cancelled — refund',
  return_refund: 'Return approved — refund',
  admin_credit: 'Admin credit',
  admin_debit: 'Admin debit',
};

const inp = 'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all bg-white font-medium';

/* ── Reusable Form Field ── */
function Field({ label, hint, badge, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
          {label}
          {badge && (
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              {badge}
            </span>
          )}
        </label>
        {hint && <span className="text-[11px] text-gray-400 font-medium">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export default function Wallets() {
  const [activeTab, setActiveTab] = useState('wallets'); // 'wallets' | 'control' | 'rules'
  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [adjustUser, setAdjustUser] = useState(null);
  const [historyUser, setHistoryUser] = useState(null);
  const [confirmToggleState, setConfirmToggleState] = useState(null);
  const [confirmInputText, setConfirmInputText] = useState('');

  /* ── Simulator & FAQ State for Rules Guide ── */
  const [simOrderAmount, setSimOrderAmount] = useState(1500);
  const [simWalletBalance, setSimWalletBalance] = useState(800);
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  const debounceRef = useRef(null);
  const loadMoreRef = useRef(null);
  const tableContainerRef = useRef(null);
  const qc = useQueryClient();
  const limit = 15;

  /* ── Wallet Config State ── */
  const [configForm, setConfigForm] = useState({
    enabled: true,
    max_usage_percent: 100,
    min_order_amount: 0,
    max_discount_cap: 0,
    welcome_bonus: 0,
    auto_refund_cancel: true,
    auto_refund_return: true,
    terms: 'Use Dundu Wallet for fast checkouts, cashback, and automated refunds.',
  });

  /* ── Fetch Wallet Configuration ── */
  const { data: configData, isLoading: isConfigLoading } = useQuery({
    queryKey: ['wallet-config'],
    queryFn: async () => {
      const res = await walletApi.getConfig();
      return res.data || res;
    },
  });

  useEffect(() => {
    if (configData?.config) {
      setConfigForm(configData.config);
    }
  }, [configData]);

  /* ── Save Wallet Config Mutation ── */
  const saveConfigMutation = useMutation({
    mutationFn: (data) => walletApi.updateConfig(data),
    onSuccess: (res) => {
      qc.setQueryData(['wallet-config'], res.data || res);
      if (res.data?.config) setConfigForm(res.data.config);
      toast.success('Wallet engine configuration saved successfully!');
    },
    onError: (err) => {
      toast.error(err?.message || 'Failed to save wallet configuration');
    },
  });

  const handleSaveConfig = (e) => {
    if (e?.preventDefault) e.preventDefault();
    saveConfigMutation.mutate(configForm);
  };

  /* ── Infinite Query for Customers ── */
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['wallets', activeSearch],
    queryFn: ({ pageParam }) => walletApi.list({ search: activeSearch, page: pageParam, limit }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const total = lastPage?.data?.total || 0;
      const loaded = allPages.reduce((sum, p) => sum + (p?.data?.wallets?.length || 0), 0);
      return loaded < total ? allPages.length + 1 : undefined;
    },
  });

  const wallets = data?.pages.flatMap((p) => p.data?.wallets || []) || [];
  const total = data?.pages?.[0]?.data?.total || 0;
  const totalBalance = data?.pages?.[0]?.data?.total_balance || 0;
  const walletCount = data?.pages?.[0]?.data?.wallet_count || 0;

  /* ── IntersectionObserver for infinite scrolling inside table ── */
  useEffect(() => {
    const el = loadMoreRef.current;
    const root = tableContainerRef.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { root, rootMargin: '150px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleTableScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 150) {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }
  };

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setActiveSearch(val), 300);
  };

  const invalidate = () => qc.invalidateQueries({ queryKey: ['wallets'] });

  /* ── Dirty state checks for dynamic save buttons ── */
  const savedLimits = configData?.config || {};
  const isLimitsDirty =
    configForm.max_usage_percent !== (savedLimits.max_usage_percent ?? 100) ||
    configForm.min_order_amount !== (savedLimits.min_order_amount ?? 0) ||
    configForm.max_discount_cap !== (savedLimits.max_discount_cap ?? 0);

  const isBonusDirty = configForm.welcome_bonus !== (savedLimits.welcome_bonus ?? 0);

  const isRefundDirty =
    configForm.auto_refund_cancel !== (savedLimits.auto_refund_cancel ?? true) ||
    configForm.auto_refund_return !== (savedLimits.auto_refund_return ?? true);

  const isTermsDirty = configForm.terms !== (savedLimits.terms ?? '');

  return (
    <div className="space-y-6 pb-12">
      {/* ── TOP TAB NAVIGATION BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-gray-200/90 shadow-[0_4px_16px_rgb(0,0,0,0.04)] w-fit flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('wallets')}
            className={`flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'wallets'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <WalletIcon className="w-4 h-4" />
            <span>Customer Wallets ({total})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('control')}
            className={`flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'control'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Wallet Rules & Engine</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'rules'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Rules & How It Works</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
          <span className={`w-2 h-2 rounded-full ${configForm.enabled ? 'bg-emerald-500' : 'bg-gray-300'}`}></span>
          <span>{configForm.enabled ? 'Wallet System Active' : 'Wallet System Paused'}</span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          TAB 1: CUSTOMER WALLETS DIRECTORY
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'wallets' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard title="Customers with a Wallet" value={walletCount} icon={Users} color="indigo" />
            <StatCard title="Total Balance Held" value={`₹${Number(totalBalance).toLocaleString('en-IN')}`} icon={WalletIcon} color="green" />
            <StatCard title="Average Balance" value={`₹${walletCount ? Math.round(totalBalance / walletCount).toLocaleString('en-IN') : 0}`} icon={TrendingUp} color="blue" />
          </div>

          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={handleSearch}
              placeholder="Search by name, email or phone..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 bg-white"
            />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {isLoading ? (
              <div className="text-center py-12 text-gray-400 text-sm">Loading...</div>
            ) : wallets.length === 0 ? (
              <div className="text-center py-12">
                <WalletIcon className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No customers found</p>
              </div>
            ) : (
              <div
                ref={tableContainerRef}
                onScroll={handleTableScroll}
                className="overflow-x-auto max-h-[600px] overflow-y-auto relative scroll-smooth"
              >
                <table className="w-full text-sm border-collapse">
                  <thead className="sticky top-0 z-10 bg-pink-50/95 backdrop-blur-xs text-xs text-pink-900 uppercase tracking-wide border-b border-pink-200/90 shadow-xs">
                    <tr>
                      <th className="px-4 py-3.5 text-left w-12 font-extrabold text-pink-900 bg-pink-50/95">#</th>
                      <th className="px-4 py-3.5 text-left font-extrabold text-pink-900 bg-pink-50/95">Customer</th>
                      <th className="px-4 py-3.5 text-right font-extrabold text-pink-900 bg-pink-50/95">Wallet Balance</th>
                      <th className="px-4 py-3.5 text-center font-extrabold text-pink-900 bg-pink-50/95">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {wallets.map((w, idx) => (
                      <tr key={w.user_id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-4 py-3.5 text-xs font-bold text-gray-400">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-gray-900">{w.name || <span className="text-gray-400 italic text-xs font-normal">Customer</span>}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                            {w.phone && <span className="flex items-center gap-1 font-medium"><Phone className="h-3 w-3 text-gray-400" />{w.phone}</span>}
                            {w.email && <span className="flex items-center gap-1 font-medium"><Mail className="h-3 w-3 text-gray-400" />{w.email}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right font-black text-gray-900 text-base">
                          ₹{Number(w.balance).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setHistoryUser(w)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                              title="View transaction history"
                            >
                              <History className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setAdjustUser(w)}
                              className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                              title="Credit or debit wallet"
                            >
                              <WalletIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div ref={loadMoreRef} className="py-4 text-center text-xs text-gray-400">
                  {isFetchingNextPage ? (
                    <div className="flex items-center justify-center gap-2 text-indigo-600 font-semibold">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Loading next 15 customers...</span>
                    </div>
                  ) : hasNextPage ? (
                    <span className="text-gray-400">Scroll down inside table to load more</span>
                  ) : (
                    <span className="text-gray-400">All {total} customers loaded</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 2: WALLET RULES & CONTROL ENGINE
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'control' && (
        <form onSubmit={handleSaveConfig} className="max-w-4xl space-y-6 animate-in fade-in duration-200">
          {/* Top Header: Title on Left, Master Toggle on Right */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:px-6 sm:py-4 rounded-3xl border border-gray-200/90 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-2xl">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Digital Wallet Engine</h2>
                <p className="text-xs text-gray-500">Configure checkout rules, usage limits, welcome rewards & auto-refunds</p>
              </div>
            </div>

            {/* Master Toggle Button on Top Right */}
            <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-200 shrink-0 self-start sm:self-auto">
              <div className="text-right">
                <span className="text-[11px] font-bold text-gray-700 uppercase block leading-tight">
                  {configForm.enabled ? 'Wallet System Active' : 'Wallet System Paused'}
                </span>
                <span className={`text-[10px] font-bold ${configForm.enabled ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {configForm.enabled ? '● Live Across App' : '○ Paused'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setConfirmToggleState(!configForm.enabled);
                  setConfirmInputText('');
                }}
                disabled={saveConfigMutation.isPending}
                className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 focus:outline-none shadow-inner ${
                  configForm.enabled ? 'bg-emerald-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition duration-300 ${
                    configForm.enabled ? 'translate-x-7' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Card 1: Checkout Spending & Limits */}
          <div className={`bg-white p-6 rounded-3xl border transition-all duration-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4 ${
              isLimitsDirty ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-gray-200/90'
            }`}>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-gray-900">1. Checkout Spending & Limits</h3>
                    {isLimitsDirty && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                        Unsaved Changes
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">Control how much wallet balance customers can use at checkout</p>
                </div>
              </div>
              {isLimitsDirty ? (
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={saveConfigMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-60 shrink-0 animate-in fade-in zoom-in-95"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saveConfigMutation.isPending ? 'Saving...' : 'Save Limits'}</span>
                </button>
              ) : (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Active Rule
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Max Order Coverage" badge="Percentage" hint="100% = full order">
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={configForm.max_usage_percent}
                    onChange={(e) => setConfigForm((p) => ({ ...p, max_usage_percent: parseInt(e.target.value) || 0 }))}
                    className={inp}
                    required
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">%</span>
                </div>
              </Field>

              <Field label="Min Order Amount" badge="Spend" hint="0 = no minimum">
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={configForm.min_order_amount}
                    onChange={(e) => setConfigForm((p) => ({ ...p, min_order_amount: parseFloat(e.target.value) || 0 }))}
                    className={inp}
                    required
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">₹</span>
                </div>
              </Field>

              <Field label="Max ₹ Deduction Cap" badge="Cap" hint="0 = unlimited">
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={configForm.max_discount_cap}
                    onChange={(e) => setConfigForm((p) => ({ ...p, max_discount_cap: parseFloat(e.target.value) || 0 }))}
                    className={inp}
                    required
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">₹</span>
                </div>
              </Field>
            </div>
          </div>

          {/* Card 2: Welcome Bonus & Incentives */}
          <div className={`bg-white p-6 rounded-3xl border transition-all duration-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4 ${
              isBonusDirty ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-gray-200/90'
            }`}>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-xl">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-gray-900">2. Welcome Bonus & Incentives</h3>
                    {isBonusDirty && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                        Unsaved Changes
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">Reward new users with starting wallet balance upon registration</p>
                </div>
              </div>
              {isBonusDirty ? (
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={saveConfigMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-60 shrink-0 animate-in fade-in zoom-in-95"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saveConfigMutation.isPending ? 'Saving...' : 'Save Bonus'}</span>
                </button>
              ) : (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Welcome Bonus
                </span>
              )}
            </div>

            <div className="max-w-xs">
              <Field label="New User Welcome Credit" badge="Bonus" hint="0 = no bonus">
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={configForm.welcome_bonus}
                    onChange={(e) => setConfigForm((p) => ({ ...p, welcome_bonus: parseFloat(e.target.value) || 0 }))}
                    className={inp}
                    required
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">₹</span>
                </div>
              </Field>
            </div>
          </div>

          {/* Card 3: Automated Refund System */}
          <div className={`bg-white p-6 rounded-3xl border transition-all duration-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4 ${
              isRefundDirty ? 'border-amber-400 ring-2 ring-amber-100' : 'border-gray-200/90'
            }`}>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-600 rounded-xl">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-gray-900">3. Automated Refund System</h3>
                    {isRefundDirty && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                        Unsaved Changes
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">Automatically credit wallet on order cancellations and approved item returns</p>
                </div>
              </div>
              {isRefundDirty ? (
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={saveConfigMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-60 shrink-0 animate-in fade-in zoom-in-95"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saveConfigMutation.isPending ? 'Saving...' : 'Save Refunds'}</span>
                </button>
              ) : (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  Auto Refunds
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 rounded-2xl border border-gray-200 bg-gray-50/50">
                <div>
                  <p className="text-xs font-bold text-gray-800">Order Cancellation Refund</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Instantly credit paid amount back to wallet upon order cancellation</p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfigForm((p) => ({ ...p, auto_refund_cancel: !p.auto_refund_cancel }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                    configForm.auto_refund_cancel ? 'bg-emerald-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                      configForm.auto_refund_cancel ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl border border-gray-200 bg-gray-50/50">
                <div>
                  <p className="text-xs font-bold text-gray-800">Item Return Refund</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Instantly credit refund amount back to wallet when return is approved</p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfigForm((p) => ({ ...p, auto_refund_return: !p.auto_refund_return }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                    configForm.auto_refund_return ? 'bg-emerald-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                      configForm.auto_refund_return ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Card 4: Wallet Terms & Conditions */}
          <div className={`bg-white p-6 rounded-3xl border transition-all duration-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4 ${
              isTermsDirty ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-gray-200/90'
            }`}>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-gray-900">4. Terms & Customer Guidelines</h3>
                    {isTermsDirty && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                        Unsaved Changes
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">Customer-facing wallet policy shown in user accounts and checkout</p>
                </div>
              </div>
              {isTermsDirty ? (
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={saveConfigMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-60 shrink-0 animate-in fade-in zoom-in-95"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saveConfigMutation.isPending ? 'Saving...' : 'Save Terms'}</span>
                </button>
              ) : (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Customer Policy
                </span>
              )}
            </div>

            <textarea
              rows={3}
              value={configForm.terms}
              onChange={(e) => setConfigForm((p) => ({ ...p, terms: e.target.value }))}
              placeholder="e.g. Use Dundu Wallet for instant checkouts, cashbacks, and automated refunds..."
              className="w-full border border-gray-200 rounded-xl p-3.5 text-sm text-gray-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white leading-relaxed"
            />
          </div>
        </form>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 3: RULES & HOW IT WORKS (COMPLETE KNOWLEDGE GUIDE)
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'rules' && (() => {
        const isEnabled = configForm.enabled;
        const maxPercent = configForm.max_usage_percent || 100;
        const minOrder = configForm.min_order_amount || 0;
        const maxCap = configForm.max_discount_cap || 0;

        let allowableDeduction = 0;
        let isEligible = isEnabled && simOrderAmount >= minOrder;

        if (isEligible) {
          let maxAllowedByPercent = (simOrderAmount * maxPercent) / 100;
          if (maxCap > 0) {
            maxAllowedByPercent = Math.min(maxAllowedByPercent, maxCap);
          }
          allowableDeduction = Math.min(simWalletBalance, simOrderAmount, maxAllowedByPercent);
        }

        const remainingToPay = Math.max(0, simOrderAmount - allowableDeduction);
        const remainingWallet = Math.max(0, simWalletBalance - allowableDeduction);

        const faqs = [
          {
            q: 'How does Dundu Digital Wallet work for customers?',
            a: 'Dundu Digital Wallet is an in-app stored value balance. Customers can use their available balance at checkout to pay down or completely cover order totals, receive instant refunds on cancellations, and receive promotional welcome credits.'
          },
          {
            q: 'How is the wallet deduction calculated during checkout?',
            a: 'When a customer checks "Use Wallet Balance", the system verifies: (1) Wallet system is active, (2) Order total meets the minimum spend rule, (3) Maximum allowed percentage coverage (e.g. 100% or 50%), and (4) Optional deduction cap per order. The minimum of these limits and the customer’s available balance is instantly deducted.'
          },
          {
            q: 'How do automated refunds work for cancelled orders and returns?',
            a: 'When an order is cancelled or a returned item is approved by an admin, the refund amount is automatically credited directly to the customer’s wallet balance in real-time with an immutable transaction log. This eliminates bank settlement delays.'
          },
          {
            q: 'Can an Admin manually add or deduct wallet balance?',
            a: 'Yes! Admins can click the Wallet icon next to any customer in the "Customer Wallets" directory to issue goodwill credits (e.g. delivery compensation) or manual debits (e.g. chargeback correction), complete with mandatory audit notes.'
          },
          {
            q: 'Can wallet balance be combined with coupons and loyalty points?',
            a: 'Yes. Coupons, referral discounts, and loyalty card points apply first to discount the order subtotal. The remaining final total is then paid using the customer’s digital wallet, with any remaining balance payable via Online Payment (Razorpay) or COD.'
          },
          {
            q: 'What happens when the Wallet System is paused by the Admin?',
            a: 'When paused via the master toggle switch, customers cannot apply wallet balance during checkout. However, customer wallet balances and complete transaction ledgers remain completely safe and untouched.'
          },
          {
            q: 'Do customer wallet balances ever expire?',
            a: 'No. Dundu Digital Wallet balances have 100% lifetime validity and never expire as long as the user account exists.'
          }
        ];

        return (
          <div className="space-y-6 max-w-5xl animate-in fade-in duration-200">
            {/* Header Banner */}
            <div className="bg-white p-6 rounded-3xl border border-gray-200/90 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-2xl">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Digital Wallet Operating Rules & Guide</h2>
                  <p className="text-xs text-gray-500">
                    Comprehensive overview of checkout deductions, auto-refund lifecycles, and admin controls
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Live Rules Engine
                </span>
              </div>
            </div>

            {/* ── INTERACTIVE LIVE ORDER CHECKOUT CALCULATOR ── */}
            <div className="bg-white p-6 rounded-3xl border border-gray-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Live Checkout Simulator</h3>
                    <p className="text-xs text-gray-500">Test how wallet rules apply to different order values and balances</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Interactive Simulator
                </span>
              </div>

              {/* Slider Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Order Amount Slider */}
                <div className="space-y-2 p-4 rounded-2xl bg-gray-50/70 border border-gray-200/80">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                      Order Cart Total:
                    </label>
                    <span className="font-mono font-black text-indigo-600 bg-white px-3 py-1 rounded-xl border border-indigo-200 text-sm">
                      ₹{simOrderAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="10000"
                    step="100"
                    value={simOrderAmount}
                    onChange={(e) => setSimOrderAmount(Number(e.target.value))}
                    className="w-full accent-indigo-600 h-2 bg-gray-200 rounded-lg cursor-pointer"
                  />
                  <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold">
                    <span>₹100</span>
                    <span>₹5,000</span>
                    <span>₹10,000</span>
                  </div>
                </div>

                {/* Customer Wallet Balance Slider */}
                <div className="space-y-2 p-4 rounded-2xl bg-gray-50/70 border border-gray-200/80">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                      Customer Wallet Balance:
                    </label>
                    <span className="font-mono font-black text-emerald-600 bg-white px-3 py-1 rounded-xl border border-emerald-200 text-sm">
                      ₹{simWalletBalance.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="5000"
                    step="50"
                    value={simWalletBalance}
                    onChange={(e) => setSimWalletBalance(Number(e.target.value))}
                    className="w-full accent-emerald-600 h-2 bg-gray-200 rounded-lg cursor-pointer"
                  />
                  <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold">
                    <span>₹0</span>
                    <span>₹2,500</span>
                    <span>₹5,000</span>
                  </div>
                </div>
              </div>

              {/* Simulation Output Breakdown Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                    Wallet Deduction Applied
                  </span>
                  <p className="text-2xl font-black text-emerald-600">
                    -₹{allowableDeduction.toLocaleString('en-IN')}
                  </p>
                  <span className="text-[11px] text-emerald-700 font-medium block">
                    {allowableDeduction === simOrderAmount
                      ? '100% Order Covered by Wallet'
                      : allowableDeduction > 0
                      ? `Covers ${Math.round((allowableDeduction / simOrderAmount) * 100)}% of checkout`
                      : 'Not eligible / ₹0 balance'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">
                    Payable via Online / COD
                  </span>
                  <p className="text-2xl font-black text-indigo-600">
                    ₹{remainingToPay.toLocaleString('en-IN')}
                  </p>
                  <span className="text-[11px] text-indigo-700 font-medium block">
                    {remainingToPay === 0 ? 'Zero cash needed' : 'Remaining cash / card checkout'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1">
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block">
                    Wallet Balance Leftover
                  </span>
                  <p className="text-2xl font-black text-gray-900">
                    ₹{remainingWallet.toLocaleString('en-IN')}
                  </p>
                  <span className="text-[11px] text-gray-500 font-medium block">
                    Saved for next purchase
                  </span>
                </div>
              </div>
            </div>

            {/* ── 4-STEP WALLET CUSTOMER LIFECYCLE ── */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                Digital Wallet Customer Lifecycle
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs border border-indigo-200">
                    1
                  </div>
                  <h4 className="font-bold text-sm text-gray-900">Credit Balance</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Balances are credited from welcome bonuses, instant refunds, promotional cashback, or manual admin goodwill.
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xs border border-emerald-200">
                    2
                  </div>
                  <h4 className="font-bold text-sm text-gray-900">Instant Checkout</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Customer applies balance seamlessly at checkout with 1-click. No OTP or payment gateway redirects required.
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black text-xs border border-amber-200">
                    3
                  </div>
                  <h4 className="font-bold text-sm text-gray-900">Automated Refunds</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Order cancellations or approved return items are instantly refunded back to the wallet with zero bank processing wait.
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black text-xs border border-purple-200">
                    4
                  </div>
                  <h4 className="font-bold text-sm text-gray-900">Audit Ledger</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Every credit, debit, refund, and payment has an immutable audit transaction record visible to both user and admin.
                  </p>
                </div>
              </div>
            </div>

            {/* ── LIVE BUSINESS RULES MATRIX ── */}
            <div className="bg-white p-6 rounded-3xl border border-gray-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className="p-2.5 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-xl">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Active Wallet Engine Rules Matrix</h3>
                  <p className="text-xs text-gray-500">Live operational parameters configured in the control tab</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 uppercase text-gray-500 font-bold border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3">Rule Name</th>
                      <th className="px-4 py-3">Current Active Value</th>
                      <th className="px-4 py-3">Engine Behavior</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
                    <tr>
                      <td className="px-4 py-3 font-bold text-gray-900">Master System Status</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${configForm.enabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                          {configForm.enabled ? 'Active / Live' : 'Paused'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {configForm.enabled ? 'Customers can spend balance freely' : 'Checkout usage is temporarily disabled'}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-gray-900">Max Order Coverage</td>
                      <td className="px-4 py-3 font-mono font-bold text-indigo-600">{configForm.max_usage_percent}%</td>
                      <td className="px-4 py-3 text-gray-500">Maximum percentage of order total payable using wallet</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-gray-900">Min Order Spend</td>
                      <td className="px-4 py-3 font-mono font-bold text-indigo-600">₹{configForm.min_order_amount}</td>
                      <td className="px-4 py-3 text-gray-500">Minimum cart subtotal required to unlock wallet checkout</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-gray-900">Max ₹ Discount Cap</td>
                      <td className="px-4 py-3 font-mono font-bold text-indigo-600">{configForm.max_discount_cap > 0 ? `₹${configForm.max_discount_cap}` : 'No Cap (Unlimited)'}</td>
                      <td className="px-4 py-3 text-gray-500">Upper limit in ₹ that can be deducted per transaction</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-gray-900">Welcome Bonus Credit</td>
                      <td className="px-4 py-3 font-mono font-bold text-indigo-600">₹{configForm.welcome_bonus}</td>
                      <td className="px-4 py-3 text-gray-500">Starting wallet balance automatically granted on user signup</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-gray-900">Auto Cancellation Refund</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${configForm.auto_refund_cancel ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500'}`}>
                          {configForm.auto_refund_cancel ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">Instant credit back to wallet upon order cancellation</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-gray-900">Auto Return Refund</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${configForm.auto_refund_return ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500'}`}>
                          {configForm.auto_refund_return ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">Instant credit back to wallet when item return is approved</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── INTERACTIVE FAQ ACCORDION ── */}
            <div className="bg-white p-6 rounded-3xl border border-gray-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-600 rounded-xl">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Frequently Asked Questions & Policy</h3>
                  <p className="text-xs text-gray-500">Clear explanations of everyday wallet scenarios and rules</p>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {faqs.map((faq, idx) => {
                  const isOpen = openFaqIndex === idx;
                  return (
                    <div key={idx} className="py-3">
                      <button
                        type="button"
                        onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                        className="w-full flex items-center justify-between text-left font-bold text-sm text-gray-900 hover:text-indigo-600 transition-colors cursor-pointer py-1"
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
                            {idx + 1}
                          </span>
                          {faq.q}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-indigo-600' : ''}`} />
                      </button>

                      {isOpen && (
                        <div className="pt-2 pl-7 pr-2 text-xs text-gray-600 leading-relaxed animate-in fade-in duration-150">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Pause Program Confirmation Modal ── */}
      {confirmToggleState !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <AlertTriangle className={`h-5 w-5 ${confirmToggleState ? 'text-emerald-600' : 'text-rose-600'}`} />
                <h2 className="font-bold text-gray-900">
                  {confirmToggleState ? 'Activate Digital Wallet System?' : 'Pause Digital Wallet System?'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setConfirmToggleState(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-xs text-gray-600 leading-relaxed">
                {confirmToggleState
                  ? 'Activating the wallet system allows customers across web and mobile apps to spend their wallet balance at checkout and receive automated refunds.'
                  : 'Pausing the wallet system prevents customers from using their wallet balance at checkout. Existing user balances remain safe and unchanged.'}
              </p>

              {!confirmToggleState && (
                <div className="space-y-2 pt-1">
                  <label className="text-[11px] font-bold text-gray-700 block">
                    Type <span className="text-rose-600 font-black">PAUSE</span> to confirm:
                  </label>
                  <input
                    type="text"
                    value={confirmInputText}
                    onChange={(e) => setConfirmInputText(e.target.value)}
                    placeholder="PAUSE"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:border-rose-400"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setConfirmToggleState(null)} fullWidth>
                  Cancel
                </Button>
                <Button
                  variant={confirmToggleState ? 'success' : 'danger'}
                  disabled={!confirmToggleState && confirmInputText !== 'PAUSE'}
                  loading={saveConfigMutation.isPending}
                  onClick={() => {
                    const newEnabled = confirmToggleState;
                    setConfirmToggleState(null);
                    setConfigForm((p) => ({ ...p, enabled: newEnabled }));
                    saveConfigMutation.mutate({ ...configForm, enabled: newEnabled });
                  }}
                  fullWidth
                >
                  {confirmToggleState ? 'Yes, Activate Wallet' : 'Yes, Pause Wallet'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Credit / Debit Modal ── */}
      {adjustUser && (
        <AdjustModal user={adjustUser} onClose={() => setAdjustUser(null)} onDone={invalidate} />
      )}

      {/* ── Transaction History Modal ── */}
      {historyUser && (
        <HistoryModal user={historyUser} onClose={() => setHistoryUser(null)} />
      )}
    </div>
  );
}

/* ── Credit / Debit Modal ── */
function AdjustModal({ user, onClose, onDone }) {
  const [type, setType] = useState('credit');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const mutation = useMutation({
    mutationFn: () => walletApi.adjust(user.user_id, { type, amount: parseFloat(amount), note }),
    onSuccess: () => {
      onDone();
      onClose();
      toast.success(type === 'credit' ? 'Wallet credited successfully' : 'Wallet debited successfully');
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Adjustment failed'),
  });

  const handleSave = () => {
    if (!(parseFloat(amount) > 0)) return toast.error('Enter a valid amount');
    if (!note.trim()) return toast.error('A note is required, e.g. reason for the adjustment');
    mutation.mutate();
  };

  return (
    <Modal title={`Adjust Wallet — ${user.name || user.phone || user.email}`} onClose={onClose} size="sm">
      <div className="space-y-4">
        <p className="text-xs text-gray-400">Current balance: <strong className="text-gray-700">₹{Number(user.balance).toLocaleString('en-IN')}</strong></p>

        <div className="flex gap-2">
          {[
            { key: 'credit', label: 'Credit (add money)', icon: ArrowUpCircle },
            { key: 'debit', label: 'Debit (remove money)', icon: ArrowDownCircle },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setType(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                type === t.key
                  ? t.key === 'credit' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-red-500 text-white border-red-500'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>

        <Input label="Amount (₹)" type="number" min="0.01" step="0.01" value={amount}
          onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />

        <Input label="Note (required)" value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Goodwill credit for delayed delivery" />

        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={onClose} fullWidth>Cancel</Button>
          <Button
            variant={type === 'credit' ? 'success' : 'danger'}
            onClick={handleSave}
            loading={mutation.isPending}
            fullWidth
          >
            {type === 'credit' ? <Plus className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
            {mutation.isPending ? 'Saving…' : `Confirm ${type === 'credit' ? 'Credit' : 'Debit'}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Transaction History Modal ── */
function HistoryModal({ user, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ['wallet-transactions', user.user_id],
    queryFn: () => walletApi.getTransactions(user.user_id, { limit: 50 }),
  });
  const transactions = data?.data?.transactions || [];

  return (
    <Modal title={`Transaction History — ${user.name || user.phone || user.email}`} onClose={onClose} size="lg">
      {isLoading ? (
        <div className="text-center py-8 text-sm text-gray-400">Loading…</div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-8 text-sm text-gray-400">No transactions yet</div>
      ) : (
        <div className="space-y-2">
          {transactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-100 bg-gray-50/60">
              <div className="flex items-center gap-3">
                {t.type === 'credit'
                  ? <ArrowUpCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                  : <ArrowDownCircle className="h-5 w-5 text-red-500 shrink-0" />}
                <div>
                  <p className="text-sm font-medium text-gray-800">{REASON_LABELS[t.reason] || t.reason}</p>
                  {t.note && <p className="text-xs text-gray-400 mt-0.5">{t.note}</p>}
                  <p className="text-xs text-gray-300 mt-0.5">
                    {new Date(t.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-bold ${t.type === 'credit' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {t.type === 'credit' ? '+' : '-'}₹{Number(t.amount).toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-gray-400">Balance: ₹{Number(t.balance_after).toLocaleString('en-IN')}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
