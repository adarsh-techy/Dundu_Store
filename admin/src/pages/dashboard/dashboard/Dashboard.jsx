import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, ShoppingBag, IndianRupee,
  AlertTriangle, Clock, Package, Users, UserCheck, ShoppingCart, RotateCcw,
  ArrowUpRight, ChevronRight, Layers, Eye, Calendar, Sparkles, CheckCircle2,
  Truck, ArrowRight, Activity, ShieldCheck, RefreshCw, Search, Sparkle,
  Layers3, Tag, Shirt, Scissors,
} from 'lucide-react';
import { dashboardApi } from '../../../api';
import Spinner from '../../../components/ui/Spinner';
import { formatPrice, formatDate, formatDateTime } from '../../../utils/format';

/* ── Modern Status Badges ───────────────────────────────────────────────── */
const statusBadge = {
  pending:          'bg-amber-50 text-amber-800 border-amber-200/80',
  packed:           'bg-sky-50 text-sky-800 border-sky-200/80',
  shipped:          'bg-indigo-50 text-indigo-800 border-indigo-200/80',
  delivered:        'bg-emerald-50 text-emerald-800 border-emerald-200/80',
  cancelled:        'bg-rose-50 text-rose-800 border-rose-200/80',
  returned:         'bg-slate-100 text-slate-800 border-slate-200',
  return_requested: 'bg-orange-50 text-orange-800 border-orange-200/80',
};

/* ── Executive Top KPI Card ─────────────────────────────────────────────── */
function ExecutiveKpiCard({ title, value, sub, icon: Icon, tone = 'emerald', trend, onClick }) {
  const tones = {
    emerald: {
      card: 'border-emerald-100 bg-gradient-to-br from-white via-white to-emerald-50/40 hover:border-emerald-300',
      iconBox: 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20',
      accent: 'text-emerald-950',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    blue: {
      card: 'border-sky-100 bg-gradient-to-br from-white via-white to-sky-50/40 hover:border-sky-300',
      iconBox: 'bg-sky-600 text-white shadow-sm shadow-sky-600/20',
      accent: 'text-sky-950',
      badge: 'bg-sky-50 text-sky-700 border-sky-200',
    },
    indigo: {
      card: 'border-indigo-100 bg-gradient-to-br from-white via-white to-indigo-50/40 hover:border-indigo-300',
      iconBox: 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20',
      accent: 'text-indigo-950',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
    violet: {
      card: 'border-violet-100 bg-gradient-to-br from-white via-white to-violet-50/40 hover:border-violet-300',
      iconBox: 'bg-violet-600 text-white shadow-sm shadow-violet-600/20',
      accent: 'text-violet-950',
      badge: 'bg-violet-50 text-violet-700 border-violet-200',
    },
    teal: {
      card: 'border-teal-100 bg-gradient-to-br from-white via-white to-teal-50/40 hover:border-teal-300',
      iconBox: 'bg-teal-600 text-white shadow-sm shadow-teal-600/20',
      accent: 'text-teal-950',
      badge: 'bg-teal-50 text-teal-700 border-teal-200',
    },
    slate: {
      card: 'border-slate-200 bg-gradient-to-br from-white via-white to-slate-50/40 hover:border-slate-300',
      iconBox: 'bg-slate-700 text-white shadow-sm shadow-slate-700/20',
      accent: 'text-slate-950',
      badge: 'bg-slate-100 text-slate-700 border-slate-200',
    },
  }[tone] || {
    card: 'border-slate-200 bg-white hover:border-slate-300',
    iconBox: 'bg-slate-700 text-white',
    accent: 'text-slate-900',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl p-4 sm:p-5 border shadow-sm transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${tones.card} ${
        onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tones.iconBox}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-3">
        <p className={`text-2xl lg:text-[28px] font-extrabold tracking-tight ${tones.accent}`}>
          {value}
        </p>
        <div className="mt-1 flex items-center justify-between gap-2">
          {sub && (
            <p className="text-xs text-slate-500 font-medium truncate">
              {sub}
            </p>
          )}
          {trend && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${tones.badge}`}>
              {trend}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Urgent Operational Action Card ─────────────────────────────────────── */
function ActionCard({ title, count, description, buttonLabel, icon: Icon, tone = 'amber', onClick }) {
  const tones = {
    amber: {
      card: 'border-amber-200/90 bg-gradient-to-br from-amber-50/40 via-white to-amber-50/10 hover:border-amber-300',
      iconBox: 'bg-amber-100 text-amber-700 border border-amber-200',
      btn: 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200',
      badge: 'bg-amber-100 text-amber-800',
    },
    rose: {
      card: 'border-rose-200/90 bg-gradient-to-br from-rose-50/40 via-white to-rose-50/10 hover:border-rose-300',
      iconBox: 'bg-rose-100 text-rose-700 border border-rose-200',
      btn: 'bg-rose-50 hover:bg-rose-100 text-rose-900 border-rose-200',
      badge: 'bg-rose-100 text-rose-800',
    },
    orange: {
      card: 'border-orange-200/90 bg-gradient-to-br from-orange-50/40 via-white to-orange-50/10 hover:border-orange-300',
      iconBox: 'bg-orange-100 text-orange-700 border border-orange-200',
      btn: 'bg-orange-50 hover:bg-orange-100 text-orange-900 border-orange-200',
      badge: 'bg-orange-100 text-orange-800',
    },
    sky: {
      card: 'border-sky-200/90 bg-gradient-to-br from-sky-50/40 via-white to-sky-50/10 hover:border-sky-300',
      iconBox: 'bg-sky-100 text-sky-700 border border-sky-200',
      btn: 'bg-sky-50 hover:bg-sky-100 text-sky-900 border-sky-200',
      badge: 'bg-sky-100 text-sky-800',
    },
  }[tone] || {
    card: 'border-slate-200 bg-white hover:border-slate-300',
    iconBox: 'bg-slate-100 text-slate-700 border border-slate-200',
    btn: 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200',
    badge: 'bg-slate-100 text-slate-700',
  };

  return (
    <div className={`rounded-2xl p-4 sm:p-5 border shadow-sm transition-all duration-200 flex flex-col justify-between ${tones.card}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tones.iconBox}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              {title}
            </h3>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5 leading-tight">
              {count}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100/80 flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500 font-medium truncate">
          {description}
        </p>
        <button
          onClick={onClick}
          className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all shrink-0 flex items-center gap-1 ${tones.btn}`}
        >
          {buttonLabel} <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

/* ── Clean Chart Tooltip ─────────────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white rounded-xl shadow-xl px-4 py-2.5 text-xs border border-slate-800">
      <p className="text-slate-400 font-medium mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        <p className="font-extrabold text-emerald-400 text-sm">
          {formatPrice(payload[0].value)}
        </p>
      </div>
    </div>
  );
}

/* ── Main Full-Width Dashboard ───────────────────────────────────────────── */
export default function Dashboard() {
  const navigate = useNavigate();
  const todayStr = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(todayStr);
  const [fashionTab, setFashionTab] = useState('sub_categories'); // 'sub_categories' | 'types' | 'patterns'
  const [searchOrder, setSearchOrder] = useState('');

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['dashboard', date],
    queryFn: () => dashboardApi.get(date),
  });

  const d = data?.data || {};

  // 30-Day chart data processing
  const chartData = useMemo(() => {
    return (d.revenue_chart || []).map((r) => ({
      date: new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      revenue: parseFloat(r.revenue || 0),
    }));
  }, [d.revenue_chart]);

  const total30DayRevenue = useMemo(() => {
    return chartData.reduce((s, r) => s + r.revenue, 0);
  }, [chartData]);

  const peakDayRevenue = useMemo(() => {
    return chartData.reduce((max, r) => (r.revenue > max ? r.revenue : max), 0);
  }, [chartData]);

  // Orders table search filtering
  const filteredOrders = useMemo(() => {
    const list = d.recent_orders || [];
    if (!searchOrder.trim()) return list;
    const q = searchOrder.toLowerCase().trim();
    return list.filter((o) =>
      (o.order_number || '').toLowerCase().includes(q) ||
      (o.user_name || '').toLowerCase().includes(q) ||
      (o.user_phone || '').toLowerCase().includes(q) ||
      (o.status || '').toLowerCase().includes(q)
    );
  }, [d.recent_orders, searchOrder]);

  const displayDate = new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const isToday = date === todayStr;

  // Average Order Value calculation
  const totalOrdersCount = parseInt(d.total_orders || 0, 10);
  const totalSalesVal = parseFloat(d.total_sales || 0);
  const averageOrderValue = totalOrdersCount > 0 ? Math.round(totalSalesVal / totalOrdersCount) : 0;

  // Fulfillment pipeline breakdown calculation
  const totalStatusBreakdown = (d.order_status_breakdown || []).reduce(
    (sum, x) => sum + parseInt(x.count || 0, 10), 0
  );

  // Fashion attribute active list
  const activeFashionList = useMemo(() => {
    if (fashionTab === 'sub_categories') return d.top_sub_categories || [];
    if (fashionTab === 'types') return d.top_types || [];
    if (fashionTab === 'patterns') return d.top_patterns || [];
    return [];
  }, [fashionTab, d.top_sub_categories, d.top_types, d.top_patterns]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Spinner />
        <p className="text-xs font-semibold text-slate-500">Loading Dundu Store executive telemetry...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-16">

      {/* ── 1. Top Executive Command Bar ──────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Executive Operations Dashboard
            </h1>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Store Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Real-time analytics & inventory intelligence for <span className="text-slate-800 font-semibold">{displayDate}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Quick Date Shortcuts */}
          <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
            <button
              onClick={() => setDate(todayStr)}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                isToday ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => {
                const y = new Date();
                y.setDate(y.getDate() - 1);
                setDate(y.toISOString().slice(0, 10));
              }}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                date !== todayStr ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Custom
            </button>
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <Calendar className="h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={date}
              max={todayStr}
              onChange={(e) => setDate(e.target.value)}
              className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
            />
          </div>

          {/* Refresh Action */}
          <button
            onClick={() => refetch()}
            title="Refresh dashboard data"
            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── 2. Primary Executive Financial Matrix (6 Cards Full-Width) ─────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <ExecutiveKpiCard
          title="Gross Sales"
          value={formatPrice(d.total_sales || 0)}
          sub="All-time paid revenue"
          trend="All Time"
          icon={IndianRupee}
          tone="emerald"
          onClick={() => navigate('/orders')}
        />
        <ExecutiveKpiCard
          title="Today's Revenue"
          value={formatPrice(d.today_sales || 0)}
          sub="Paid sales today"
          trend="Live intake"
          icon={TrendingUp}
          tone="blue"
        />
        <ExecutiveKpiCard
          title="Total Orders"
          value={totalOrdersCount.toLocaleString('en-IN')}
          sub="All-time orders"
          trend="Cumulative"
          icon={ShoppingBag}
          tone="indigo"
          onClick={() => navigate('/orders')}
        />
        <ExecutiveKpiCard
          title="Today's Orders"
          value={d.today_orders ?? 0}
          sub="Placed on selected date"
          trend="Daily intake"
          icon={Package}
          tone="violet"
          onClick={() => navigate('/orders')}
        />
        <ExecutiveKpiCard
          title="Avg. Order Value"
          value={formatPrice(averageOrderValue)}
          sub="Basket size average"
          trend="Per order"
          icon={Activity}
          tone="teal"
        />
        <ExecutiveKpiCard
          title="Total Customers"
          value={Number(d.total_users ?? 0).toLocaleString('en-IN')}
          sub="Registered accounts"
          trend="Shoppers"
          icon={Users}
          tone="slate"
          onClick={() => navigate('/users')}
        />
      </div>

      {/* ── 3. Operational Action Center (4 Cards) ─────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Immediate Operational Action Center
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              High Priority
            </span>
          </div>
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            Direct dispatch and inventory resolution
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ActionCard
            title="Pending Fulfillment"
            count={d.pending_orders ?? 0}
            description="Orders awaiting pack & dispatch"
            buttonLabel="Fulfill Orders"
            icon={Clock}
            tone="amber"
            onClick={() => navigate('/orders?status=pending')}
          />
          <ActionCard
            title="Low Stock Alert"
            count={d.low_stock ?? 0}
            description="Items with less than 10 units"
            buttonLabel="Reorder Stock"
            icon={AlertTriangle}
            tone="rose"
            onClick={() => navigate('/products?low_stock=1')}
          />
          <ActionCard
            title="Return Requests"
            count={d.total_returns ?? 0}
            description="Open customer return claims"
            buttonLabel="Review Claims"
            icon={RotateCcw}
            tone="orange"
            onClick={() => navigate('/returns')}
          />
          <ActionCard
            title="Active Carts"
            count={d.cart_users ?? 0}
            description="Shoppers with items in bag"
            buttonLabel="Inspect Carts"
            icon={ShoppingCart}
            tone="sky"
            onClick={() => navigate('/carts')}
          />
        </div>
      </div>

      {/* ── 4. Revenue Velocity & Fulfillment Pipeline Split (Full-Width) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* 30-Day Revenue Trend (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  30-Day Revenue Trajectory
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Paid Sales
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Completed transactions recorded daily over the past month
              </p>
            </div>
            <div className="flex items-center gap-4 bg-slate-50 border border-slate-100 px-3.5 py-2 rounded-xl">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">30-Day Total</p>
                <p className="text-sm font-extrabold text-emerald-700">{formatPrice(total30DayRevenue)}</p>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Peak Day</p>
                <p className="text-sm font-extrabold text-slate-900">{formatPrice(peakDayRevenue)}</p>
              </div>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs">
              <Package className="h-8 w-8 text-slate-300 mb-2" />
              No revenue recordings in this 30-day window
            </div>
          ) : (
            <div className="w-full h-64 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGradArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    width={50}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#059669"
                    strokeWidth={2.5}
                    fill="url(#revenueGradArea)"
                    dot={false}
                    activeDot={{ r: 5, fill: '#059669', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Order Fulfillment Pipeline (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Fulfillment Pipeline
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Total lifecycle breakdown ({totalOrdersCount} lifetime orders)
              </p>
            </div>
            <button
              onClick={() => navigate('/orders')}
              className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1 transition-colors"
            >
              Orders Manager <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {(!d.order_status_breakdown || d.order_status_breakdown.length === 0) ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs">
              <ShoppingBag className="h-8 w-8 text-slate-300 mb-2" />
              No orders recorded in system
            </div>
          ) : (
            <div className="space-y-3 mt-1">
              {d.order_status_breakdown.map((s) => {
                const count = parseInt(s.count, 10);
                const pct = totalStatusBreakdown > 0 ? Math.round((count / totalStatusBreakdown) * 100) : 0;

                const colorMeter = {
                  pending:          'bg-amber-500',
                  packed:           'bg-sky-500',
                  shipped:          'bg-indigo-500',
                  delivered:        'bg-emerald-500',
                  cancelled:        'bg-rose-500',
                  returned:         'bg-slate-500',
                  return_requested: 'bg-orange-500',
                }[s.status] || 'bg-slate-600';

                return (
                  <div
                    key={s.status}
                    onClick={() => navigate(`/orders?status=${s.status}`)}
                    className="p-2.5 rounded-xl hover:bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${statusBadge[s.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                          {s.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900">{count} orders</span>
                        <span className="text-[11px] text-slate-400 font-medium">({pct}%)</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${colorMeter}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── 5. Product & Merchandising Intelligence (3 Columns) ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Col 1: Best Selling Products */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Top Selling Products</h2>
              <p className="text-xs text-slate-500 mt-0.5">Highest order volume items</p>
            </div>
            <button
              onClick={() => navigate('/products')}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-colors"
            >
              Catalog <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {(!d.top_products || d.top_products.length === 0) ? (
            <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-xs">
              <Package className="h-8 w-8 text-slate-300 mb-2" />
              No products sold yet
            </div>
          ) : (
            <div className="space-y-3">
              {d.top_products.slice(0, 5).map((p, i) => (
                <div
                  key={i}
                  onClick={() => navigate('/products')}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200/80 overflow-hidden shrink-0 flex items-center justify-center">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{p.name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                      <span className="font-extrabold text-emerald-700">{p.units_sold} sold</span>
                      <span>·</span>
                      <span className={`${p.stock < 10 ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                        {p.stock} in stock
                      </span>
                    </p>
                  </div>
                  <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 text-xs font-extrabold flex items-center justify-center shrink-0 border border-slate-200">
                    #{i + 1}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Col 2: Category Revenue Breakdown */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Category Revenue</h2>
              <p className="text-xs text-slate-500 mt-0.5">Sales contribution by department</p>
            </div>
            <button
              onClick={() => navigate('/categories')}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-colors"
            >
              Categories <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {(!d.category_sales || d.category_sales.length === 0) ? (
            <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-xs">
              <Layers className="h-8 w-8 text-slate-300 mb-2" />
              No category sales recorded
            </div>
          ) : (
            <div className="space-y-3">
              {d.category_sales.slice(0, 5).map((c, i) => {
                const totalCatRev = d.category_sales.reduce((sum, item) => sum + parseFloat(item.revenue || 0), 0);
                const pct = totalCatRev > 0 ? Math.round((parseFloat(c.revenue) / totalCatRev) * 100) : 0;

                return (
                  <div key={i} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 truncate">{c.category}</span>
                      <span className="font-extrabold text-slate-900">{formatPrice(c.revenue)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{c.orders} orders · {c.units_sold} units</span>
                      <span className="font-semibold text-slate-600">{pct}% share</span>
                    </div>
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-700 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Col 3: Fashion Intelligence (Tabs for Sub-Categories / Types / Patterns) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="mb-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Fashion Intelligence</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                Merchandising
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Top performing styles & customer preferences</p>
          </div>

          {/* Fashion Tabs */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200 mb-3">
            <button
              onClick={() => setFashionTab('sub_categories')}
              className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-all ${
                fashionTab === 'sub_categories' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sub-Category
            </button>
            <button
              onClick={() => setFashionTab('types')}
              className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-all ${
                fashionTab === 'types' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Type / Cut
            </button>
            <button
              onClick={() => setFashionTab('patterns')}
              className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-all ${
                fashionTab === 'patterns' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pattern / Work
            </button>
          </div>

          {activeFashionList.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs">
              <Tag className="h-8 w-8 text-slate-300 mb-2" />
              No style metadata recorded yet
            </div>
          ) : (
            <div className="space-y-2.5">
              {activeFashionList.slice(0, 5).map((item, idx) => {
                const maxUnits = activeFashionList[0]?.units_sold || 1;
                const fillPct = Math.round((item.units_sold / maxUnits) * 100);

                return (
                  <div key={idx} className="p-2 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-slate-800">{item.name}</span>
                      </div>
                      <span className="font-extrabold text-indigo-700 text-xs">{item.units_sold} sold</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${fillPct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── 6. Customer Engagement & Service Telemetry (4 Horizontal Cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-extrabold text-slate-900">{d.today_logins ?? 0}</p>
              <p className="text-xs font-semibold text-slate-600">Active Logins Today</p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-slate-400">Visitors</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center shrink-0">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-extrabold text-slate-900">{d.cart_users ?? 0}</p>
              <p className="text-xs font-semibold text-slate-600">Active Cart Shoppers</p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
            High Intent
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-700 border border-orange-200 flex items-center justify-center shrink-0">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-extrabold text-slate-900">{d.today_returns ?? 0}</p>
              <p className="text-xs font-semibold text-slate-600">Today's Returns</p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-slate-500">
            {d.return_users ?? 0} requesters
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-extrabold text-slate-900">
                {totalOrdersCount > 0 ? `${(((totalOrdersCount - (d.total_returns || 0)) / totalOrdersCount) * 100).toFixed(0)}%` : '100%'}
              </p>
              <p className="text-xs font-semibold text-slate-600">Satisfaction Rate</p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            Optimal
          </span>
        </div>
      </div>

      {/* ── 7. Full-Width Recent Live Orders Ledger ──────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Recent Live Customer Transactions</h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {filteredOrders.length} orders
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Latest incoming orders placed across the Dundu Store online catalog
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Search Filter */}
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search order #, customer, phone..."
                value={searchOrder}
                onChange={(e) => setSearchOrder(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 w-64"
              />
            </div>

            <button
              onClick={() => navigate('/orders')}
              className="text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5"
            >
              Full Orders Manager <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <ShoppingBag className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            No customer orders matching the criteria
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Order Ref</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Contact Phone</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Placed Date</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Order Value</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => navigate(`/orders/${o.id}`)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="px-5 py-3.5 font-bold text-slate-900 text-xs">
                      #{o.order_number || o.id?.slice(0, 8)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
                          {(o.user_name || 'C')[0].toUpperCase()}
                        </div>
                        <span className="text-xs font-semibold text-slate-800 truncate max-w-[160px]">
                          {o.user_name || 'Guest Customer'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500 font-mono">
                      {o.user_phone || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">
                      {formatDate(o.created_at)}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-extrabold text-slate-900">
                      {formatPrice(o.total)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border uppercase tracking-wider ${statusBadge[o.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                        {o.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/orders/${o.id}`);
                        }}
                        className="text-xs font-bold text-slate-600 hover:text-slate-900 group-hover:text-emerald-700 transition-colors inline-flex items-center gap-1"
                      >
                        Details <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
