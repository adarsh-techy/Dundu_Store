import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Sliders,
  Sparkles,
  Gift,
  Ticket,
  PartyPopper,
  Tag,
  CreditCard,
  Users,
  Truck,
  PackagePlus,
  Cake,
  Image,
  Megaphone,
  MessageCircle,
  Layers,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  RefreshCw,
  Search,
  BarChart3,
  Zap,
  Info,
  ChevronRight,
  Activity,
  Award,
  X,
  ShieldCheck,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { marketingControlApi } from '../../../api';

// Icon mapper helper
const ICON_MAP = {
  Sparkles,
  Gift,
  Ticket,
  PartyPopper,
  Tag,
  CreditCard,
  Users,
  Truck,
  PackagePlus,
  Cake,
  Image,
  Megaphone,
  MessageCircle,
  Layers,
};

export default function MarketingControlPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [sortBy, setSortBy] = useState('name'); // 'name' | 'revenue' | 'usage' | 'status'

  // Fetch marketing control data
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['marketing-control-overview'],
    queryFn: async () => {
      const res = await marketingControlApi.getOverview();
      return res.data || res;
    },
    refetchInterval: 30000,
  });

  // Toggle mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ featureId, enabled }) => {
      return await marketingControlApi.toggle({ featureId, enabled });
    },
    onSuccess: (res) => {
      toast.success(res.message || 'Feature status updated successfully');
      queryClient.invalidateQueries({ queryKey: ['marketing-control-overview'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err.message || 'Failed to toggle feature');
    },
  });

  const summary = data?.summary || {
    totalEngines: 14,
    activeEngines: 0,
    disabledEngines: 0,
    totalMarketingRevenue: 0,
    totalMarketingCost: 0,
    netMarketingProfit: 0,
    overallRoiRatio: '—',
    topRevenueFeature: 'Coupons & Promo Codes',
    mostUsedFeature: 'Coupons & Promo Codes',
  };

  const allFeatures = data?.features || [];

  // Filter and sort features
  const filteredFeatures = useMemo(() => {
    return allFeatures
      .filter((feat) => {
        const q = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !q ||
          feat.name.toLowerCase().includes(q) ||
          feat.headline.toLowerCase().includes(q) ||
          feat.category.toLowerCase().includes(q) ||
          (feat.conditions || []).some((c) => c.value.toLowerCase().includes(q));

        const matchesCategory =
          selectedCategory === 'All' || feat.category === selectedCategory;

        const matchesStatus =
          selectedStatus === 'All' ||
          (selectedStatus === 'Active' && feat.enabled) ||
          (selectedStatus === 'Inactive' && !feat.enabled);

        return matchesSearch && matchesCategory && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'revenue') {
          return (b.stats?.revenueGenerated || 0) - (a.stats?.revenueGenerated || 0);
        }
        if (sortBy === 'usage') {
          return (b.stats?.usageCount || 0) - (a.stats?.usageCount || 0);
        }
        if (sortBy === 'status') {
          return Number(b.enabled) - Number(a.enabled);
        }
        return a.name.localeCompare(b.name);
      });
  }, [allFeatures, searchQuery, selectedCategory, selectedStatus, sortBy]);

  // Chart data for features that have revenue or cost recorded
  const chartData = useMemo(() => {
    return allFeatures
      .map((f) => ({
        name: f.name.replace(' (Gamification)', '').replace(' Program', '').substring(0, 16),
        revenue: f.stats?.revenueGenerated || 0,
        cost: f.stats?.discountCost || 0,
        netProfit: (f.stats?.revenueGenerated || 0) - (f.stats?.discountCost || 0),
        enabled: f.enabled,
      }))
      .filter((f) => f.revenue > 0 || f.cost > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 7);
  }, [allFeatures]);

  const categories = [
    'All',
    'Discounts & Offers',
    'Gamification & Rewards',
    'Retention & Loyalty',
    'Cart Booster',
    'Awareness & Banners',
    'Direct Outreach',
  ];

  const handleToggle = (feature, e) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    toggleMutation.mutate({
      featureId: feature.id,
      enabled: !feature.enabled,
    });
  };

  return (
    <div className="w-full space-y-8 pb-16">
      {/* ── Page Header Banner ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm shrink-0">
              <Sliders className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Marketing Control Center
                </h1>
                <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                  14 Engine Orchestrator
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Live governance hub for promotions, customer gamification, loyalty reward cards, and retention engines
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
            <span>{isFetching ? 'Syncing...' : 'Sync Live Engines'}</span>
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Engines */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Active Engines
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {summary.activeEngines}
              </span>
              <span className="text-xs font-medium text-slate-400">
                / {summary.totalEngines} Enabled
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-slate-900 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(summary.activeEngines / (summary.totalEngines || 1)) * 100}%`,
                }}
              />
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <span>{summary.disabledEngines} paused / standby</span>
            <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
              {Math.round((summary.activeEngines / (summary.totalEngines || 1)) * 100)}% live
            </span>
          </div>
        </div>

        {/* Card 2: Marketing Driven Revenue */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Marketing Sales Driven
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">
              ₹{Number(summary.totalMarketingRevenue || 0).toLocaleString()}
            </span>
            <p className="text-xs text-slate-500 mt-1">
              Direct checkout attributed sales
            </p>
          </div>
          <div className="text-[11px] text-slate-500 mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <span>Leading Driver:</span>
            <span className="font-semibold text-slate-800 truncate max-w-[130px]">
              {summary.topRevenueFeature}
            </span>
          </div>
        </div>

        {/* Card 3: Discount Cost */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Total Discount Cost
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">
              ₹{Number(summary.totalMarketingCost || 0).toLocaleString()}
            </span>
            <p className="text-xs text-slate-500 mt-1">
              Coupons, loyalty & wallet deductions
            </p>
          </div>
          <div className="text-[11px] text-slate-500 mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <span>Incentive Margin:</span>
            <span className="font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
              Controlled Spend
            </span>
          </div>
        </div>

        {/* Card 4: Net Profitability & ROI */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Net Profit & ROI
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold text-xs">
              ROI
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">
              ₹{Number(summary.netMarketingProfit || 0).toLocaleString()}
            </span>
            <p className="text-xs text-slate-500 mt-1">
              Net revenue generated past promo cost
            </p>
          </div>
          <div className="text-[11px] text-slate-500 mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <span>ROI Multiplier:</span>
            <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
              {summary.overallRoiRatio}
            </span>
          </div>
        </div>
      </div>

      {/* ── Optional Revenue vs Discount Comparison (only when sales exist) ── */}
      {chartData.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                Feature Revenue vs Discount Cost Breakdown
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real checkout sales generated compared against promo incentive costs
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-slate-900" />
                <span className="text-slate-600">Sales Driven (₹)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-amber-500" />
                <span className="text-slate-600">Discount Cost (₹)</span>
              </div>
            </div>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                    color: '#0f172a',
                    fontSize: '12px',
                  }}
                  formatter={(val, name) => [
                    `₹${Number(val).toLocaleString()}`,
                    name === 'revenue' ? 'Sales Revenue' : 'Discount Cost',
                  ]}
                />
                <Bar dataKey="revenue" name="revenue" fill="#0f172a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cost" name="cost" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Filter Controls Bar ── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search marketing features, rules, discounts, or triggers…"
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/60 text-xs">
              {['All', 'Active', 'Inactive'].map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedStatus(st)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    selectedStatus === st
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Sort by dropdown */}
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200/60 text-xs text-slate-700">
              <span className="text-slate-500 font-medium">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-slate-900 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="name">Feature Name (A-Z)</option>
                <option value="status">Status (Active First)</option>
                <option value="revenue">Revenue Generated</option>
                <option value="usage">Customer Usage</option>
              </select>
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide pt-1 border-t border-slate-100">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Feature Cards Grid (Generous Spacing, Clean Elevation & Layout) ── */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-slate-200/80 p-12">
          <RefreshCw className="w-8 h-8 animate-spin text-slate-900" />
          <p className="text-sm font-semibold text-slate-700">Loading marketing engine configuration...</p>
        </div>
      ) : filteredFeatures.length === 0 ? (
        <div className="py-16 text-center bg-white border border-slate-200/80 rounded-2xl p-8 shadow-sm">
          <Info className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No marketing engines match your filter</h3>
          <p className="text-xs text-slate-500 mt-1">Try resetting your search query or category filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredFeatures.map((feat) => {
            const IconComponent = ICON_MAP[feat.icon] || Sparkles;
            const isTogglePending =
              toggleMutation.isPending && toggleMutation.variables?.featureId === feat.id;

            return (
              <div
                key={feat.id}
                className={`flex flex-col justify-between bg-white rounded-2xl border transition-all duration-200 p-6 shadow-sm hover:shadow-md ${
                  feat.enabled
                    ? 'border-slate-200/90 hover:border-slate-300'
                    : 'border-slate-200/60 opacity-80 hover:opacity-100'
                }`}
              >
                {/* ── Card Top Header ── */}
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                          feat.enabled
                            ? 'bg-slate-900 border-slate-800 text-white shadow-xs'
                            : 'bg-slate-100 border-slate-200 text-slate-400'
                        }`}
                      >
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 tracking-tight leading-snug">
                          {feat.name}
                        </h3>
                        <span className="text-[11px] font-medium text-slate-400 block mt-0.5">
                          {feat.category}
                        </span>
                      </div>
                    </div>

                    {/* Quick Live Switch */}
                    <button
                      onClick={(e) => handleToggle(feat, e)}
                      disabled={isTogglePending}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        feat.enabled ? 'bg-emerald-500' : 'bg-slate-300'
                      } ${isTogglePending ? 'opacity-50' : ''}`}
                      title={feat.enabled ? 'Click to pause engine' : 'Click to activate engine'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          feat.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Headline */}
                  <p className="text-xs text-slate-600 line-clamp-2 min-h-[32px] leading-relaxed">
                    {feat.headline}
                  </p>

                  {/* Status & Operational Tier Badges */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        feat.enabled
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80'
                          : 'bg-slate-100 text-slate-600 border border-slate-200/60'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          feat.enabled ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                      />
                      {feat.enabled ? 'Active Engine' : 'Paused / Standby'}
                    </span>

                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/60">
                      {feat.profitability?.tier}
                    </span>

                    <span className="text-[11px] font-bold text-slate-700 ml-auto bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60">
                      {feat.profitability?.marginRatio}
                    </span>
                  </div>

                  {/* ── Active Rules & Conditions Box (Generous Spacing) ── */}
                  <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <span>Configured Rules</span>
                      <span className="text-indigo-600 font-semibold lowercase">live</span>
                    </div>
                    <div className="space-y-1.5">
                      {(feat.conditions || []).map((cond, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">{cond.label}:</span>
                          <span className="text-slate-800 font-semibold bg-white px-2 py-0.5 rounded border border-slate-200/70 truncate max-w-[170px]">
                            {cond.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Real Database Engagement & Financials ── */}
                <div className="pt-5 space-y-3.5">
                  <div className="grid grid-cols-3 gap-2 text-center bg-slate-50/70 p-3 rounded-xl border border-slate-200/60">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                        {feat.stats.usageLabel}
                      </span>
                      <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                        {(feat.stats.usageCount || 0).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                        Sales Driven
                      </span>
                      <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                        ₹{(feat.stats.revenueGenerated || 0).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                        Discount Cost
                      </span>
                      <span className="text-sm font-bold text-amber-700 mt-0.5 block">
                        ₹{(feat.stats.discountCost || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Action Button to Full Configurator */}
                  <button
                    onClick={() => navigate(feat.configRoute)}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs group"
                  >
                    <span>Configure Engine Rules</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Operational Architecture Guide ── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-100 rounded-xl text-slate-700">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Automated Marketing Architecture & Funnel Flow
            </h3>
            <p className="text-xs text-slate-500">
              How all 14 marketing engines coordinate across Dundu Store to maximize customer conversion and retention
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-200/60 space-y-2">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
              1. Acquisition & Entry
            </span>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              • <strong>Splash Screen</strong>: 3-second animated brand ad on cold launch.<br />
              • <strong>Festival Theme</strong>: Storewide confetti shower and announcement ticker.<br />
              • <strong>Spin & Win Wheel</strong>: Triggers 3s after launch for immediate engagement.<br />
              • <strong>1st Purchase Discount</strong>: Auto-applies welcome savings for verified new buyers.
            </p>
          </div>

          <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-200/60 space-y-2">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
              2. Basket & Checkout Lift
            </span>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              • <strong>Free Shipping Bar</strong>: Cart progress bar nudging orders past ₹500.<br />
              • <strong>Combo Deals</strong>: Bundle apparel savings on complementary outfits.<br />
              • <strong>Coupons & Codes</strong>: Threshold-activated promo codes.<br />
              • <strong>Scratch Cards</strong>: Surprise post-checkout milestone rewards.
            </p>
          </div>

          <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-200/60 space-y-2">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
              3. Retention & Direct Outreach
            </span>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              • <strong>Loyalty ATM Cards</strong>: Accrues 20 pts per ₹500 spend for flat discounts.<br />
              • <strong>Birthday Wishes</strong>: Personalized celebratory vouchers on user birthdays.<br />
              • <strong>Refer & Earn</strong>: Peer-to-peer invitation discounts.<br />
              • <strong>WhatsApp Broadcasts</strong>: 1-click cart recovery and order dispatches.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
