import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  ArrowLeft, Package, ShoppingBag, RotateCcw, TrendingUp, User, Phone, Calendar,
} from 'lucide-react';
import { productApi } from '../../../api';
import { formatPrice, formatDate } from '../../../utils/format';
import Spinner from '../../../components/ui/Spinner';

const STATUS_STYLE = {
  pending:          'bg-blue-100 text-blue-700',
  packed:           'bg-indigo-100 text-indigo-700',
  shipped:          'bg-cyan-100 text-cyan-700',
  delivered:        'bg-green-100 text-green-700',
  cancelled:        'bg-red-100 text-red-700',
  return_requested: 'bg-orange-100 text-orange-700',
  returned:         'bg-gray-200 text-gray-600',
};

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className={`rounded-2xl border p-5 flex items-start gap-4 ${color}`}>
      <div className="p-2.5 rounded-xl bg-white/60">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm font-medium opacity-80">{label}</p>
        {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
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
    <div className="flex items-center justify-center py-20">
      <Spinner />
    </div>
  );

  if (isError) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <p className="text-red-500 font-medium">Failed to load product analytics</p>
      <p className="text-xs text-gray-400">{error?.message || 'Check that the backend server is running'}</p>
      <button onClick={() => navigate('/products')}
        className="mt-2 text-sm text-indigo-600 hover:underline">← Back to Products</button>
    </div>
  );

  const { product, stats, monthly_sales = [], orders = [] } = data?.data || {};
  if (!product) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <p className="text-gray-500 font-medium">Product not found</p>
      <button onClick={() => navigate('/products')} className="text-sm text-indigo-600 hover:underline">← Back to Products</button>
    </div>
  );

  const primaryImage = product.images?.find((i) => i.is_primary)?.url || product.images?.[0]?.url || '/placeholder.jpg';
  const returnRate = stats.total_orders > 0
    ? Math.round((stats.return_orders / stats.total_orders) * 100)
    : 0;

  // Fill chart with zeros for months with no sales
  const chartData = getLast12Months().map(({ key, label }) => {
    const found = monthly_sales.find((m) => m.month === key);
    return { month: label, units: found ? found.units : 0 };
  });

  const maxUnits = Math.max(...chartData.map((d) => d.units), 1);

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/products')}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Product Analytics</h1>
      </div>

      {/* Product card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex gap-5 items-start">
        <img src={primaryImage} alt={product.name}
          className="w-20 h-24 object-cover rounded-xl bg-gray-100 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-lg font-bold text-gray-900 leading-tight">{product.name}</p>
          <p className="text-sm text-gray-500 mt-0.5">{product.category_name}
            {product.sub_category && <> · {product.sub_category}</>}
            {product.type && <> · {product.type}</>}
          </p>
          <div className="flex flex-wrap gap-3 mt-3 text-sm">
            <span className="font-semibold text-green-600 ">{formatPrice(product.offer_price || product.price)}</span>
            {product.offer_price && <span className="text-gray-400 line-through">{formatPrice(product.price)}</span>}
            <span className={`font-medium ${product.stock < 10 ? 'text-red-500' : 'text-gray-600'}`}>
              Stock:  <span className="text-pink-500 font-bold text-lg">{product.stock}</span>
            </span>
            {product.sku && <span className="text-gray-400 font-mono text-xs self-center">{product.sku}</span>}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShoppingBag} label="Total Orders" value={stats.total_orders}
          color="bg-blue-50 border-blue-200 text-blue-800" />
        <StatCard icon={TrendingUp} label="Units Sold" value={stats.units_sold}
          color="bg-green-50 border-green-200 text-green-800" />
        <StatCard icon={RotateCcw} label="Return Orders" value={stats.return_orders}
          color="bg-orange-50 border-orange-200 text-orange-800"
          sub={`${stats.returned_units} units returned`} />
        <StatCard icon={Package} label="Return Rate" value={`${returnRate}%`}
          color={returnRate > 20
            ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-gray-50 border-gray-200 text-gray-700'}
          sub={returnRate > 20 ? 'High — investigate' : 'Healthy'} />
      </div>

      {/* Chart + Variants */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Sales chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-800 mb-4">Monthly Sales (last 12 months)</h2>
          {maxUnits === 1 && chartData.every((d) => d.units === 0) ? (
            <p className="text-sm text-gray-400 py-10 text-center">No sales data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barSize={22}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }}
                  formatter={(v) => [`${v} units`, 'Sold']}
                />
                <Bar dataKey="units" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Variant stock */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-pink-600 mb-4 border-b border-gray-300">Variant Stock</h2>
          {!product.variants?.length ? (
            <p className="text-sm text-gray-400 py-6 text-center">No variants</p>
          ) : (
            <div className="space-y-2">
              {product.variants.map((v) => (
                <div key={v.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    {v.size && (
                      <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-xs font-semibold">{v.size}</span>
                    )}
                    {v.color && (
                      <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-xs font-semibold capitalize">{v.color}</span>
                    )}
                    {!v.size && !v.color && <span className="text-xs text-gray-400">Default</span>}
                  </div>
                  <span className={`text-sm font-bold ${v.stock < 5 ? 'text-red-500' : 'text-gray-700'}`}>
                    {v.stock} {v.stock < 5 && <span className="text-xs font-normal text-red-400">low</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Customer orders */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-800">Customer Orders</h2>
          <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full">{orders.length} records</span>
        </div>

        {orders.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">No orders yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  {['Customer', 'Phone', 'Variant', 'Qty', 'Order Date', 'Status', 'Return Date'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((o, i) => (
                  <tr key={`${o.order_id}-${i}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                          <User className="h-3.5 w-3.5 text-indigo-500" />
                        </div>
                        <span className="font-medium text-gray-800 whitespace-nowrap">{o.customer_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-gray-500">
                        <Phone className="h-3 w-3" />
                        <span className="text-xs font-mono">{o.customer_phone || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 flex-wrap">
                        {o.size && <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-semibold">{o.size}</span>}
                        {o.color && <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 text-xs font-semibold capitalize">{o.color}</span>}
                        {!o.size && !o.color && <span className="text-gray-400 text-xs">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-700">{o.quantity}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-gray-500 whitespace-nowrap">
                        <Calendar className="h-3 w-3" />
                        <span className="text-xs">{formatDate(o.order_date)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize whitespace-nowrap ${STATUS_STYLE[o.status] || 'bg-gray-100 text-gray-600'}`}>
                        {o.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-orange-600">
                      {o.return_date ? formatDate(o.return_date) : <span className="text-gray-300">—</span>}
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
