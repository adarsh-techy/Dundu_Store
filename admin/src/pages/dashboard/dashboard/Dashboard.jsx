import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, ShoppingBag, IndianRupee,
  AlertTriangle, Clock, Package, Users, UserCheck, ShoppingCart, RotateCcw,
  ArrowUpRight, Layers, Calendar, CheckCircle2,
  ArrowRight, Activity, ShieldCheck, RefreshCw, Search,
  Tag, Filter,
} from 'lucide-react';
import { dashboardApi } from '../../../api';
import Spinner from '../../../components/ui/Spinner';
import { formatPrice, formatDate } from '../../../utils/format';

/* ── Status Badges ───────────────────────────────────────────────────────── */
const statusBadge = {
  pending:          'bg-amber-50 text-amber-800 border-amber-200/80',
  packed:           'bg-sky-50 text-sky-800 border-sky-200/80',
  shipped:          'bg-indigo-50 text-indigo-800 border-indigo-200/80',
  delivered:        'bg-emerald-50 text-emerald-800 border-emerald-200/80',
  cancelled:        'bg-rose-50 text-rose-800 border-rose-200/80',
  returned:         'bg-slate-100 text-slate-800 border-slate-200',
  return_requested: 'bg-orange-50 text-orange-800 border-orange-200/80',
};

/* ── Hero Metric Card ────────────────────────────────────────────────────── */
function HeroMetricCard({ title, value, sub, icon: Icon, tone = 'emerald', badge, onClick }) {
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

/* ── Urgent Operational Alert Tile ───────────────────────────────────────── */
function UrgentActionTile({ title, count, subtitle, buttonLabel, icon: Icon, tone = 'amber', onClick }) {
  const tones = {
    amber: {
      card: 'border-amber-200/90 bg-amber-50/30 hover:border-amber-300',
      iconBox: 'bg-amber-100 text-amber-800 border-amber-200',
      btn: 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300/80',
      badge: 'bg-amber-100 text-amber-900',
    },
    rose: {
      card: 'border-rose-200/90 bg-rose-50/30 hover:border-rose-300',
      iconBox: 'bg-rose-100 text-rose-800 border-rose-200',
      btn: 'bg-rose-100 hover:bg-rose-200 text-rose-900 border-rose-300/80',
      badge: 'bg-rose-100 text-rose-900',
    },
    orange: {
      card: 'border-orange-200/90 bg-orange-50/30 hover:border-orange-300',
      iconBox: 'bg-orange-100 text-orange-800 border-orange-200',
      btn: 'bg-orange-100 hover:bg-orange-200 text-orange-900 border-orange-300/80',
      badge: 'bg-orange-100 text-orange-900',
    },
    sky: {
      card: 'border-sky-200/90 bg-sky-50/30 hover:border-sky-300',
      iconBox: 'bg-sky-100 text-sky-800 border-sky-200',
      btn: 'bg-sky-100 hover:bg-sky-200 text-sky-900 border-sky-300/80',
      badge: 'bg-sky-100 text-sky-900',
    },
  }[tone] || {
    card: 'border-slate-200 bg-slate-50/40',
    iconBox: 'bg-slate-100 text-slate-800 border-slate-200',
    btn: 'bg-slate-100 text-slate-900 border-slate-200',
    badge: 'bg-slate-100 text-slate-900',
  };

  return (
    <div className={`rounded-2xl p-4 border transition-all duration-200 flex flex-col justify-between ${tones.card}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${tones.iconBox}`}>
            <Icon className="h-4 w-4" />
          </div>
          <span className="text-xs font-bold text-slate-700 tracking-tight">
            {title}
          </span>
        </div>
        <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${tones.badge}`}>
          {count}
        </span>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between gap-2">
        <p className="text-[11px] text-slate-500 font-medium truncate">
          {subtitle}
        </p>
        <button
          onClick={onClick}
          className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all shrink-0 flex items-center gap-1 cursor-pointer ${tones.btn}`}
        >
          {buttonLabel} <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

/* ── Custom Chart Tooltip ────────────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-950 text-white rounded-xl shadow-xl px-4 py-2.5 text-xs border border-slate-800">
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

/* ── Master Dashboard Component ──────────────────────────────────────────── */
export default function Dashboard() {
  const navigate = useNavigate();
  const todayStr = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(todayStr);
  const [fashionTab, setFashionTab] = useState('sub_categories'); // 'sub_categories' | 'types' | 'patterns'
  const [searchOrder, setSearchOrder] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');

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

  // Orders table search & status filtering
  const filteredOrders = useMemo(() => {
    let list = d.recent_orders || [];
    if (orderStatusFilter !== 'all') {
      list = list.filter((o) => (o.status || '').toLowerCase() === orderStatusFilter.toLowerCase());
    }
    if (!searchOrder.trim()) return list;
    const q = searchOrder.toLowerCase().trim();
    return list.filter((o) =>
      (o.order_number || '').toLowerCase().includes(q) ||
      (o.user_name || '').toLowerCase().includes(q) ||
      (o.user_phone || '').toLowerCase().includes(q) ||
      (o.status || '').toLowerCase().includes(q)
    );
  }, [d.recent_orders, searchOrder, orderStatusFilter]);

  const displayDate = new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
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

  // Active fashion tab list
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
        <p className="text-xs font-semibold text-slate-500">Loading store telemetry and analytics...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-16">

      {/* ── 1. Clean Top Header Bar ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Store Intelligence & Operations
            </h1>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Telemetry
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Real-time analytics and inventory telemetry for <span className="text-slate-800 font-semibold">{displayDate}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Quick Date Switcher */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200/70">
            <button
              onClick={() => setDate(todayStr)}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                isToday ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
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
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                date !== todayStr ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Yesterday
            </button>
          </div>

          {/* Calendar Picker */}
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
            title="Refresh telemetry"
            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl transition-all cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── 2. Primary Financial & Volume Barometer (4 Expansive Hero Cards) ─ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <HeroMetricCard
          title="Total Gross Revenue"
          value={formatPrice(d.total_sales || 0)}
          sub="All-time verified paid sales"
          badge="Verified"
          icon={IndianRupee}
          tone="emerald"
          onClick={() => navigate('/orders')}
        />
        <HeroMetricCard
          title="Today's Performance"
          value={formatPrice(d.today_sales || 0)}
          sub={`${d.today_orders ?? 0} orders placed today`}
          badge="Live Intake"
          icon={TrendingUp}
          tone="sky"
          onClick={() => navigate('/orders')}
        />
        <HeroMetricCard
          title="Average Order Value"
          value={formatPrice(averageOrderValue)}
          sub={`Across ${totalOrdersCount.toLocaleString('en-IN')} total orders`}
          badge="Basket Size"
          icon={Activity}
          tone="indigo"
        />
        <HeroMetricCard
          title="Registered Shoppers"
          value={Number(d.total_users ?? 0).toLocaleString('en-IN')}
          sub={`${d.today_logins ?? 0} active logins today`}
          badge="Customer Base"
          icon={Users}
          tone="violet"
          onClick={() => navigate('/users')}
        />
      </div>

      {/* ── 3. Operational Dispatch Hub (4 Actionable Task Tiles) ─────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Operational Dispatch Hub
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              Merchant Tasks
            </span>
          </div>
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            Direct dispatch and inventory resolution
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <UrgentActionTile
            title="Pending Dispatch"
            count={d.pending_orders ?? 0}
            subtitle="Orders awaiting pack and dispatch"
            buttonLabel="Fulfill Orders"
            icon={Clock}
            tone="amber"
            onClick={() => navigate('/orders?status=pending')}
          />
          <UrgentActionTile
            title="Low Stock Guard"
            count={d.low_stock ?? 0}
            subtitle="Items with less than 10 units in warehouse"
            buttonLabel="Reorder Stock"
            icon={AlertTriangle}
            tone="rose"
            onClick={() => navigate('/inventory')}
          />
          <UrgentActionTile
            title="Customer Returns"
            count={d.total_returns ?? 0}
            subtitle="Open return requests awaiting inspection"
            buttonLabel="Review Claims"
            icon={RotateCcw}
            tone="orange"
            onClick={() => navigate('/returns')}
          />
          <UrgentActionTile
            title="Active Bag Carts"
            count={d.cart_users ?? 0}
            subtitle="Shoppers with unpurchased items"
            buttonLabel="Inspect Carts"
            icon={ShoppingCart}
            tone="sky"
            onClick={() => navigate('/carts')}
          />
        </div>
      </div>

      {/* ── 4. Revenue Velocity & Fulfillment Lifecycle Split ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* 30-Day Sales Trajectory (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  30-Day Sales Velocity
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Paid Volume
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Completed transactions recorded daily over the past 30 days
              </p>
            </div>
            <div className="flex items-center gap-4 bg-slate-50 border border-slate-100 px-3.5 py-2 rounded-xl">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">30-Day Volume</p>
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

        {/* Order Lifecycle Breakdown (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Order Lifecycle Distribution
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Total fulfillment stages ({totalOrdersCount} lifetime orders)
              </p>
            </div>
            <button
              onClick={() => navigate('/orders')}
              className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1 transition-colors cursor-pointer"
            >
              Orders Manager <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {(!d.order_status_breakdown || d.order_status_breakdown.length === 0) ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs">
              <ShoppingBag className="h-8 w-8 text-slate-300 mb-2" />
              No order stages recorded
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

        {/* Col 1: Best-Selling Products */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Best-Selling Items</h2>
              <p className="text-xs text-slate-500 mt-0.5">Highest order volume merchandise</p>
            </div>
            <button
              onClick={() => navigate('/products')}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-colors cursor-pointer"
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
                      <span className={p.stock < 10 ? 'text-rose-600 font-bold' : 'text-slate-500'}>
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

        {/* Col 2: Category Sales Distribution */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Category Contribution</h2>
              <p className="text-xs text-slate-500 mt-0.5">Sales contribution by department</p>
            </div>
            <button
              onClick={() => navigate('/categories')}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-colors cursor-pointer"
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

        {/* Col 3: Fashion & Style Intelligence */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="mb-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Fashion Intelligence</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                Style Telemetry
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Top performing styles & customer preferences</p>
          </div>

          {/* Fashion Segment Tabs */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200 mb-3">
            <button
              onClick={() => setFashionTab('sub_categories')}
              className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-all cursor-pointer ${
                fashionTab === 'sub_categories' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sub-Category
            </button>
            <button
              onClick={() => setFashionTab('types')}
              className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-all cursor-pointer ${
                fashionTab === 'types' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cut / Type
            </button>
            <button
              onClick={() => setFashionTab('patterns')}
              className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-all cursor-pointer ${
                fashionTab === 'patterns' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
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

      {/* ── 6. Customer Engagement & Health Strip ──────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
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

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center shrink-0">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-extrabold text-slate-900">{d.cart_users ?? 0}</p>
              <p className="text-xs font-semibold text-slate-600">Active Bag Shoppers</p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
            High Intent
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
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

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-extrabold text-slate-900">
                {totalOrdersCount > 0 ? `${(((totalOrdersCount - (d.total_returns || 0)) / totalOrdersCount) * 100).toFixed(0)}%` : '100%'}
              </p>
              <p className="text-xs font-semibold text-slate-600">Fulfillment Success</p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            Optimal
          </span>
        </div>
      </div>

      {/* ── 7. Recent Customer Transactions Ledger ───────────────────────── */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Recent Customer Transactions</h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {filteredOrders.length} orders
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Latest incoming transactions placed across the Dundu Store online catalog
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Status Filter Tabs */}
            <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200/70 text-xs font-bold">
              {['all', 'pending', 'shipped', 'delivered', 'cancelled'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setOrderStatusFilter(tab)}
                  className={`px-2.5 py-1 rounded-lg capitalize transition-all cursor-pointer ${
                    orderStatusFilter === tab ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search order #, customer, phone..."
                value={searchOrder}
                onChange={(e) => setSearchOrder(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 w-56 sm:w-64"
              />
            </div>

            <button
              onClick={() => navigate('/orders')}
              className="text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              All Orders <ArrowUpRight className="h-3.5 w-3.5" />
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
                        className="text-xs font-bold text-slate-600 hover:text-slate-900 group-hover:text-emerald-700 transition-colors inline-flex items-center gap-1 cursor-pointer"
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
