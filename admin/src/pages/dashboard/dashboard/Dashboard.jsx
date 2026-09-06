import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, ShoppingBag, IndianRupee,
  AlertTriangle, Clock, Package, Users, UserCheck, ShoppingCart, RotateCcw,
  ArrowUpRight, ChevronRight, Layers, Eye,
} from 'lucide-react';
import { useState } from 'react';
import { dashboardApi } from '../../../api';
import Spinner from '../../../components/ui/Spinner';
import { formatPrice, formatDate } from '../../../utils/format';

/* ── Modern Subtle Status Badges ────────────────────────────────────────── */
const statusBadge = {
  pending:          'bg-amber-50 text-amber-700 border-amber-200/60',
  packed:           'bg-blue-50 text-blue-700 border-blue-200/60',
  shipped:          'bg-indigo-50 text-indigo-700 border-indigo-200/60',
  delivered:        'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  cancelled:        'bg-rose-50 text-rose-700 border-rose-200/60',
  returned:         'bg-slate-100 text-slate-600 border-slate-200',
  return_requested: 'bg-orange-50 text-orange-700 border-orange-200/60',
};

/* ── Executive KPI Card with Subtle Light Tint ──────────────────────────── */
function KpiCard({ title, value, sub, icon: Icon, accent = 'indigo', onClick }) {
  const accentStyles = {
    emerald: {
      cardBg: 'bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/30 border-emerald-200/80 hover:border-emerald-300',
      iconBg: 'bg-emerald-500 text-white shadow-sm shadow-emerald-200',
      titleColor: 'text-emerald-900/70',
      valueColor: 'text-emerald-950',
    },
    indigo: {
      cardBg: 'bg-gradient-to-br from-indigo-50/80 via-white to-indigo-50/30 border-indigo-200/80 hover:border-indigo-300',
      iconBg: 'bg-indigo-500 text-white shadow-sm shadow-indigo-200',
      titleColor: 'text-indigo-900/70',
      valueColor: 'text-indigo-950',
    },
    violet: {
      cardBg: 'bg-gradient-to-br from-purple-50/80 via-white to-purple-50/30 border-purple-200/80 hover:border-purple-300',
      iconBg: 'bg-purple-500 text-white shadow-sm shadow-purple-200',
      titleColor: 'text-purple-900/70',
      valueColor: 'text-purple-950',
    },
    blue: {
      cardBg: 'bg-gradient-to-br from-sky-50/80 via-white to-sky-50/30 border-sky-200/80 hover:border-sky-300',
      iconBg: 'bg-sky-500 text-white shadow-sm shadow-sky-200',
      titleColor: 'text-sky-900/70',
      valueColor: 'text-sky-950',
    },
  }[accent] || {
    cardBg: 'bg-gradient-to-br from-slate-50/80 via-white to-slate-50/30 border-slate-200 hover:border-slate-300',
    iconBg: 'bg-slate-700 text-white shadow-sm',
    titleColor: 'text-slate-600',
    valueColor: 'text-slate-900',
  };

  return (
    <div
      onClick={onClick}
      className={`group rounded-2xl p-5 border shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all duration-200 ${accentStyles.cardBg} ${
        onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <p className={`text-xs font-bold uppercase tracking-wider ${accentStyles.titleColor}`}>{title}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${accentStyles.iconBg}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3">
        <p className={`text-2xl lg:text-3xl font-extrabold tracking-tight ${accentStyles.valueColor}`}>{value}</p>
        {sub && (
          <p className="text-xs font-medium text-slate-500 mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Minimalist Alert / Metric Pill with Soft Tint ──────────────────────── */
function ActionStatPill({ label, value, icon: Icon, onClick, badgeColor = 'slate' }) {
  const pillClasses = {
    amber:  'bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 border-amber-200/80 text-amber-900',
    rose:   'bg-gradient-to-br from-rose-50/70 via-white to-rose-50/30 border-rose-200/80 text-rose-900',
    blue:   'bg-gradient-to-br from-sky-50/70 via-white to-sky-50/30 border-sky-200/80 text-sky-900',
    violet: 'bg-gradient-to-br from-violet-50/70 via-white to-violet-50/30 border-violet-200/80 text-violet-900',
    emerald:'bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/30 border-emerald-200/80 text-emerald-900',
    slate:  'bg-gradient-to-br from-slate-50/70 via-white to-slate-50/30 border-slate-200/80 text-slate-900',
  }[badgeColor] || 'bg-white border-slate-200/80 text-slate-900';

  const badgeIconBg = {
    amber:  'bg-amber-100/80 text-amber-700 border-amber-200',
    rose:   'bg-rose-100/80 text-rose-700 border-rose-200',
    blue:   'bg-sky-100/80 text-sky-700 border-sky-200',
    violet: 'bg-violet-100/80 text-violet-700 border-violet-200',
    emerald:'bg-emerald-100/80 text-emerald-700 border-emerald-200',
    slate:  'bg-slate-100 text-slate-700 border-slate-200',
  }[badgeColor] || 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <button
      onClick={onClick}
      className={`group flex-1 min-w-[170px] rounded-xl p-3.5 border shadow-sm hover:shadow hover:-translate-y-0.5 transition-all text-left flex items-center justify-between gap-3 ${pillClasses} ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${badgeIconBg}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-base font-extrabold text-slate-900 leading-tight truncate">{value}</p>
          <p className="text-[11px] font-semibold text-slate-500 truncate">{label}</p>
        </div>
      </div>
      {onClick && (
        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-600 transition-colors shrink-0" />
      )}
    </button>
  );
}

/* ── Clean Recharts Tooltip ─────────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white rounded-xl shadow-xl px-3.5 py-2 text-xs border border-slate-800">
      <p className="text-slate-400 font-medium mb-0.5">{label}</p>
      <p className="font-extrabold text-emerald-400 text-sm">{formatPrice(payload[0].value)}</p>
    </div>
  );
}

/* ── Clean Section Header ────────────────────────────────────────────────── */
function SectionTitle({ title, subtitle, action }) {
  return (
    <div className="flex items-end justify-between mb-3.5">
      <div>
        <h2 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ── Main Dashboard ─────────────────────────────────────────────────────── */
export default function Dashboard() {
  const navigate = useNavigate();
  const todayStr = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(todayStr);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', date],
    queryFn: () => dashboardApi.get(date),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3">
        <Spinner />
        <p className="text-xs font-semibold text-slate-400">Loading business metrics...</p>
      </div>
    );
  }

  const d = data?.data || {};

  const chartData = (d.revenue_chart || []).map((r) => ({
    date:   new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    online: parseFloat(r.revenue),
  }));

  const totalOnline = chartData.reduce((s, r) => s + r.online, 0);
  const displayDate = new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const isToday = date === todayStr;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10">

      {/* ── Top Header with Date Filter ── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Store Performance Overview</h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              Live Real-Time
            </span>
          </div>
          <p className="text-xs font-medium text-slate-400 mt-1">{displayDate}</p>
        </div>

        <div className="flex items-center gap-2.5">
          <input
            type="date"
            value={date}
            max={todayStr}
            onChange={(e) => setDate(e.target.value)}
            className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-slate-400 text-slate-700 bg-slate-50/50"
          />
          {!isToday && (
            <button
              onClick={() => setDate(todayStr)}
              className="text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition-colors"
            >
              Reset to Today
            </button>
          )}
        </div>
      </div>

      {/* ── Primary Executive KPIs (4 clean cards) ── */}
      <div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Total Revenue"
            value={formatPrice(d.total_sales || 0)}
            sub="All-time completed sales"
            icon={IndianRupee}
            accent="emerald"
            onClick={() => navigate('/orders')}
          />
          <KpiCard
            title="Total Orders"
            value={Number(d.total_orders || 0).toLocaleString('en-IN')}
            sub="All customer orders placed"
            icon={ShoppingBag}
            accent="indigo"
            onClick={() => navigate('/orders')}
          />
          <KpiCard
            title="Today's Revenue"
            value={formatPrice(d.today_sales || 0)}
            sub="Revenue generated today"
            icon={TrendingUp}
            accent="blue"
          />
          <KpiCard
            title="Today's Orders"
            value={d.today_orders ?? 0}
            sub="New orders placed today"
            icon={Package}
            accent="violet"
            onClick={() => navigate('/orders')}
          />
        </div>
      </div>

      {/* ── Operational Pulse Stats (Clean Action Pills) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ActionStatPill
          label="Pending Orders"
          value={d.pending_orders ?? 0}
          icon={Clock}
          badgeColor="amber"
          onClick={() => navigate('/orders?status=pending')}
        />
        <ActionStatPill
          label="Low Stock Items"
          value={d.low_stock ?? 0}
          icon={AlertTriangle}
          badgeColor="rose"
          onClick={() => navigate('/products?low_stock=1')}
        />
        <ActionStatPill
          label="Return Requests"
          value={d.total_returns ?? 0}
          icon={RotateCcw}
          badgeColor="rose"
          onClick={() => navigate('/returns')}
        />
        <ActionStatPill
          label="Active Cart Users"
          value={d.cart_users ?? 0}
          icon={ShoppingCart}
          badgeColor="blue"
          onClick={() => navigate('/carts')}
        />
      </div>

      {/* ── Customer & Traffic Insights ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ActionStatPill
          label="Total Registered Users"
          value={Number(d.total_users ?? 0).toLocaleString('en-IN')}
          icon={Users}
          badgeColor="slate"
          onClick={() => navigate('/users')}
        />
        <ActionStatPill
          label="Today's Active Logins"
          value={d.today_logins ?? 0}
          icon={UserCheck}
          badgeColor="emerald"
        />
        <ActionStatPill
          label="Today's Returns"
          value={d.today_returns ?? 0}
          icon={RotateCcw}
          badgeColor="slate"
          onClick={() => navigate('/returns')}
        />
        <ActionStatPill
          label="Return Rate Customer Base"
          value={d.return_users ?? 0}
          icon={Users}
          badgeColor="slate"
          onClick={() => navigate('/returns')}
        />
      </div>

      {/* ── Middle Row: Revenue Trend & Top Products ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* 30-Day Revenue Trend (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Revenue Trend (Last 30 Days)</h2>
              <p className="text-xs text-slate-400 mt-0.5">Daily online store revenue breakdown</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400">Period Total</span>
              <p className="text-sm font-extrabold text-emerald-600">{formatPrice(totalOnline)}</p>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-slate-300 text-xs">
              No revenue recordings in this period
            </div>
          ) : (
            <div className="w-full h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    width={44}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="online"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="url(#revenueGrad)"
                    dot={false}
                    activeDot={{ r: 5, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Top Products (1 col) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <SectionTitle
            title="Top Selling Products"
            subtitle="Ranked by total units sold"
            action={
              <button
                onClick={() => navigate('/products')}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                All Products →
              </button>
            }
          />

          {(!d.top_products || d.top_products.length === 0) ? (
            <div className="h-56 flex items-center justify-center text-slate-300 text-xs">
              No products sold yet
            </div>
          ) : (
            <div className="space-y-3 mt-2">
              {d.top_products.slice(0, 5).map((p, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200/70 overflow-hidden shrink-0 flex items-center justify-center">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{p.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      <span className="font-semibold text-slate-700">{p.units_sold}</span> sold · {p.stock} in stock
                    </p>
                  </div>
                  <span className="text-[11px] font-extrabold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md shrink-0">
                    #{i + 1}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Order Status Breakdown (Clean Segmented Grid) ── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
        <SectionTitle
          title="Order Fulfillment Breakdown"
          subtitle="Status distribution across all active orders"
          action={
            <button
              onClick={() => navigate('/orders')}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              Manage Orders →
            </button>
          }
        />

        {(!d.order_status_breakdown || d.order_status_breakdown.length === 0) ? (
          <div className="py-6 text-center text-slate-300 text-xs">No orders recorded</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
            {d.order_status_breakdown.map((s) => {
              const total = d.order_status_breakdown.reduce((sum, x) => sum + parseInt(x.count), 0);
              const pct = total > 0 ? Math.round((parseInt(s.count) / total) * 100) : 0;
              return (
                <div key={s.status} className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${statusBadge[s.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {s.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-extrabold text-slate-800">
                      {s.count} <span className="text-slate-400 font-normal text-[10px]">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-200/70 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-700 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Category Performance (Chart + Ranking) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Category Revenue Bar Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <SectionTitle
            title="Revenue by Category"
            subtitle="Category-wise sales distribution"
          />

          {(!d.category_sales || d.category_sales.every((c) => parseFloat(c.revenue) === 0)) ? (
            <div className="h-52 flex items-center justify-center text-slate-300 text-xs">
              No category sales data yet
            </div>
          ) : (
            <div className="w-full h-52 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={d.category_sales.filter((c) => parseFloat(c.revenue) > 0)}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  barSize={32}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="category" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} width={42} />
                  <Tooltip
                    formatter={(value) => [formatPrice(value), 'Revenue']}
                    contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]} fill="#475569" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Category Ranked List (1 col) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <SectionTitle
            title="Category Ranking"
            subtitle="Highest grossing departments"
          />

          {(!d.category_sales || d.category_sales.length === 0) ? (
            <p className="text-xs text-slate-300 text-center py-10">No data</p>
          ) : (
            <div className="space-y-3 mt-2">
              {d.category_sales.slice(0, 5).map((c, i) => (
                <div key={i} className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-extrabold flex items-center justify-center shrink-0 border border-slate-200">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{c.category}</p>
                      <p className="text-[10px] text-slate-400">{c.orders} orders · {c.units_sold} units</p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-slate-900 shrink-0">
                    {formatPrice(c.revenue)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Live Orders Table ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Recent Customer Orders</h2>
            <p className="text-xs text-slate-400 mt-0.5">Real-time incoming orders</p>
          </div>
          <button
            onClick={() => navigate('/orders')}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1"
          >
            View All Orders <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {(!d.recent_orders || d.recent_orders.length === 0) ? (
          <div className="py-12 text-center text-slate-300 text-xs">No orders recorded yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  {['Order ID', 'Customer', 'Contact Phone', 'Placed Date', 'Order Value', 'Status'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {d.recent_orders.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => navigate(`/orders/${o.id}`)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3.5 font-bold text-slate-900 text-xs">
                      #{o.order_number || o.id?.slice(0, 8)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
                          {(o.user_name || 'C')[0].toUpperCase()}
                        </div>
                        <span className="text-xs font-semibold text-slate-800 truncate max-w-[140px]">
                          {o.user_name || 'Customer'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">{o.user_phone || '—'}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-400">{formatDate(o.created_at)}</td>
                    <td className="px-5 py-3.5 text-xs font-extrabold text-slate-900">
                      {formatPrice(o.total)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border uppercase tracking-wider ${statusBadge[o.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {o.status.replace('_', ' ')}
                      </span>
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
