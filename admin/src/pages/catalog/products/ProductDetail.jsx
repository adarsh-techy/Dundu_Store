import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import ResponsiveChart from '../../../components/ui/ResponsiveChart';
import {
  ArrowLeft, Package, ShoppingBag, RotateCcw, TrendingUp, User, Phone, Calendar,
  Pencil, CheckCircle2, AlertTriangle, Layers,
} from 'lucide-react';
import { productApi } from '../../../api';
import { formatPrice, formatDate } from '../../../utils/format';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';

const STATUS_STYLE = {
  pending:          'bg-amber-50 text-amber-700 border-amber-200',
  packed:           'bg-blue-50 text-blue-700 border-blue-200',
  shipped:          'bg-indigo-50 text-indigo-700 border-indigo-200',
  delivered:        'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled:        'bg-rose-50 text-rose-700 border-rose-200',
  return_requested: 'bg-orange-50 text-orange-700 border-orange-200',
  returned:         'bg-slate-100 text-slate-700 border-slate-200',
};

function StatCard({ icon: Icon, label, value, sub, iconBg = 'bg-slate-100 text-slate-700' }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
      <div className={`p-3 rounded-xl shrink-0 ${iconBg}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-black text-slate-900 tracking-tight">{value}</p>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">{label}</p>
        {sub && <p className="text-xs font-medium text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function getLast12Months() {
  const out = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('en-IN', { month: 'short', year: '2-digit' }),
    });
  }
  return out;
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-product-analytics', id],
    queryFn: () => productApi.getAnalytics(id),
    staleTime: 60_000,
    retry: 1,
  });

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <Spinner />
      <p className="text-xs font-semibold text-slate-500">Loading product metrics...</p>
    </div>
  );

  if (isError) return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 p-10 flex flex-col items-center justify-center text-center gap-3">
      <AlertTriangle className="h-8 w-8 text-rose-500" />
      <p className="text-sm font-bold text-slate-800">Failed to load product analytics</p>
      <p className="text-xs text-slate-400">{error?.message || 'Check that the backend server is running'}</p>
      <Button variant="outline" onClick={() => navigate('/products')} className="mt-2">
        Return to Products
      </Button>
    </div>
  );

  const { product, stats, monthly_sales = [], orders = [] } = data?.data || {};
  if (!product) return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 p-10 flex flex-col items-center justify-center text-center gap-3">
      <Package className="h-8 w-8 text-slate-400" />
      <p className="text-sm font-bold text-slate-800">Product not found</p>
      <Button variant="outline" onClick={() => navigate('/products')} className="mt-2">
        Return to Products
      </Button>
    </div>
  );

  const primaryImage = product.images?.find((i) => i.is_primary)?.url || product.images?.[0]?.url;
  const returnRate = stats?.total_orders > 0
    ? Math.round((stats.return_orders / stats.total_orders) * 100)
    : 0;

  const chartData = getLast12Months().map(({ key, label }) => {
    const found = monthly_sales.find((m) => m.month === key);
    return { month: label, units: found ? found.units : 0 };
  });

  const maxUnits = Math.max(...chartData.map((d) => d.units), 1);

  return (
    <div className="w-full space-y-6 pb-16">
      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/products')}
            className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 hover:text-slate-900 border border-slate-200"
            title="Back to Catalog"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              Product Performance & Metrics
            </h1>
            <p className="text-xs text-slate-500 font-medium">Real-time inventory levels, orders history, and monthly unit sales</p>
          </div>
        </div>

        <Button
          onClick={() => navigate(`/products/${product.id}/edit`)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl shadow-sm"
        >
          <Pencil className="h-3.5 w-3.5" /> Edit Product
        </Button>
      </div>

      {/* ── Product Hero Card ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 flex flex-col md:flex-row gap-6 items-start">
        <div className="w-24 h-28 sm:w-28 sm:h-32 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
          {primaryImage ? (
            <img src={primaryImage} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <Package className="h-10 w-10 text-slate-300" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {product.category_name || 'General Catalog'}
            </span>
            {product.sub_category && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200">
                {product.sub_category}
              </span>
            )}
            {product.product_code && (
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                {product.product_code}
              </span>
            )}
            {product.sku && (
              <span className="text-[11px] font-mono text-slate-400">
                SKU: {product.sku}
              </span>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {product.name}
          </h2>

          <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-slate-100">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block uppercase">Retail Price</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-xl font-black text-slate-900">
                  {formatPrice(product.offer_price || product.price)}
                </span>
                {product.offer_price && (
                  <span className="text-xs text-slate-400 line-through">
                    {formatPrice(product.price)}
                  </span>
                )}
              </div>
            </div>

            <div className="h-8 w-[1px] bg-slate-100" />

            <div>
              <span className="text-[11px] font-semibold text-slate-400 block uppercase">Inventory Stock</span>
              <div className="mt-0.5">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  product.stock === 0
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : product.stock < 10
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    product.stock === 0 ? 'bg-rose-500' : product.stock < 10 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`} />
                  {product.stock} units in warehouse
                </span>
              </div>
            </div>

            <div className="h-8 w-[1px] bg-slate-100" />

            <div>
              <span className="text-[11px] font-semibold text-slate-400 block uppercase">Visibility</span>
              <div className="mt-0.5 flex gap-1.5">
                {product.is_hidden ? (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">Hidden</span>
                ) : (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">Active Online</span>
                )}
                {product.is_featured && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">Trending</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Stat Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={ShoppingBag}
          label="Total Orders"
          value={stats?.total_orders || 0}
          iconBg="bg-slate-900 text-white"
          sub="All time purchase transactions"
        />
        <StatCard
          icon={TrendingUp}
          label="Units Sold"
          value={stats?.units_sold || 0}
          iconBg="bg-emerald-50 text-emerald-600 border border-emerald-100"
          sub="Dispatched to customers"
        />
        <StatCard
          icon={RotateCcw}
          label="Return Orders"
          value={stats?.return_orders || 0}
          iconBg="bg-amber-50 text-amber-600 border border-amber-100"
          sub={`${stats?.returned_units || 0} individual units`}
        />
        <StatCard
          icon={Package}
          label="Return Rate"
          value={`${returnRate}%`}
          iconBg={returnRate > 20 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-100 text-slate-700'}
          sub={returnRate > 20 ? 'Action Recommended' : 'Optimal threshold'}
        />
      </div>

      {/* ── Chart + Variants Ledger ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-slate-900 text-sm">Monthly Sales Trend</h2>
              <p className="text-xs text-slate-500 font-medium">12-month unit velocity history</p>
            </div>
            <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
              Peak: {maxUnits} pcs
            </span>
          </div>

          {maxUnits === 1 && chartData.every((d) => d.units === 0) ? (
            <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-xs">
              <Package className="h-8 w-8 text-slate-300 mb-2" />
              No sales logged yet for this product
            </div>
          ) : (
            <ResponsiveChart width="100%" height={230}>
              <BarChart data={chartData} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    borderColor: '#e2e8f0',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                    fontSize: '12px',
                  }}
                  formatter={(v) => [`${v} units`, 'Volume Sold']}
                />
                <Bar dataKey="units" fill="#0f172a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveChart>
          )}
        </div>

        {/* Variant Stock Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-slate-400" /> Variant Inventory
            </h2>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              {product.variants?.length || 0} Variants
            </span>
          </div>

          {!product.variants?.length ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs py-8">
              <Package className="h-8 w-8 text-slate-300 mb-1" />
              Standard product without variants
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-56 pr-1 divide-y divide-slate-100">
              {product.variants.map((v) => (
                <div key={v.id} className="pt-2 first:pt-0 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {v.size && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-xs font-bold">
                        {v.size}
                      </span>
                    )}
                    {v.color && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 text-xs font-medium capitalize border border-slate-200">
                        {v.color}
                      </span>
                    )}
                    {!v.size && !v.color && <span className="text-xs text-slate-400">Default SKU</span>}
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                    v.stock < 5
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}>
                    {v.stock} pcs {v.stock < 5 && '· Low'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Customer Orders Ledger ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-900 text-sm">Customer Orders</h2>
            <p className="text-xs text-slate-500 font-medium">Orders containing this product</p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
            {orders.length} Records
          </span>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs">
            <ShoppingBag className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            No customer order history for this product yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100 text-[11px]">
                <tr>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3">Variant</th>
                  <th className="px-5 py-3 text-center">Qty</th>
                  <th className="px-5 py-3">Order Date</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3">Return Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o, i) => (
                  <tr key={`${o.order_id}-${i}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                          {o.customer_name ? o.customer_name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <span className="truncate max-w-[140px]">{o.customer_name || 'Anonymous'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-500">
                      {o.customer_phone || '—'}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1.5 flex-wrap">
                        {o.size && <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">{o.size}</span>}
                        {o.color && <span className="px-1.5 py-0.5 rounded bg-slate-50 text-slate-600 capitalize border border-slate-200">{o.color}</span>}
                        {!o.size && !o.color && <span className="text-slate-400">—</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center font-bold text-slate-900">{o.quantity}</td>
                    <td className="px-5 py-3 text-slate-500">{formatDate(o.order_date)}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold border capitalize text-[10px] ${STATUS_STYLE[o.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                        {o.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-amber-700 font-medium">
                      {o.return_date ? formatDate(o.return_date) : <span className="text-slate-300">—</span>}
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
