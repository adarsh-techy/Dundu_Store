import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  TrendingUp, IndianRupee, ShoppingBag,
  Calendar, Search, Package, Layers, Edit3, Check, RefreshCw,
  Download, Percent, Wallet, ShieldAlert, BarChart3, Receipt, Coins,
  ArrowRight, CheckCircle2, HelpCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { reportsApi } from '../../../api';
import Spinner from '../../../components/ui/Spinner';
import { formatPrice } from '../../../utils/format';

/* ── Custom Recharts Tooltip ─────────────────────────────────────────────── */
function FinanceChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-950 text-white rounded-xl shadow-2xl p-4 text-xs border border-slate-800 space-y-2 min-w-[200px]">
      <p className="text-slate-400 font-semibold border-b border-slate-800 pb-1.5">{label}</p>
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: entry.color }} />
            {entry.name}:
          </span>
          <span className="font-extrabold font-mono" style={{ color: entry.color }}>
            {formatPrice(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Hero Executive Financial Metric Card ────────────────────────────────── */
function FinanceHeroCard({ title, value, sub, icon: Icon, tone = 'emerald', badge, onClick }) {
  const tones = {
    emerald: {
      bar: 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600',
      iconBox: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      accent: 'text-slate-900',
    },
    sky: {
      bar: 'bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500',
      iconBox: 'bg-sky-50 text-sky-700 border-sky-200',
      badge: 'bg-sky-50 text-sky-700 border-sky-200',
      accent: 'text-slate-900',
    },
    indigo: {
      bar: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-600',
      iconBox: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      accent: 'text-slate-900',
    },
    violet: {
      bar: 'bg-gradient-to-r from-violet-500 via-fuchsia-500 to-purple-600',
      iconBox: 'bg-violet-50 text-violet-700 border-violet-200',
      badge: 'bg-violet-50 text-violet-700 border-violet-200',
      accent: 'text-slate-900',
    },
  }[tone] || {
    bar: 'bg-slate-900',
    iconBox: 'bg-slate-50 text-slate-700 border-slate-200',
    badge: 'bg-slate-50 text-slate-700 border-slate-200',
    accent: 'text-slate-900',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden transition-all duration-200 flex flex-col justify-between p-5 ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5' : ''
      }`}
    >
      <div className={`absolute top-0 left-0 right-0 h-1.5 ${tones.bar}`} />

      <div className="flex items-center justify-between gap-3 pt-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${tones.iconBox}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-4">
        <p className={`text-2xl sm:text-[28px] font-extrabold tracking-tight ${tones.accent}`}>
          {value}
        </p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <p className="text-xs text-slate-500 font-medium truncate">
            {sub}
          </p>
          {badge && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${tones.badge}`}>
              {badge}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FinancePage() {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState('all_time'); // 'this_month' | 'last_month' | 'this_year' | 'all_time' | 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'monthly' | 'products' | 'categories'

  // Inline editing for product cost price
  const [editingCostId, setEditingCostId] = useState(null);
  const [costInput, setCostInput] = useState('');

  // Fetch financial report data
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['financeReport', period, startDate, endDate, search],
    queryFn: () => reportsApi.finance({
      period,
      start_date: period === 'custom' ? startDate : undefined,
      end_date: period === 'custom' ? endDate : undefined,
      search: search || undefined,
    }),
  });

  // Mutation for updating a product's buy/cost price
  const updateCostMutation = useMutation({
    mutationFn: ({ id, cost_price }) => reportsApi.updateCostPrice(id, cost_price),
    onSuccess: () => {
      toast.success('Buy price updated successfully');
      setEditingCostId(null);
      queryClient.invalidateQueries({ queryKey: ['financeReport'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update buy price');
    },
  });

  const handleSaveCost = (productId) => {
    const num = parseFloat(costInput);
    if (isNaN(num) || num < 0) {
      toast.error('Please enter a valid price');
      return;
    }
    updateCostMutation.mutate({ id: productId, cost_price: num });
  };

  const rep = data?.data || {};
  const summary = rep.summary || {};
  const monthly = rep.monthly_breakdown || [];
  const categories = rep.category_profitability || [];
  const products = rep.product_profitability || [];

  // Monthly chart data formatted
  const monthlyChartData = useMemo(() => {
    return monthly.map((m) => ({
      name: m.month_label,
      'Sale Revenue': parseFloat(m.revenue || 0),
      'Buy Cost': parseFloat(m.cost || 0),
      'Profit': parseFloat(m.profit || 0),
      margin: parseFloat(m.margin_pct || 0),
    }));
  }, [monthly]);

  // Download CSV export
  const exportToCsv = () => {
    if (!products.length && !monthly.length) {
      toast.error('No financial records to export');
      return;
    }
    const headers = ['Product', 'Category', 'Buy Price', 'Sale Price', 'Units Sold', 'Total Buy Cost', 'Total Sale Revenue', 'Net Profit', 'Margin %'];
    const rows = products.map((p) => [
      `"${(p.product_name || '').replace(/"/g, '""')}"`,
      `"${p.category_name || ''}"`,
      p.avg_cost_price || 0,
      p.avg_sale_price || 0,
      p.units_sold || 0,
      p.total_cost || 0,
      p.total_revenue || 0,
      p.net_profit || 0,
      `${p.margin_pct || 0}%`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dundu-finance-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Finance report downloaded');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Spinner />
        <p className="text-xs font-semibold text-slate-500">Calculating financial telemetry and margins...</p>
      </div>
    );
  }

  // Markup multiplier calculation
  const markupRatio = summary.total_cost > 0
    ? (summary.total_revenue / summary.total_cost).toFixed(2)
    : '1.0';

  return (
    <div className="w-full space-y-6 pb-16">

      {/* ── 1. Top Executive Financial Command Bar ────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shrink-0">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Finance & Profit Analytics
                </h1>
                <span className="text-[11px] font-bold px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Commerce Economics
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Track Buy Price (COGS), Gross Sales Revenue, Net Realized Profit, and Department Margins
              </p>
            </div>
          </div>
        </div>

        {/* Quick Period Presets & Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200/70">
            {[
              { label: 'All Time', value: 'all_time' },
              { label: 'This Month', value: 'this_month' },
              { label: 'Last Month', value: 'last_month' },
              { label: 'This Year', value: 'this_year' },
              { label: 'Custom', value: 'custom' },
            ].map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  period === p.value
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs bg-transparent focus:outline-none text-slate-700 font-medium cursor-pointer"
              />
              <span className="text-slate-400 text-xs font-semibold">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs bg-transparent focus:outline-none text-slate-700 font-medium cursor-pointer"
              />
            </div>
          )}

          <button
            onClick={exportToCsv}
            title="Export CSV Report"
            className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh Financial Data"
            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl transition-all cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── 2. Primary Financial Matrix (4 Expansive Hero Cards) ───────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <FinanceHeroCard
          title="Net Realized Profit"
          value={formatPrice(summary.net_profit || 0)}
          sub="Verified bottom line after refunds"
          badge={`Operating: ${summary.profit_margin_pct || 0}%`}
          icon={TrendingUp}
          tone="emerald"
        />
        <FinanceHeroCard
          title="Gross Sales Revenue"
          value={formatPrice(summary.total_revenue || 0)}
          sub={`${Number(summary.total_orders || 0).toLocaleString('en-IN')} paid customer orders`}
          badge="Gross Intake"
          icon={IndianRupee}
          tone="sky"
        />
        <FinanceHeroCard
          title="Procurement Cost (COGS)"
          value={formatPrice(summary.total_cost || 0)}
          sub={`${Number(summary.total_units_sold || 0).toLocaleString('en-IN')} units purchase total`}
          badge="Inventory Cost"
          icon={Package}
          tone="indigo"
        />
        <FinanceHeroCard
          title="Commercial Margin & Multiplier"
          value={`${summary.profit_margin_pct || 0}% Margin`}
          sub={`${markupRatio}x Sales-to-Cost multiple`}
          badge={`AOV: ${formatPrice(summary.avg_order_value || 0)}`}
          icon={Percent}
          tone="violet"
        />
      </div>

      {/* ── 3. Operational Financial Safeguards & Multiplier Row ───────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center shrink-0">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-extrabold text-slate-900">
                {formatPrice(summary.gross_profit || 0)}
              </p>
              <p className="text-xs font-semibold text-slate-600">Gross Profit (Pre-refund)</p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-slate-400">Pre-deduction</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center shrink-0">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-extrabold text-slate-900">
                {Number(summary.total_units_sold || 0).toLocaleString('en-IN')} Units
              </p>
              <p className="text-xs font-semibold text-slate-600">Product Volume Shipped</p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
            {summary.total_orders || 0} Orders
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-700 border border-orange-200 flex items-center justify-center shrink-0">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-extrabold text-slate-900">
                {formatPrice(summary.total_refunded || 0)}
              </p>
              <p className="text-xs font-semibold text-slate-600">Approved Refund Deductions</p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
            {summary.return_count || 0} Claims
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-extrabold text-slate-900">
                {markupRatio}x Markup
              </p>
              <p className="text-xs font-semibold text-slate-600">Sales-to-Cost Multiple</p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            Optimal
          </span>
        </div>
      </div>

      {/* ── 4. Segment Navigation Tabs (Zero Emojis) ───────────────────────── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { id: 'overview',   label: 'Financial Overview & Trends', icon: BarChart3 },
          { id: 'monthly',    label: 'Monthly Buy vs Sale Breakdown', icon: Calendar },
          { id: 'products',   label: 'Product Profitability & Buy Prices', icon: Package },
          { id: 'categories', label: 'Category Profit Margins', icon: Layers },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === t.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: OVERVIEW & TRENDS ─────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Monthly Comparison Bar Chart */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Monthly Sales Revenue vs Buying Cost vs Gross Profit
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Comparison of revenue collected against inventory acquisition cost over the past 12 months
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  Sale Revenue
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" />
                  Buy Cost
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
                  Profit
                </span>
              </div>
            </div>

            {monthlyChartData.length === 0 ? (
              <div className="h-72 flex flex-col items-center justify-center text-slate-400 text-xs">
                <BarChart3 className="h-8 w-8 text-slate-300 mb-2" />
                No monthly sales history available
              </div>
            ) : (
              <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChartData} margin={{ top: 12, right: 12, left: -10, bottom: 0 }} barGap={6}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                      width={52}
                    />
                    <Tooltip content={<FinanceChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                    <Bar dataKey="Sale Revenue" fill="#10b981" radius={[6, 6, 0, 0]} barSize={20} />
                    <Bar dataKey="Buy Cost" fill="#94a3b8" radius={[6, 6, 0, 0]} barSize={20} />
                    <Bar dataKey="Profit" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* 2-Column Split: Top Profit Products & Category Margin Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Top Profitable Products */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">Highest Profit Generating Products</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Top contributors to overall gross income</p>
                </div>
                <button
                  onClick={() => setActiveTab('products')}
                  className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  Manage Buy Prices <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              {products.length === 0 ? (
                <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-xs">
                  <Package className="h-8 w-8 text-slate-300 mb-2" />
                  No product sales recorded
                </div>
              ) : (
                <div className="space-y-3">
                  {products.slice(0, 5).map((p, i) => (
                    <div
                      key={p.product_id || i}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-slate-200 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-200/70 overflow-hidden flex items-center justify-center shrink-0 border border-slate-200">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.product_name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="h-5 w-5 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{p.product_name}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Buy: {formatPrice(p.avg_cost_price)} · Sell: {formatPrice(p.avg_sale_price)} ({p.units_sold} units)
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-extrabold text-emerald-700">+{formatPrice(p.net_profit)}</span>
                        <span className="block text-[10px] font-bold text-slate-500">{p.margin_pct}% margin</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Department Profit Margins */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">Department Profit Margins</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Profitability across product categories</p>
                </div>
                <button
                  onClick={() => setActiveTab('categories')}
                  className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  Category Ledger <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              {categories.length === 0 ? (
                <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-xs">
                  <Layers className="h-8 w-8 text-slate-300 mb-2" />
                  No category records available
                </div>
              ) : (
                <div className="space-y-3.5">
                  {categories.slice(0, 5).map((c, i) => (
                    <div key={i} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">{c.category_name}</span>
                        <span className="font-extrabold text-slate-900">
                          {formatPrice(c.profit)}{' '}
                          <span className="text-emerald-700 font-bold">({c.margin_pct}% margin)</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>{c.orders_count} orders · {c.units_sold} units</span>
                        <span>Rev: {formatPrice(c.revenue)}</span>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, c.margin_pct))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: MONTHLY BREAKDOWN TABLE ────────────────────────────────── */}
      {activeTab === 'monthly' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Monthly Buy Price, Sale Revenue & Profit Log</h2>
              <p className="text-xs text-slate-500 mt-0.5">Historical breakdown of monthly procurement cost vs sales income</p>
            </div>
            <button
              onClick={exportToCsv}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Monthly Data</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Month</th>
                  <th className="px-5 py-3.5">Orders</th>
                  <th className="px-5 py-3.5">Units Sold</th>
                  <th className="px-5 py-3.5 text-right">Total Buy Cost</th>
                  <th className="px-5 py-3.5 text-right">Total Sale Revenue</th>
                  <th className="px-5 py-3.5 text-right">Gross Profit</th>
                  <th className="px-5 py-3.5 text-center">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthly.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400 text-xs">
                      No monthly records recorded yet
                    </td>
                  </tr>
                ) : (
                  monthly.map((m) => (
                    <tr key={m.month_key} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-900 text-xs">
                        {m.month_label}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-600">
                        {m.orders_count}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-600">
                        {m.units_sold}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-semibold text-slate-700 text-right">
                        {formatPrice(m.cost)}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-bold text-slate-900 text-right">
                        {formatPrice(m.revenue)}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-extrabold text-emerald-700 text-right">
                        +{formatPrice(m.profit)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-md border ${
                          m.margin_pct >= 40
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : m.margin_pct >= 20
                            ? 'bg-sky-50 text-sky-800 border-sky-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {m.margin_pct}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: PRODUCT PROFITABILITY & BUY PRICE MANAGEMENT ───────────── */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">Product Profit & Buy Price Management</h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {products.length} Products
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Set and update buy prices to accurately calculate margins and profit. Click any buy price to edit.
              </p>
            </div>

            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by product name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 w-64"
              />
            </div>
          </div>

          {/* Quick Notice Tip */}
          <div className="bg-emerald-50/60 border-b border-emerald-100 px-5 py-2.5 flex items-center gap-2 text-xs text-emerald-900">
            <HelpCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              Tip: Click on any <strong>Buy Price</strong> in the table below to update your purchase cost in real time.
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Product</th>
                  <th className="px-5 py-3.5">Department</th>
                  <th className="px-5 py-3.5 text-right">Buy Price (Cost)</th>
                  <th className="px-5 py-3.5 text-right">Sale Price</th>
                  <th className="px-5 py-3.5 text-center">Units Sold</th>
                  <th className="px-5 py-3.5 text-right">Total Buy Cost</th>
                  <th className="px-5 py-3.5 text-right">Total Sales</th>
                  <th className="px-5 py-3.5 text-right">Net Profit</th>
                  <th className="px-5 py-3.5 text-center">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-slate-400 text-xs">
                      No products found
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.product_id || p.product_name} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                            {p.image_url ? (
                              <img src={p.image_url} alt={p.product_name} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="h-5 w-5 text-slate-400" />
                            )}
                          </div>
                          <span className="text-xs font-bold text-slate-900 truncate max-w-[220px]">
                            {p.product_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-600 font-medium">
                        {p.category_name}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {editingCostId === p.product_id ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <input
                              type="number"
                              value={costInput}
                              onChange={(e) => setCostInput(e.target.value)}
                              className="w-24 px-2 py-1 text-xs border border-emerald-500 rounded-lg focus:outline-none text-right font-bold bg-white"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveCost(p.product_id)}
                              disabled={updateCostMutation.isPending}
                              className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs cursor-pointer"
                              title="Save Cost"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingCostId(p.product_id);
                              setCostInput(p.avg_cost_price || 0);
                            }}
                            className="group flex items-center justify-end gap-1 font-semibold text-slate-800 hover:text-emerald-700 text-xs w-full text-right cursor-pointer"
                            title="Click to Edit Buy Price"
                          >
                            <span>{formatPrice(p.avg_cost_price)}</span>
                            <Edit3 className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100 transition-opacity text-slate-500" />
                          </button>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-bold text-slate-900 text-right">
                        {formatPrice(p.avg_sale_price)}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-semibold text-slate-700 text-center">
                        {p.units_sold}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-medium text-slate-600 text-right">
                        {formatPrice(p.total_cost)}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-bold text-slate-900 text-right">
                        {formatPrice(p.total_revenue)}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-extrabold text-emerald-700 text-right">
                        +{formatPrice(p.net_profit)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-md border ${
                          p.margin_pct >= 40
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : p.margin_pct >= 20
                            ? 'bg-sky-50 text-sky-800 border-sky-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {p.margin_pct}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 4: CATEGORY BREAKDOWN ─────────────────────────────────────── */}
      {activeTab === 'categories' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Category Profitability Breakdown</h2>
              <p className="text-xs text-slate-500 mt-0.5">Department sales revenue vs purchase cost and operating margin</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Category Name</th>
                  <th className="px-5 py-3.5">Orders</th>
                  <th className="px-5 py-3.5">Units Sold</th>
                  <th className="px-5 py-3.5 text-right">Total Buy Cost</th>
                  <th className="px-5 py-3.5 text-right">Total Sale Revenue</th>
                  <th className="px-5 py-3.5 text-right">Total Profit</th>
                  <th className="px-5 py-3.5 text-center">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400 text-xs">
                      No category records recorded yet
                    </td>
                  </tr>
                ) : (
                  categories.map((c) => (
                    <tr key={c.category_name} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-900 text-xs">
                        {c.category_name}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-600">
                        {c.orders_count}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-600">
                        {c.units_sold}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-semibold text-slate-700 text-right">
                        {formatPrice(c.cost)}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-bold text-slate-900 text-right">
                        {formatPrice(c.revenue)}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-extrabold text-emerald-700 text-right">
                        +{formatPrice(c.profit)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-md border ${
                          c.margin_pct >= 40
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : c.margin_pct >= 20
                            ? 'bg-sky-50 text-sky-800 border-sky-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {c.margin_pct}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
