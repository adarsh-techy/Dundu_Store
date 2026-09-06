import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Package, AlertTriangle, XCircle, IndianRupee, BarChart2 } from 'lucide-react';
import { inventoryApi } from '../../../api';
import Spinner from '../../../components/ui/Spinner';
import { formatPrice } from '../../../utils/format';

function KpiCard({ title, value, sub, icon: Icon, from, to, onClick }) {
  const cls = `rounded-2xl p-5 bg-gradient-to-br ${from} ${to} text-white shadow-sm ${onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`;
  return (
    <div className={cls} onClick={onClick}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest opacity-80">{title}</p>
          <p className="text-3xl font-extrabold mt-1 tracking-tight">{value}</p>
          {sub && <p className="text-xs opacity-75 mt-1">{sub}</p>}
        </div>
        <div className="bg-white/20 rounded-xl p-2.5">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function StockBadge({ stock }) {
  if (stock === 0)  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white">Out of Stock</span>;
  if (stock < 10)   return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">{stock} left</span>;
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">{stock} in stock</span>;
}

const STOCK_FILTERS = [
  { key: 'all',  label: 'All' },
  { key: 'out',  label: 'Out of Stock' },
  { key: 'low',  label: 'Low Stock' },
];

export default function InventoryDashboard() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const { data, isLoading } = useQuery({
    queryKey: ['inventory', stockFilter],
    queryFn: () => inventoryApi.get(stockFilter === 'all' ? undefined : { stock: stockFilter }),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner /></div>;

  const d = data?.data || {};
  const allProducts       = d.products || [];
  const categoryBreakdown = d.category_breakdown || [];
  const maxCategoryStock  = Math.max(...categoryBreakdown.map((c) => c.total_stock), 1);

  const categories = categoryBreakdown.map((c) => c.category);
  const products   = selectedCategory
    ? allProducts.filter((p) => p.category === selectedCategory)
    : allProducts;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Inventory Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Stock levels &amp; product health</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Total Products"
          value={d.total_products ?? 0}
          sub="Active (visible)"
          icon={Package}
          from="from-violet-500" to="to-purple-700"
        />
        <KpiCard
          title="Out of Stock"
          value={d.out_of_stock ?? 0}
          sub={stockFilter === 'out' ? 'Showing below' : 'Click to filter'}
          icon={XCircle}
          from="from-red-500" to="to-rose-600"
          onClick={() => setStockFilter(stockFilter === 'out' ? 'all' : 'out')}
        />
        <KpiCard
          title="Low Stock (< 10)"
          value={d.low_stock ?? 0}
          sub={stockFilter === 'low' ? 'Showing below' : 'Click to filter'}
          icon={AlertTriangle}
          from="from-amber-400" to="to-orange-500"
          onClick={() => setStockFilter(stockFilter === 'low' ? 'all' : 'low')}
        />
        <KpiCard
          title="Stock Value"
          value={formatPrice(d.stock_value || 0)}
          sub="At selling price"
          icon={IndianRupee}
          from="from-teal-500" to="to-emerald-600"
        />
      </div>

      {/* Products Table + Category Breakdown */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Products Table */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-gray-800">
              {selectedCategory ? selectedCategory : 'All Products'}
              <span className="ml-2 text-xs font-normal text-gray-400">({products.length} items)</span>
            </h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
                {STOCK_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setStockFilter(f.key)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                      stockFilter === f.key ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-400 text-gray-700 bg-white"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="overflow-y-auto max-h-[560px]">
            {products.length === 0 ? (
              <div className="py-16 text-center text-gray-300 text-sm">No products found</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr>
                    {['', 'Product', 'SKU', 'Category', 'Stock', 'Price'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-pink-800 bg-green-50">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {products.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => navigate(`/products/${p.id}`)}
                      className="hover:bg-indigo-50/40 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-2.5">
                        <div className="w-9 h-9 rounded-lg bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                          {p.image
                            ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                            : <Package className="h-4 w-4 text-gray-400" />
                          }
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="text-xs font-semibold text-gray-800 truncate max-w-[180px]">{p.name}</p>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-400 font-mono">{p.sku || '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{p.category || '—'}</td>
                      <td className="px-4 py-2.5">
                        <StockBadge stock={p.stock} />
                      </td>
                      <td className="px-4 py-2.5 text-xs font-bold text-gray-800">
                        {p.offer_price ? (
                          <span className="text-pink-600">{formatPrice(p.offer_price)}</span>
                        ) : (
                          formatPrice(p.price)
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="h-4 w-4 text-indigo-500" />
            <h2 className="text-sm font-bold text-gray-800">Category Breakdown</h2>
          </div>
          {categoryBreakdown.length === 0 ? (
            <div className="py-12 text-center text-gray-300 text-sm">No data</div>
          ) : (
            <div className="space-y-4">
              {categoryBreakdown.map((c) => {
                const pct = maxCategoryStock > 0 ? Math.round((c.total_stock / maxCategoryStock) * 100) : 0;
                return (
                  <div key={c.category}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-700 truncate max-w-[130px]">{c.category}</span>
                      <div className="text-right shrink-0 ml-2">
                        <span className="text-xs font-bold text-gray-800">{c.total_stock}</span>
                        <span className="text-[10px] text-gray-400 ml-1">units</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">{c.product_count} product{c.product_count !== 1 ? 's' : ''}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
