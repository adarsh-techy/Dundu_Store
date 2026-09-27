import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Gift, Users, Clock, CheckCircle, Search, Sliders,
  BookOpen, Sparkles, AlertTriangle, X, Save, TrendingUp,
  Share2, ChevronDown, Zap, Shield, HelpCircle, Check,
  Percent, ArrowRight, DollarSign, Filter, RefreshCw
} from 'lucide-react';
import { referralApi } from '../../../api';
import StatCard from '../../../components/ui/StatCard';
import Button from '../../../components/ui/Button';

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

export default function Referral() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('history'); // 'history' | 'control' | 'rules'
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'referrer' | 'referred'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'pending' | 'used'
  const [page, setPage] = useState(1);
  const limit = 15;

  /* ── Interactive Simulator State ── */
  const [simFriendOrder, setSimFriendOrder] = useState(1200);
  const [simReferrerOrder, setSimReferrerOrder] = useState(1800);
  const [openFaqIndex, setOpenFaqIndex] = useState(0);
  const [confirmToggleState, setConfirmToggleState] = useState(null);
  const [confirmInputText, setConfirmInputText] = useState('');

  /* ── Referral Config State ── */
  const [configForm, setConfigForm] = useState({
    enabled: true,
    referrer_discount_percent: 20,
    referred_discount_percent: 30,
    min_order_amount: 500,
    max_discount_cap: 500,
    validity_days: 30,
    share_message: 'Shop on Dundu Online using my referral code {code} to get a special discount on your first order!',
  });

  /* ── Fetch Live Config ── */
  const { data: configData, isLoading: isConfigLoading } = useQuery({
    queryKey: ['referral-config'],
    queryFn: async () => {
      const res = await referralApi.getConfig();
      return res.data || res;
    },
  });

  useEffect(() => {
    if (configData?.config) {
      setConfigForm(configData.config);
    }
  }, [configData]);

  /* ── Fetch Stats ── */
  const { data: statsData, isLoading: isStatsLoading } = useQuery({
    queryKey: ['referral-stats'],
    queryFn: async () => {
      const res = await referralApi.stats();
      return res.data || res;
    },
  });
  const stats = statsData || {};

  /* ── Fetch Rewards Directory ── */
  const { data: rewardsData, isLoading: isRewardsLoading, isFetching: isRewardsFetching } = useQuery({
    queryKey: ['referral-rewards', page, filterType, filterStatus, search],
    queryFn: async () => {
      const res = await referralApi.rewards({
        page,
        limit,
        type: filterType,
        status: filterStatus,
        search,
      });
      return res.data || res;
    },
  });

  const rewards = rewardsData?.rewards || [];
  const totalRewards = rewardsData?.total || 0;
  const totalPages = Math.ceil(totalRewards / limit) || 1;

  /* ── Save Config Mutation ── */
  const saveConfigMutation = useMutation({
    mutationFn: (data) => referralApi.updateConfig(data),
    onSuccess: (res) => {
      qc.setQueryData(['referral-config'], res.data || res);
      if (res.data?.config) setConfigForm(res.data.config);
      toast.success('Referral program rules saved successfully!');
    },
    onError: (err) => {
      toast.error(err?.message || 'Failed to save referral rules');
    },
  });

  const handleSaveConfig = (e) => {
    if (e?.preventDefault) e.preventDefault();
    const { referrer_discount_percent, referred_discount_percent } = configForm;
    if (
      referrer_discount_percent < 1 || referrer_discount_percent > 100 ||
      referred_discount_percent < 1 || referred_discount_percent > 100
    ) {
      toast.error('Discount percentages must be between 1 and 100');
      return;
    }
    saveConfigMutation.mutate(configForm);
  };

  /* ── Dirty State Tracking ── */
  const savedConfig = configData?.config || {};
  const isReferrerDirty =
    configForm.referrer_discount_percent !== (savedConfig.referrer_discount_percent ?? 20) ||
    configForm.max_discount_cap !== (savedConfig.max_discount_cap ?? 500) ||
    configForm.validity_days !== (savedConfig.validity_days ?? 30);

  const isReferredDirty =
    configForm.referred_discount_percent !== (savedConfig.referred_discount_percent ?? 30) ||
    configForm.min_order_amount !== (savedConfig.min_order_amount ?? 500);

  const isShareDirty = configForm.share_message !== (savedConfig.share_message ?? '');

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="w-full space-y-6 pb-16">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm shrink-0">
              <Gift className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Referral & Viral Growth Engine
                </h1>
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                  configForm.enabled
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  {configForm.enabled ? 'Program Live' : 'Program Paused'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage customer invite incentives, dual-sided discount rewards, checkout thresholds, and referral logs
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => {
              qc.invalidateQueries({ queryKey: ['referral-stats'] });
              qc.invalidateQueries({ queryKey: ['referral-rewards'] });
              qc.invalidateQueries({ queryKey: ['referral-config'] });
              toast.success('Referral data refreshed');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition-colors cursor-pointer"
            title="Refresh referral logs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            Refresh
          </button>
        </div>
      </div>

      {/* ── TOP NAVIGATION TABS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200/90 shadow-xs w-fit flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>Referral Activity ({totalRewards})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('control')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'control'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Program Rules & Engine</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'rules'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Rules & How It Works</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span className={`w-2 h-2 rounded-full ${configForm.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
          <span>{configForm.enabled ? 'Referral Program Active' : 'Referral Program Paused'}</span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          TAB 1: REFERRAL REWARDS & ACTIVITY DIRECTORY
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Executive KPI Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Referrals"
              value={stats.total_referrals ?? 0}
              icon={Users}
              color="indigo"
              sub="New users signed up via invite"
            />
            <StatCard
              title="Pending Rewards"
              value={stats.pending_rewards ?? 0}
              icon={Clock}
              color="blue"
              sub="Active unused discounts"
            />
            <StatCard
              title="Used Rewards"
              value={stats.used_rewards ?? 0}
              icon={CheckCircle}
              color="green"
              sub="Applied at order checkout"
            />
            <StatCard
              title="Sales from Referrals"
              value={`₹${Number(stats.total_revenue || 0).toLocaleString('en-IN')}`}
              icon={TrendingUp}
              color="rose"
              sub="Delivered order revenue"
            />
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-200/90 shadow-sm">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by customer name, email or order #..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 bg-gray-50/50 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                {['all', 'referrer', 'referred'].map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setFilterType(t);
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      filterType === t
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t === 'all' ? 'All Types' : t === 'referrer' ? 'Referrer' : 'Referred Friend'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                {['all', 'pending', 'used'].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setFilterStatus(s);
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      filterStatus === s
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {s === 'all' ? 'All Status' : s === 'pending' ? 'Pending' : 'Used'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Rewards Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
            {isRewardsLoading ? (
              <div className="text-center py-16 text-slate-400 text-sm">Loading referral activity...</div>
            ) : rewards.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Gift className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">No referral rewards found</p>
                <p className="text-xs text-slate-400 mt-1">Try changing search keywords or filter pills</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto relative scroll-smooth">
                <table className="w-full text-sm border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-200/80 shadow-xs">
                    <tr>
                      <th className="px-4 py-3.5 text-left w-12 font-bold text-slate-500 bg-slate-50/95">#</th>
                      <th className="px-4 py-3.5 text-left font-bold text-slate-500 bg-slate-50/95">Customer</th>
                      <th className="px-4 py-3.5 text-center font-bold text-slate-500 bg-slate-50/95">Reward Type</th>
                      <th className="px-4 py-3.5 text-center font-bold text-slate-500 bg-slate-50/95">Discount %</th>
                      <th className="px-4 py-3.5 text-center font-bold text-slate-500 bg-slate-50/95">Status</th>
                      <th className="px-4 py-3.5 text-center font-bold text-slate-500 bg-slate-50/95">Order Number</th>
                      <th className="px-4 py-3.5 text-right font-bold text-slate-500 bg-slate-50/95">Issued Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rewards.map((r, idx) => (
                      <tr key={r.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-4 py-3.5 text-xs font-bold text-gray-400">
                          {(page - 1) * limit + idx + 1}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-gray-900">{r.user_name || 'Customer'}</p>
                          <p className="text-xs text-gray-500">{r.user_email || r.user_phone || '—'}</p>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                              r.reward_type === 'referrer'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : 'bg-purple-50 text-purple-700 border-purple-200'
                            }`}
                          >
                            {r.reward_type === 'referrer' ? 'Inviting Referrer' : 'Referred Friend'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center font-black text-indigo-600">
                          {r.discount_percent}% OFF
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                              r.is_used
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${r.is_used ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                            {r.is_used ? 'Used on Order' : 'Active / Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center font-mono text-xs font-bold text-gray-700">
                          {r.order_number ? (
                            <span className="bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                              #{r.order_number}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">Not applied yet</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right text-xs text-gray-500 font-medium">
                          {formatDate(r.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50/50 text-xs text-gray-600">
                <span>Page {page} of {totalPages} ({totalRewards} rewards)</span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 2: PROGRAM RULES & ENGINE CONTROL
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'control' && (
        <form onSubmit={handleSaveConfig} className="w-full space-y-6 animate-in fade-in duration-200">
          {/* Top Header: Title on Left, Master Toggle on Right */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:px-6 sm:py-4 rounded-3xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-2xl">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Referral Program Engine</h2>
                <p className="text-xs text-gray-500">Configure discount percentages, order thresholds, and invitation messages</p>
              </div>
            </div>

            {/* Master Toggle Switch on Top Right */}
            <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-200 shrink-0 self-start sm:self-auto">
              <div className="text-right">
                <span className="text-[11px] font-bold text-gray-700 uppercase block leading-tight">
                  {configForm.enabled ? 'Referrals Active' : 'Referrals Paused'}
                </span>
                <span className={`text-[10px] font-bold ${configForm.enabled ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {configForm.enabled ? '● Live Across Store' : '○ Paused'}
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

          {/* Card 1: Referrer Reward Rules */}
          <div className={`bg-white p-6 rounded-3xl border transition-all duration-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4 ${
              isReferrerDirty ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-gray-200/90'
            }`}>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-gray-900">1. Referrer Reward (Inviter's Next Order)</h3>
                    {isReferrerDirty && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                        Unsaved Changes
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">Reward granted to existing customers when their invited friend makes a purchase</p>
                </div>
              </div>
              {isReferrerDirty ? (
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={saveConfigMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-60 shrink-0 animate-in fade-in zoom-in-95"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saveConfigMutation.isPending ? 'Saving...' : 'Save Referrer Rule'}</span>
                </button>
              ) : (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Active Rule
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Referrer Discount %" badge="Discount" hint="e.g. 20%">
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={configForm.referrer_discount_percent}
                    onChange={(e) => setConfigForm((p) => ({ ...p, referrer_discount_percent: parseInt(e.target.value) || 0 }))}
                    className={inp}
                    required
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">%</span>
                </div>
              </Field>

              <Field label="Max Discount Cap (₹)" badge="Cap" hint="0 = unlimited">
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

              <Field label="Voucher Validity" badge="Days" hint="e.g. 30 days">
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={configForm.validity_days}
                    onChange={(e) => setConfigForm((p) => ({ ...p, validity_days: parseInt(e.target.value) || 0 }))}
                    className={inp}
                    required
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">Days</span>
                </div>
              </Field>
            </div>
          </div>

          {/* Card 2: Referred Friend (New User) Rules */}
          <div className={`bg-white p-6 rounded-3xl border transition-all duration-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4 ${
              isReferredDirty ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-gray-200/90'
            }`}>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-xl">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-gray-900">2. Referred Friend Reward (1st Order Discount)</h3>
                    {isReferredDirty && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                        Unsaved Changes
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">Welcome discount automatically applied to a new user's very first order</p>
                </div>
              </div>
              {isReferredDirty ? (
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={saveConfigMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-60 shrink-0 animate-in fade-in zoom-in-95"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saveConfigMutation.isPending ? 'Saving...' : 'Save Friend Rule'}</span>
                </button>
              ) : (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Active Rule
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Friend Discount %" badge="1st Order" hint="e.g. 30%">
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={configForm.referred_discount_percent}
                    onChange={(e) => setConfigForm((p) => ({ ...p, referred_discount_percent: parseInt(e.target.value) || 0 }))}
                    className={inp}
                    required
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">%</span>
                </div>
              </Field>

              <Field label="Min Order Amount (₹)" badge="Spend" hint="0 = no minimum">
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
            </div>
          </div>

          {/* Card 3: Invitation Template & Share Message */}
          <div className={`bg-white p-6 rounded-3xl border transition-all duration-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4 ${
              isShareDirty ? 'border-amber-400 ring-2 ring-amber-100' : 'border-gray-200/90'
            }`}>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-600 rounded-xl">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-gray-900">3. WhatsApp & Social Share Message</h3>
                    {isShareDirty && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                        Unsaved Changes
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">Default template populated when customers tap "Share Code with Friends"</p>
                </div>
              </div>
              {isShareDirty ? (
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={saveConfigMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-60 shrink-0 animate-in fade-in zoom-in-95"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saveConfigMutation.isPending ? 'Saving...' : 'Save Template'}</span>
                </button>
              ) : (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  Share Template
                </span>
              )}
            </div>

            <div>
              <textarea
                rows={3}
                value={configForm.share_message}
                onChange={(e) => setConfigForm((p) => ({ ...p, share_message: e.target.value }))}
                placeholder="Shop on Dundu Online using my referral code {code} to get a discount on your first order!"
                className="w-full border border-gray-200 rounded-xl p-3.5 text-sm text-gray-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white leading-relaxed"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Tip: Include <code className="text-indigo-600 font-bold bg-indigo-50 px-1 py-0.5 rounded">&#123;code&#125;</code> to dynamically inject the member’s referral code.
              </p>
            </div>
          </div>
        </form>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 3: RULES & HOW IT WORKS (KNOWLEDGE GUIDE & SIMULATOR)
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'rules' && (() => {
        const friendDiscountPct = configForm.referred_discount_percent || 30;
        const referrerDiscountPct = configForm.referrer_discount_percent || 20;
        const minOrder = configForm.min_order_amount || 500;
        const maxCap = configForm.max_discount_cap || 500;

        const friendEligible = simFriendOrder >= minOrder;
        const friendDiscountVal = friendEligible
          ? Math.min(Math.round((simFriendOrder * friendDiscountPct) / 100), maxCap > 0 ? maxCap : Infinity)
          : 0;
        const friendPayable = Math.max(0, simFriendOrder - friendDiscountVal);

        const referrerDiscountVal = Math.min(
          Math.round((simReferrerOrder * referrerDiscountPct) / 100),
          maxCap > 0 ? maxCap : Infinity
        );
        const referrerPayable = Math.max(0, simReferrerOrder - referrerDiscountVal);

        const totalCustomerSavings = friendDiscountVal + referrerDiscountVal;
        const totalNetSales = friendPayable + referrerPayable;

        const faqs = [
          {
            q: 'How does the Dundu Referral Program work end-to-end?',
            a: '1. Every registered customer receives a unique referral code. 2. They share their code with friends. 3. The friend signs up using the code and gets 30% OFF their first order above ₹500. 4. When the friend’s order is completed, the inviter automatically receives 20% OFF on their next cart checkout.'
          },
          {
            q: 'When does the inviter (referrer) receive their 20% OFF reward?',
            a: 'The inviter’s 20% OFF voucher is automatically unlocked and credited to their account as soon as the referred friend completes their first qualifying checkout.'
          },
          {
            q: 'Can a referred new customer use the discount on multiple orders?',
            a: 'No. The 30% referred discount is strictly single-use and valid only for the customer’s very first purchase on Dundu Online.'
          },
          {
            q: 'Can referral discounts be combined with coupons or loyalty points?',
            a: 'Referral discounts are non-stackable with coupons or other promo codes. The checkout engine automatically selects the highest available discount. Any remaining order total can still be paid using the customer’s digital wallet.'
          },
          {
            q: 'What happens if a referred friend cancels their order or returns items?',
            a: 'If the friend’s order is cancelled, the reward eligibility is reverted. The inviter does not receive the referral reward for cancelled or fraudulent orders.'
          },
          {
            q: 'Do referral vouchers have an expiration date?',
            a: 'Yes, referral vouchers remain active for 30 days (or the duration configured in the Program Rules engine) from the date of issuance.'
          },
          {
            q: 'How are self-referrals and fraudulent accounts prevented?',
            a: 'The system validates unique phone numbers, email addresses, and prevents a user from entering their own referral code.'
          }
        ];

        return (
          <div className="space-y-6 w-full animate-in fade-in duration-200">
            {/* Header Banner */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-2xl">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Referral Program Operating Rules & Logic</h2>
                  <p className="text-xs text-gray-500">
                    Interactive simulation, business mechanics, customer journey, and fraud prevention safeguards
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  Live Rules Active
                </span>
              </div>
            </div>

            {/* ── LIVE INTERACTIVE REFERRAL SIMULATOR ── */}
            <div className="bg-white p-6 rounded-3xl border border-gray-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Live Dual-Order Referral Simulator</h3>
                    <p className="text-xs text-gray-500">Simulate order values for both Friend and Inviter to see live margins & savings</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Interactive Simulator
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Friend's 1st Order Slider */}
                <div className="space-y-2 p-4 rounded-2xl bg-purple-50/50 border border-purple-200/70">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-purple-900 uppercase tracking-wide">
                      1. Friend's 1st Order Value:
                    </label>
                    <span className="font-mono font-black text-purple-700 bg-white px-3 py-1 rounded-xl border border-purple-200 text-sm">
                      ₹{simFriendOrder.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="5000"
                    step="50"
                    value={simFriendOrder}
                    onChange={(e) => setSimFriendOrder(Number(e.target.value))}
                    className="w-full accent-purple-600 h-2 bg-purple-200 rounded-lg cursor-pointer"
                  />
                  <div className="flex items-center justify-between text-[10px] text-purple-600/70 font-bold">
                    <span>₹100</span>
                    <span>₹2,500</span>
                    <span>₹5,000</span>
                  </div>
                  <div className="pt-2 flex items-center justify-between text-xs border-t border-purple-200/50">
                    <span className="text-purple-900 font-medium">Friend Saves ({friendDiscountPct}%):</span>
                    <span className="font-bold text-purple-700">-₹{friendDiscountVal} (Payable: ₹{friendPayable})</span>
                  </div>
                </div>

                {/* Referrer's Future Order Slider */}
                <div className="space-y-2 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200/70">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-indigo-900 uppercase tracking-wide">
                      2. Inviter's Next Order Value:
                    </label>
                    <span className="font-mono font-black text-indigo-700 bg-white px-3 py-1 rounded-xl border border-indigo-200 text-sm">
                      ₹{simReferrerOrder.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="5000"
                    step="50"
                    value={simReferrerOrder}
                    onChange={(e) => setSimReferrerOrder(Number(e.target.value))}
                    className="w-full accent-indigo-600 h-2 bg-indigo-200 rounded-lg cursor-pointer"
                  />
                  <div className="flex items-center justify-between text-[10px] text-indigo-600/70 font-bold">
                    <span>₹100</span>
                    <span>₹2,500</span>
                    <span>₹5,000</span>
                  </div>
                  <div className="pt-2 flex items-center justify-between text-xs border-t border-indigo-200/50">
                    <span className="text-indigo-900 font-medium">Inviter Saves ({referrerDiscountPct}%):</span>
                    <span className="font-bold text-indigo-700">-₹{referrerDiscountVal} (Payable: ₹{referrerPayable})</span>
                  </div>
                </div>
              </div>

              {/* Combined Economics Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                    Total 2-Order Sales Driven
                  </span>
                  <p className="text-2xl font-black text-emerald-600">
                    ₹{totalNetSales.toLocaleString('en-IN')}
                  </p>
                  <span className="text-[11px] text-emerald-700 font-medium block">
                    Net cash collected from both orders
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                    Total Referral Discounts
                  </span>
                  <p className="text-2xl font-black text-amber-600">
                    -₹{totalCustomerSavings.toLocaleString('en-IN')}
                  </p>
                  <span className="text-[11px] text-amber-700 font-medium block">
                    Combined savings across both orders
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">
                    Effective Promo Margin
                  </span>
                  <p className="text-2xl font-black text-indigo-600">
                    {((totalCustomerSavings / (simFriendOrder + simReferrerOrder)) * 100).toFixed(1)}%
                  </p>
                  <span className="text-[11px] text-indigo-700 font-medium block">
                    Highly profitable viral acquisition
                  </span>
                </div>
              </div>
            </div>

            {/* ── 4-STEP CUSTOMER JOURNEY ── */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                Referral Program Customer Journey
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs border border-indigo-200">
                    1
                  </div>
                  <h4 className="font-bold text-sm text-gray-900">Share Unique Code</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    User gets a unique referral code (e.g. DUNDU1234) in their account and shares via WhatsApp.
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black text-xs border border-purple-200">
                    2
                  </div>
                  <h4 className="font-bold text-sm text-gray-900">Friend Signs Up</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Friend signs up with the code and automatically gets 30% OFF their first order above ₹500.
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xs border border-emerald-200">
                    3
                  </div>
                  <h4 className="font-bold text-sm text-gray-900">Reward Triggered</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    When the friend completes checkout, a 20% OFF voucher is instantly credited to the inviter.
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black text-xs border border-amber-200">
                    4
                  </div>
                  <h4 className="font-bold text-sm text-gray-900">Repeat Purchase</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Inviter applies their 20% OFF voucher on their next purchase within 30 days.
                  </p>
                </div>
              </div>
            </div>

            {/* ── ACTIVE RULES MATRIX ── */}
            <div className="bg-white p-6 rounded-3xl border border-gray-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className="p-2.5 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-xl">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Active Referral Engine Rules Matrix</h3>
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
                      <td className="px-4 py-3 font-bold text-gray-900">Program Master Switch</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${configForm.enabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                          {configForm.enabled ? 'Active / Live' : 'Paused'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {configForm.enabled ? 'Referrals & rewards are actively processed' : 'New referral links and discount applications paused'}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-gray-900">Inviter (Referrer) Discount</td>
                      <td className="px-4 py-3 font-mono font-bold text-indigo-600">{configForm.referrer_discount_percent}% OFF</td>
                      <td className="px-4 py-3 text-gray-500">Discount awarded on inviter’s next order when friend purchases</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-gray-900">Referred Friend Discount</td>
                      <td className="px-4 py-3 font-mono font-bold text-indigo-600">{configForm.referred_discount_percent}% OFF</td>
                      <td className="px-4 py-3 text-gray-500">Single-use welcome discount for the new customer's 1st purchase</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-gray-900">Minimum Order Spend</td>
                      <td className="px-4 py-3 font-mono font-bold text-indigo-600">₹{configForm.min_order_amount}</td>
                      <td className="px-4 py-3 text-gray-500">Cart subtotal required to qualify for referral discount</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-gray-900">Max Discount Cap</td>
                      <td className="px-4 py-3 font-mono font-bold text-indigo-600">{configForm.max_discount_cap > 0 ? `₹${configForm.max_discount_cap}` : 'No Cap (Unlimited)'}</td>
                      <td className="px-4 py-3 text-gray-500">Upper limit in ₹ that can be deducted per order</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-gray-900">Reward Voucher Validity</td>
                      <td className="px-4 py-3 font-mono font-bold text-indigo-600">{configForm.validity_days} Days</td>
                      <td className="px-4 py-3 text-gray-500">Days before an unused referral voucher expires</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── FAQ ACCORDION ── */}
            <div className="bg-white p-6 rounded-3xl border border-gray-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-600 rounded-xl">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Frequently Asked Questions & Policy</h3>
                  <p className="text-xs text-gray-500">Clear explanations of referral rewards, qualification, and edge cases</p>
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
                  {confirmToggleState ? 'Activate Referral Program?' : 'Pause Referral Program?'}
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
                  ? 'Activating the referral program allows customers to generate invitation codes, invite friends, and earn discounts on completed orders.'
                  : 'Pausing the program prevents new referral signups from receiving discounts. Existing earned rewards remain safe and valid.'}
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
                  {confirmToggleState ? 'Yes, Activate Program' : 'Yes, Pause Program'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
