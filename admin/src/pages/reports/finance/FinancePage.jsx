import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  TrendingUp, IndianRupee, ShoppingBag, ArrowUpRight, ArrowDownRight,
  Filter, Calendar, Search, Package, Layers, Edit3, Check, RefreshCw,
  Download, Sparkles, Percent, DollarSign, Wallet, ShieldAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { reportsApi } from '../../../api';
import Spinner from '../../../components/ui/Spinner';
import { formatPrice } from '../../../utils/format';

/* ── Custom Recharts Tooltip ─────────────────────────────────────────────── */
function FinanceChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white rounded-xl shadow-2xl p-3.5 text-xs border border-slate-800 space-y-1.5">
      <p className="text-slate-400 font-semibold border-b border-slate-800 pb-1">{label}</p>
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: entry.color }} />
            {entry.name}:
          </span>
          <span className="font-bold font-mono" style={{ color: entry.color }}>
            {formatPrice(entry.value)}
          </span>
        </div>
      ))}
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
      toast.success('Buy price updated successfully!');
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
  const monthlyChartData = monthly.map((m) => ({
    name: m.month_label,
    'Sale Revenue': parseFloat(m.revenue || 0),
    'Buy Cost': parseFloat(m.cost || 0),
    'Profit': parseFloat(m.profit || 0),
    margin: parseFloat(m.margin_pct || 0),
  }));

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <Spinner />
        <p className="text-xs font-semibold text-slate-400">Calculating financial metrics & margins...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">

      {/* ── 1. Page Header & Date Range Toolbar ── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Finance & Profit Analytics</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Track purchase cost (Buy Price), sales revenue (Sale Price), gross profit & margin
              </p>
            </div>
          </div>
        </div>

        {/* Quick Period Presets */}
        <div className="flex flex-wrap items-center gap-2">
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
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === p.value
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/70'
              }`}
            >
              {p.label}
            </button>
          ))}

          {period === 'custom' && (
            <div className="flex items-center gap-2 mt-2 sm:mt-0">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-slate-400 bg-slate-50"
              />
              <span className="text-slate-400 text-xs font-medium">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-slate-400 bg-slate-50"
              />
            </div>
          )}

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── 2. Primary Executive KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        {/* 1. Total Sale Revenue */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Sales (Revenue)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
              <IndianRupee className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
              {formatPrice(summary.total_revenue || 0)}
            </p>
            <p className="text-xs font-medium text-slate-400 mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {Number(summary.total_orders || 0).toLocaleString('en-IN')} paid orders placed
            </p>
          </div>
        </div>

        {/* 2. Total Buy Price / Purchase Cost */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Buy Cost (COGS)</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
              {formatPrice(summary.total_cost || 0)}
            </p>
            <p className="text-xs font-medium text-slate-400 mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              {Number(summary.total_units_sold || 0).toLocaleString('en-IN')} units purchased
            </p>
          </div>
        </div>

        {/* 3. Net / Gross Profit */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Net Profit</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl lg:text-3xl font-extrabold text-indigo-600 tracking-tight">
              {formatPrice(summary.net_profit || 0)}
            </p>
            <p className="text-xs font-medium text-slate-400 mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              Gross: {formatPrice(summary.gross_profit || 0)}
            </p>
          </div>
        </div>

        {/* 4. Profit Margin % */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Profit Margin</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
              {summary.profit_margin_pct || 0}%
            </p>
            <p className="text-xs font-medium text-slate-400 mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              Avg. Return per Sale
            </p>
          </div>
        </div>
      </div>

      {/* ── 3. Navigation Tabs ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        {[
          { id: 'overview',   label: '📊 Financial Overview & Trends' },
          { id: 'monthly',    label: '📅 Monthly Buy vs Sale Breakdown' },
          { id: 'products',   label: '📦 Product Profitability & Buy Prices' },
          { id: 'categories', label: '🏷️ Category Profit Margins' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === t.id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Monthly Comparison Bar Chart */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Monthly Sales Revenue vs Buying Cost vs Profit</h2>
                <p className="text-xs text-slate-400 mt-0.5">Month-by-month financial performance (Past 12 Months)</p>
              </div>
            </div>

            {monthlyChartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-slate-300 text-xs">
                No monthly sales history available
              </div>
            ) : (
              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChartData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} width={44} />
                    <Tooltip content={<FinanceChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                    <Bar dataKey="Sale Revenue" fill="#10b981" radius={[4, 4, 0, 0]} barSize={18} />
                    <Bar dataKey="Buy Cost" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={18} />
                    <Bar dataKey="Profit" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Quick Summary Grid: Top Gainers & Category Split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Top Profitable Products */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900">Highest Profit Generating Products</h3>
                <button onClick={() => setActiveTab('products')} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                  View All →
                </button>
              </div>
              <div className="space-y-2.5">
                {products.slice(0, 5).map((p, i) => (
                  <div key={p.product_id || i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-200/70 overflow-hidden flex items-center justify-center shrink-0">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.product_name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{p.product_name}</p>
                        <p className="text-[10.5px] text-slate-400">
                          Buy: {formatPrice(p.avg_cost_price)} · Sell: {formatPrice(p.avg_sale_price)} ({p.units_sold} sold)
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-extrabold text-emerald-600">+{formatPrice(p.net_profit)}</span>
                      <span className="block text-[10px] font-bold text-slate-400">{p.margin_pct}% margin</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Category Margin Distribution */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900">Department Profit Margins</h3>
                <button onClick={() => setActiveTab('categories')} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                  View All →
                </button>
              </div>
              <div className="space-y-3">
                {categories.slice(0, 5).map((c, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-slate-800">{c.category_name}</span>
                      <span className="font-extrabold text-indigo-600">
                        {formatPrice(c.profit)} <span className="text-slate-400 font-normal">({c.margin_pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, Math.max(0, c.margin_pct))}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: MONTHLY BREAKDOWN TABLE ── */}
      {activeTab === 'monthly' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Monthly Buy Price, Sale Revenue & Profit Log</h2>
              <p className="text-xs text-slate-400 mt-0.5">Historical breakdown of monthly purchase cost vs revenue</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
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
                    <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                      No monthly records available
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
                      <td className="px-5 py-3.5 text-xs font-extrabold text-emerald-600 text-right">
                        +{formatPrice(m.profit)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                          m.margin_pct >= 40
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : m.margin_pct >= 20
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
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

      {/* ── TAB 3: PRODUCT PROFITABILITY & BUY PRICE MANAGEMENT ── */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Product Profit & Buy Price Management</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Set and update buy prices to accurately calculate margins and profit
              </p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search product..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 bg-slate-50 w-64"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
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
                    <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                      No products found
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.product_id || p.product_name} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                            {p.image_url ? (
                              <img src={p.image_url} alt={p.product_name} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="h-4 w-4 text-slate-400" />
                            )}
                          </div>
                          <span className="text-xs font-bold text-slate-800 truncate max-w-[200px]">
                            {p.product_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500 font-medium">
                        {p.category_name}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {editingCostId === p.product_id ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <input
                              type="number"
                              value={costInput}
                              onChange={(e) => setCostInput(e.target.value)}
                              className="w-20 px-2 py-1 text-xs border border-emerald-400 rounded-lg focus:outline-none text-right font-bold"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveCost(p.product_id)}
                              disabled={updateCostMutation.isPending}
                              className="p-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                              title="Save Cost"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingCostId(p.product_id);
                              setCostInput(p.avg_cost_price || 0);
                            }}
                            className="group flex items-center justify-end gap-1 font-semibold text-slate-700 hover:text-indigo-600 text-xs w-full text-right"
                            title="Click to Edit Buy Price"
                          >
                            <span>{formatPrice(p.avg_cost_price)}</span>
                            <Edit3 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
                          </button>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-bold text-slate-900 text-right">
                        {formatPrice(p.avg_sale_price)}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-semibold text-slate-700 text-center">
                        {p.units_sold}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-medium text-slate-500 text-right">
                        {formatPrice(p.total_cost)}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-bold text-slate-900 text-right">
                        {formatPrice(p.total_revenue)}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-extrabold text-emerald-600 text-right">
                        +{formatPrice(p.net_profit)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                          p.margin_pct >= 40
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : p.margin_pct >= 20
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
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

      {/* ── TAB 4: CATEGORY BREAKDOWN ── */}
      {activeTab === 'categories' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Category Profitability Breakdown</h2>
            <p className="text-xs text-slate-400 mt-0.5">Department sales revenue vs purchase cost and profit margin</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
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
                    <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                      No category data available
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
                      <td className="px-5 py-3.5 text-xs font-extrabold text-emerald-600 text-right">
                        +{formatPrice(c.profit)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                          c.margin_pct >= 40
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : c.margin_pct >= 20
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
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
