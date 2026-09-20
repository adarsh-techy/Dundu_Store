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
  CheckCircle2,
  XCircle,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  RefreshCw,
  Search,
  Filter,
  BarChart3,
  Flame,
  Zap,
  Info,
  ExternalLink,
  ChevronRight,
  Activity,
  Award,
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
  const [sortBy, setSortBy] = useState('profitability'); // 'profitability' | 'revenue' | 'usage' | 'name'

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
      toast.success(res.message || 'Feature status updated!');
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
    overallRoiRatio: '0x',
    topRevenueFeature: 'N/A',
    mostUsedFeature: 'N/A',
  };

  const allFeatures = data?.features || [];

  // Filter and sort features
  const filteredFeatures = useMemo(() => {
    return allFeatures
      .filter((feat) => {
        const matchesSearch =
          feat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          feat.headline.toLowerCase().includes(searchQuery.toLowerCase()) ||
          feat.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          feat.conditions.some((c) => c.value.toLowerCase().includes(searchQuery.toLowerCase()));

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
          return (b.stats.revenueGenerated || 0) - (a.stats.revenueGenerated || 0);
        }
        if (sortBy === 'usage') {
          return (b.stats.usageCount || 0) - (a.stats.usageCount || 0);
        }
        if (sortBy === 'profitability') {
          return (b.profitability?.score || 0) - (a.profitability?.score || 0);
        }
        return a.name.localeCompare(b.name);
      });
  }, [allFeatures, searchQuery, selectedCategory, selectedStatus, sortBy]);

  // Chart data for revenue vs discount cost
  const chartData = useMemo(() => {
    return allFeatures
      .map((f) => ({
        name: f.name.replace(' (Gamification)', '').replace(' Program', '').substring(0, 16),
        revenue: f.stats.revenueGenerated || 0,
        cost: f.stats.discountCost || 0,
        netProfit: (f.stats.revenueGenerated || 0) - (f.stats.discountCost || 0),
        enabled: f.enabled,
      }))
      .filter((f) => f.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 7);
  }, [allFeatures]);

  const categories = ['All', 'Discounts & Offers', 'Gamification & Rewards', 'Retention & Loyalty', 'Cart Booster', 'Awareness & Banners', 'Direct Outreach'];

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
    <div className="space-y-6 pb-12">
      {/* ── Page Header Banner ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-[0_10px_30px_rgb(0,0,0,0.06)] relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-pink-500/10 border border-pink-500/20 rounded-xl text-pink-600 shadow-sm">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
                Marketing Control Center
                <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-300 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm">
                  Live Engine Sync
                </span>
              </h1>
              <p className="text-xs text-gray-500 mt-1 font-medium">
                Real-time dashboard of all 14 marketing engines, active rules, user engagement, and net profitability.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 transition-all cursor-pointer shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-pink-600' : 'text-gray-500'}`} />
            <span>{isFetching ? 'Syncing...' : 'Sync Live'}</span>
          </button>
        </div>
      </div>

      {/* ── Executive KPI Cards (White Background with Deep Shadows) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Engines */}
        <div className="bg-white border border-gray-200/90 p-5 rounded-2xl shadow-[0_8px_25px_rgb(0,0,0,0.06)] hover:shadow-[0_12px_30px_rgb(0,0,0,0.09)] transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Marketing Engines</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-gray-900">
                {summary.activeEngines}
              </span>
              <span className="text-sm font-semibold text-gray-500">
                / {summary.totalEngines} Enabled
              </span>
            </div>
            <div className="w-full bg-gray-100 h-2.5 rounded-full mt-3 overflow-hidden border border-gray-200/60">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${(summary.activeEngines / (summary.totalEngines || 1)) * 100}%` }}
              />
            </div>
          </div>
          <div className="text-[11px] text-gray-500 mt-2.5 flex items-center justify-between border-t border-gray-100 pt-2 font-medium">
            <span>{summary.disabledEngines} paused / standby</span>
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {Math.round((summary.activeEngines / (summary.totalEngines || 1)) * 100)}% active
            </span>
          </div>
        </div>

        {/* Card 2: Marketing Driven Revenue */}
        <div className="bg-white border border-gray-200/90 p-5 rounded-2xl shadow-[0_8px_25px_rgb(0,0,0,0.06)] hover:shadow-[0_12px_30px_rgb(0,0,0,0.09)] transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sales Driven by Marketing</span>
            <div className="w-9 h-9 rounded-xl bg-pink-50 border border-pink-200 flex items-center justify-center text-pink-600 shadow-sm">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-gray-900">
              ₹{Number(summary.totalMarketingRevenue || 0).toLocaleString()}
            </span>
            <p className="text-xs text-emerald-700 font-bold mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" /> High conversion impact
            </p>
          </div>
          <div className="text-[11px] text-gray-500 mt-2.5 flex items-center justify-between border-t border-gray-100 pt-2 font-medium">
            <span>Top Revenue Star:</span>
            <span className="text-pink-600 font-bold truncate max-w-[130px] bg-pink-50 px-2 py-0.5 rounded border border-pink-200">
              {summary.topRevenueFeature}
            </span>
          </div>
        </div>

        {/* Card 3: Discount Cost */}
        <div className="bg-white border border-gray-200/90 p-5 rounded-2xl shadow-[0_8px_25px_rgb(0,0,0,0.06)] hover:shadow-[0_12px_30px_rgb(0,0,0,0.09)] transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Incentive Cost</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-sm">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-gray-900">
              ₹{Number(summary.totalMarketingCost || 0).toLocaleString()}
            </span>
            <p className="text-xs text-amber-700 font-semibold mt-1">
              Discounts, rewards & cashback given
            </p>
          </div>
          <div className="text-[11px] text-gray-500 mt-2.5 flex items-center justify-between border-t border-gray-100 pt-2 font-medium">
            <span>Cost Efficiency:</span>
            <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Controlled spend
            </span>
          </div>
        </div>

        {/* Card 4: Net Profitability & ROI */}
        <div className="bg-gradient-to-br from-white via-white to-emerald-50/50 border border-emerald-300 p-5 rounded-2xl shadow-[0_8px_25px_rgb(16,185,129,0.09)] hover:shadow-[0_12px_32px_rgb(16,185,129,0.15)] transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Net Marketing Profit & ROI</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 font-black text-xs shadow-sm">
              ROI
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-700">
                ₹{Number(summary.netMarketingProfit || 0).toLocaleString()}
              </span>
            </div>
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mt-1 border border-emerald-200">
              <Zap className="w-3 h-3 text-emerald-600" /> {summary.overallRoiRatio} Multiplier
            </div>
          </div>
          <div className="text-[11px] text-gray-500 mt-2.5 flex items-center justify-between border-t border-emerald-100 pt-2 font-medium">
            <span>Most Engaged:</span>
            <span className="text-emerald-700 font-bold truncate max-w-[130px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {summary.mostUsedFeature}
            </span>
          </div>
        </div>
      </div>

      {/* ── Analytics & Comparison Section (White Card + Shadow) ── */}
      <div className="bg-white border border-gray-200/90 rounded-2xl p-6 shadow-[0_10px_30px_rgb(0,0,0,0.06)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-pink-600" />
              Feature Profitability & Sales Generation Comparison
            </h2>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">
              Compare sales driven vs discount cost across top marketing engines to find what makes the most profit.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-pink-500 shadow-sm" />
              <span className="text-gray-700">Revenue Generated (₹)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-amber-400 shadow-sm" />
              <span className="text-gray-700">Discount Cost (₹)</span>
            </div>
          </div>
        </div>

        <div className="h-64 w-full">
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
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  color: '#0f172a',
                  fontSize: '12px',
                }}
                formatter={(val, name) => [`₹${Number(val).toLocaleString()}`, name === 'revenue' ? 'Sales Revenue' : 'Discount Cost']}
              />
              <Bar dataKey="revenue" name="revenue" fill="#ec4899" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cost" name="cost" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Filters & Controls Bar (White Card + Shadow) ── */}
      <div className="bg-white border border-gray-200/90 rounded-2xl p-4 shadow-[0_8px_25px_rgb(0,0,0,0.05)] space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search features, rules, triggers, discounts, or conditions..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-pink-500 focus:bg-white transition-all shadow-inner"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs">
              {['All', 'Active', 'Inactive'].map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedStatus(st)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    selectedStatus === st
                      ? 'bg-pink-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Sort by dropdown */}
            <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-700">
              <span className="text-gray-500 font-medium">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-gray-900 font-bold focus:outline-none cursor-pointer"
              >
                <option value="profitability">Highest Profitability 🚀</option>
                <option value="revenue">Top Revenue Generated 💰</option>
                <option value="usage">Most User Usage 🔥</option>
                <option value="name">Feature Name (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Category pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide pt-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200 border border-gray-200/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Feature Cards Grid (White Cards with Rich Shadows & High-Contrast Borders) ── */}
      {isLoading ? (
        <div className="py-20 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-pink-600" />
          <p className="text-sm font-semibold text-gray-600">Loading live marketing engines & conditions...</p>
        </div>
      ) : filteredFeatures.length === 0 ? (
        <div className="py-16 text-center bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <Info className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-800">No marketing features match your filter</h3>
          <p className="text-xs text-gray-500 mt-1">Try resetting your search or category selection.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredFeatures.map((feat) => {
            const IconComponent = ICON_MAP[feat.icon] || Sparkles;
            const isTogglePending = toggleMutation.isPending && toggleMutation.variables?.featureId === feat.id;

            return (
              <div
                key={feat.id}
                className={`flex flex-col justify-between bg-white rounded-2xl border transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_16px_40px_rgb(0,0,0,0.12)] hover:-translate-y-0.5 overflow-hidden ${
                  feat.enabled
                    ? 'border-gray-200/90 hover:border-pink-300'
                    : 'border-gray-200/60 opacity-80 hover:opacity-100'
                }`}
              >
                {/* ── Card Top Header ── */}
                <div className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                          feat.enabled
                            ? 'bg-pink-50 border-pink-200 text-pink-600 shadow-sm'
                            : 'bg-gray-100 border-gray-200 text-gray-400'
                        }`}
                      >
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black text-gray-900 tracking-tight">
                            {feat.name}
                          </h3>
                        </div>
                        <span className="text-[11px] font-bold text-gray-500 block mt-0.5">
                          {feat.category}
                        </span>
                      </div>
                    </div>

                    {/* Quick Live Switch */}
                    <button
                      onClick={(e) => handleToggle(feat, e)}
                      disabled={isTogglePending}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-inner ${
                        feat.enabled ? 'bg-emerald-500' : 'bg-gray-300'
                      } ${isTogglePending ? 'opacity-50' : ''}`}
                      title={feat.enabled ? 'Click to Disable' : 'Click to Enable'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          feat.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Headline */}
                  <p className="text-xs text-gray-600 mt-3 line-clamp-2 min-h-[32px] font-medium">
                    {feat.headline}
                  </p>

                  {/* Status & Profitability Badges */}
                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        feat.enabled
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          feat.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
                        }`}
                      />
                      {feat.enabled ? 'Active & Live' : 'Paused / Inactive'}
                    </span>

                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-pink-50 text-pink-700 border border-pink-200">
                      <Award className="w-3 h-3 text-pink-600" />
                      {feat.profitability?.tier}
                    </span>

                    <span className="text-[11px] font-extrabold text-amber-700 ml-auto bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {feat.profitability?.marginRatio}
                    </span>
                  </div>
                </div>

                {/* ── Active Rules & Conditions Box (Light Clean Container) ── */}
                <div className="px-5 py-3.5 bg-gray-50/80 border-y border-gray-100 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-2">
                    <span>Active Rules & Conditions</span>
                    <span className="text-pink-600 font-bold lowercase">live config</span>
                  </div>
                  <div className="space-y-1.5">
                    {feat.conditions.map((cond, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 font-medium">{cond.label}:</span>
                        <span className="text-gray-900 font-bold bg-white px-2 py-0.5 rounded border border-gray-200/80 truncate max-w-[180px] shadow-sm">
                          {cond.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Engagement & Profitability Stats ── */}
                <div className="p-5 pt-3.5 space-y-3.5">
                  <div className="grid grid-cols-3 gap-2 text-center bg-gray-50 p-3 rounded-xl border border-gray-200/70 shadow-inner">
                    <div>
                      <span className="text-[10px] text-gray-500 block uppercase font-bold">
                        {feat.stats.usageLabel}
                      </span>
                      <span className="text-sm font-black text-gray-900 mt-0.5 block">
                        {feat.stats.usageCount.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block uppercase font-bold">
                        Sales Driven
                      </span>
                      <span className="text-sm font-black text-emerald-600 mt-0.5 block">
                        ₹{feat.stats.revenueGenerated.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block uppercase font-bold">
                        Promo Cost
                      </span>
                      <span className="text-sm font-black text-amber-600 mt-0.5 block">
                        ₹{feat.stats.discountCost.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Action Button to Full Configurator */}
                  <button
                    onClick={() => navigate(feat.configRoute)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-900 hover:bg-pink-600 text-white rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg group"
                  >
                    <span>Edit Rules & Full Settings</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Master Rulebook Collapsible / Guide (White Card + Shadow) ── */}
      <div className="bg-white border border-gray-200/90 rounded-2xl p-6 shadow-[0_10px_30px_rgb(0,0,0,0.06)] space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-600 shadow-sm">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-gray-900">
              Automated Marketing Strategy & Customer Journey Flow
            </h3>
            <p className="text-xs text-gray-500 font-medium">
              How all 14 marketing engines coordinate automatically across Dundu Online to maximize checkout conversion and repeat sales.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80 space-y-2 shadow-sm">
            <span className="text-xs font-black text-pink-600 uppercase tracking-wider block">
              1. Acquisition & App Open
            </span>
            <p className="text-xs text-gray-600 leading-relaxed font-medium">
              • <strong>Splash Screen</strong> presents prime offer / ad for 3 seconds.<br />
              • <strong>Festival Shower & Banner</strong> announces active store discounts.<br />
              • <strong>Spin & Win Wheel</strong> triggers 3s after open for instant excitement.<br />
              • <strong>1st Purchase Welcome Discount</strong> auto-applies ₹100 off for new buyers.
            </p>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80 space-y-2 shadow-sm">
            <span className="text-xs font-black text-amber-600 uppercase tracking-wider block">
              2. Cart & Checkout Boosting
            </span>
            <p className="text-xs text-gray-600 leading-relaxed font-medium">
              • <strong>Free Shipping Progress Bar</strong> nudges carts to ₹500+.<br />
              • <strong>Combo Deals</strong> offer bundle savings on matching apparel.<br />
              • <strong>Coupons & Promo Codes</strong> satisfy discount seekers.<br />
              • <strong>Scratch & Win Cards</strong> reward customers upon order completion.
            </p>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80 space-y-2 shadow-sm">
            <span className="text-xs font-black text-emerald-600 uppercase tracking-wider block">
              3. Retention & Virality
            </span>
            <p className="text-xs text-gray-600 leading-relaxed font-medium">
              • <strong>Loyalty ATM Cards</strong> reward 20 pts/₹500 spent (200 pts = ₹200).<br />
              • <strong>Birthday Rewards</strong> auto-congratulate users on their special day.<br />
              • <strong>Refer & Earn</strong> turns happy customers into brand ambassadors.<br />
              • <strong>WhatsApp Direct Broadcasts</strong> recover abandoned carts within 1 hour.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
