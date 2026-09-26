import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Package, AlertTriangle, XCircle, IndianRupee, Layers,
  Search, RefreshCw, Download, CheckCircle2, ArrowRight,
  ArrowUpRight, Boxes, Warehouse, Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { inventoryApi } from '../../../api';
import Spinner from '../../../components/ui/Spinner';
import { formatPrice } from '../../../utils/format';

/* ── Stock Status Badge ─────────────────────────────────────────────────── */
function StockBadge({ stock }) {
  if (stock === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
        Out of Stock
      </span>
    );
  }
  if (stock < 10) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        {stock} units left
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      {stock} in stock
    </span>
  );
}

/* ── Executive Metric Card ──────────────────────────────────────────────── */
function InventoryKpiCard({ title, value, sub, icon: Icon, tone = 'slate', badge, onClick, active }) {
  const tones = {
    slate: {
      card: 'border-slate-200 bg-gradient-to-br from-white via-white to-slate-50/40 hover:border-slate-300',
      iconBox: 'bg-slate-700 text-white shadow-sm shadow-slate-700/20',
      accent: 'text-slate-950',
      badge: 'bg-slate-100 text-slate-700 border-slate-200',
    },
    emerald: {
      card: 'border-emerald-100 bg-gradient-to-br from-white via-white to-emerald-50/40 hover:border-emerald-300',
      iconBox: 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20',
      accent: 'text-emerald-950',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    rose: {
      card: 'border-rose-200/90 bg-gradient-to-br from-rose-50/40 via-white to-rose-50/10 hover:border-rose-300',
      iconBox: 'bg-rose-600 text-white shadow-sm shadow-rose-600/20',
      accent: 'text-rose-950',
      badge: 'bg-rose-100 text-rose-800 border-rose-200',
    },
    amber: {
      card: 'border-amber-200/90 bg-gradient-to-br from-amber-50/40 via-white to-amber-50/10 hover:border-amber-300',
      iconBox: 'bg-amber-600 text-white shadow-sm shadow-amber-600/20',
      accent: 'text-amber-950',
      badge: 'bg-amber-100 text-amber-800 border-amber-200',
    },
    teal: {
      card: 'border-teal-100 bg-gradient-to-br from-white via-white to-teal-50/40 hover:border-teal-300',
      iconBox: 'bg-teal-600 text-white shadow-sm shadow-teal-600/20',
      accent: 'text-teal-950',
      badge: 'bg-teal-50 text-teal-700 border-teal-200',
    },
    violet: {
      card: 'border-violet-100 bg-gradient-to-br from-white via-white to-violet-50/40 hover:border-violet-300',
      iconBox: 'bg-violet-600 text-white shadow-sm shadow-violet-600/20',
      accent: 'text-violet-950',
      badge: 'bg-violet-50 text-violet-700 border-violet-200',
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
      } ${active ? 'ring-2 ring-slate-900 ring-offset-2' : ''}`}
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

export default function InventoryDashboard() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stockFilter, setStockFilter] = useState('all'); // 'all' | 'out' | 'low' | 'healthy'
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['inventory', stockFilter],
    queryFn: () => inventoryApi.get(
      stockFilter === 'out' || stockFilter === 'low' ? { stock: stockFilter } : undefined
    ),
  });

  const d = data?.data || {};
  const allProducts       = d.products || [];
  const categoryBreakdown = d.category_breakdown || [];
  const maxCategoryStock  = Math.max(...categoryBreakdown.map((c) => c.total_stock || 0), 1);
  const totalPhysicalUnits = categoryBreakdown.reduce((sum, c) => sum + (c.total_stock || 0), 0);

  // Client-side filtering for category, search, and healthy filter
  const filteredProducts = useMemo(() => {
    let list = allProducts;

    if (stockFilter === 'healthy') {
      list = list.filter((p) => p.stock >= 10);
    }

    if (selectedCategory) {
      list = list.filter((p) => p.category === selectedCategory);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter((p) =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [allProducts, stockFilter, selectedCategory, searchTerm]);

  // Export inventory to CSV
  const handleExportCsv = () => {
    if (!filteredProducts.length) {
      toast.error('No products to export');
      return;
    }
    const headers = ['Product Name', 'SKU', 'Category', 'Stock Quantity', 'Unit Price', 'Offer Price', 'Stock Value'];
    const rows = filteredProducts.map((p) => {
      const effPrice = p.offer_price || p.price || 0;
      const totalVal = effPrice * (p.stock || 0);
      return [
        `"${(p.name || '').replace(/"/g, '""')}"`,
        `"${p.sku || ''}"`,
        `"${p.category || ''}"`,
        p.stock || 0,
        p.price || 0,
        p.offer_price || '',
        totalVal,
      ];
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dundu-inventory-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Inventory report exported');
  };

  const healthyStockCount = Math.max(
    0,
    (d.total_products || 0) - (d.out_of_stock || 0) - (d.low_stock || 0)
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Spinner />
        <p className="text-xs font-semibold text-slate-500">Loading warehouse inventory intelligence...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-16">

      {/* ── 1. Top Executive Inventory Command Bar ────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm shadow-slate-900/20">
              <Warehouse className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  Inventory & Stock Intelligence
                </h1>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Live Stock Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Real-time stock monitoring, replenishment triggers, and warehouse asset valuation
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls & Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportCsv}
            title="Download Inventory CSV"
            className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 rounded-xl transition-all flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh Inventory"
            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── 2. Primary Full-Width Executive Metric Cards (6 Columns) ───────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <InventoryKpiCard
          title="Catalog Items"
          value={d.total_products ?? 0}
          sub="Active visible products"
          badge="Catalog"
          icon={Package}
          tone="slate"
          onClick={() => setStockFilter('all')}
          active={stockFilter === 'all'}
        />
        <InventoryKpiCard
          title="Inventory Valuation"
          value={formatPrice(d.stock_value || 0)}
          sub="At current selling price"
          badge="Asset Worth"
          icon={IndianRupee}
          tone="emerald"
        />
        <InventoryKpiCard
          title="Out of Stock"
          value={d.out_of_stock ?? 0}
          sub="Products with 0 units"
          badge="Immediate Action"
          icon={XCircle}
          tone="rose"
          onClick={() => setStockFilter(stockFilter === 'out' ? 'all' : 'out')}
          active={stockFilter === 'out'}
        />
        <InventoryKpiCard
          title="Low Stock Warning"
          value={d.low_stock ?? 0}
          sub="Less than 10 units left"
          badge="Reorder Soon"
          icon={AlertTriangle}
          tone="amber"
          onClick={() => setStockFilter(stockFilter === 'low' ? 'all' : 'low')}
          active={stockFilter === 'low'}
        />
        <InventoryKpiCard
          title="Healthy Supply"
          value={healthyStockCount}
          sub="10+ units on hand"
          badge="Sufficient"
          icon={CheckCircle2}
          tone="teal"
          onClick={() => setStockFilter(stockFilter === 'healthy' ? 'all' : 'healthy')}
          active={stockFilter === 'healthy'}
        />
        <InventoryKpiCard
          title="Total Stock Units"
          value={totalPhysicalUnits.toLocaleString('en-IN')}
          sub="Physical pieces in warehouse"
          badge="Total Volume"
          icon={Boxes}
          tone="violet"
        />
      </div>

      {/* ── 3. Split: Main Stock Ledger & Department Breakdown ─────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">

        {/* Left Column: Product Stock Ledger (8 cols) */}
        <div className="xl:col-span-8 bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col justify-between">
          <div>
            {/* Table Header Filter Bar */}
            <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">Product Stock Ledger</h2>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {filteredProducts.length} items
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time inventory levels sorted by stock availability
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Search Input */}
                <div className="relative">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search name, SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 w-48 sm:w-56"
                  />
                </div>

                {/* Stock Health Filter Pills */}
                <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
                  {[
                    { key: 'all',     label: 'All' },
                    { key: 'out',     label: 'Out' },
                    { key: 'low',     label: 'Low' },
                    { key: 'healthy', label: 'Good' },
                  ].map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setStockFilter(f.key)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        stockFilter === f.key
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Category Select Filter */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-slate-400 text-slate-700 bg-slate-50 font-medium cursor-pointer"
                >
                  <option value="">All Categories</option>
                  {categoryBreakdown.map((c) => (
                    <option key={c.category} value={c.category}>
                      {c.category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-5 py-3.5">Product</th>
                    <th className="px-5 py-3.5">SKU</th>
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-5 py-3.5 text-center">Stock Level</th>
                    <th className="px-5 py-3.5 text-right">Price</th>
                    <th className="px-5 py-3.5 text-right">Inventory Value</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-slate-400 text-xs">
                        <Package className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                        No inventory records matching the filter criteria
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const effPrice = p.offer_price || p.price || 0;
                      const totalVal = effPrice * (p.stock || 0);

                      return (
                        <tr
                          key={p.id}
                          onClick={() => navigate(`/products/${p.id}`)}
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                                {p.image ? (
                                  <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Package className="h-4 w-4 text-slate-400" />
                                )}
                              </div>
                              <p className="text-xs font-bold text-slate-900 truncate max-w-[200px]">
                                {p.name}
                              </p>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-500 font-mono">
                            {p.sku || '—'}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-600 font-medium">
                            {p.category || '—'}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <StockBadge stock={p.stock} />
                          </td>
                          <td className="px-5 py-3.5 text-xs font-bold text-slate-900 text-right">
                            {p.offer_price ? (
                              <div>
                                <span className="text-emerald-700">{formatPrice(p.offer_price)}</span>
                                <span className="block text-[10px] text-slate-400 line-through">
                                  {formatPrice(p.price)}
                                </span>
                              </div>
                            ) : (
                              formatPrice(p.price)
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-xs font-extrabold text-slate-900 text-right">
                            {formatPrice(totalVal)}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/products/${p.id}`);
                              }}
                              className="text-xs font-bold text-slate-600 group-hover:text-emerald-700 transition-colors inline-flex items-center gap-1"
                            >
                              Edit <ArrowRight className="h-3 w-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Category Stock Distribution (4 cols) */}
        <div className="xl:col-span-4 bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center shrink-0">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">Stock by Department</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Physical distribution of units</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/categories')}
                className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1 transition-colors"
              >
                Categories <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {categoryBreakdown.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                <Layers className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                No department stock records
              </div>
            ) : (
              <div className="space-y-4">
                {categoryBreakdown.map((c) => {
                  const pct = maxCategoryStock > 0 ? Math.round((c.total_stock / maxCategoryStock) * 100) : 0;
                  const totalSharePct = totalPhysicalUnits > 0 ? Math.round((c.total_stock / totalPhysicalUnits) * 100) : 0;

                  return (
                    <div
                      key={c.category}
                      onClick={() => setSelectedCategory(selectedCategory === c.category ? '' : c.category)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        selectedCategory === c.category
                          ? 'border-indigo-400 bg-indigo-50/50 shadow-sm'
                          : 'border-slate-100 bg-slate-50/50 hover:bg-slate-100/70 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-bold text-slate-800 truncate max-w-[160px]">
                          {c.category}
                        </span>
                        <div className="text-right shrink-0">
                          <span className="font-extrabold text-slate-900">{c.total_stock}</span>
                          <span className="text-[11px] text-slate-500 ml-1">units ({totalSharePct}%)</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-slate-800 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5">
                        <span>{c.product_count} active product{c.product_count !== 1 ? 's' : ''}</span>
                        {selectedCategory === c.category && (
                          <span className="text-[10px] font-bold text-indigo-700">Filter applied</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>Total Warehouse Units:</span>
            <span className="font-extrabold text-slate-900">{totalPhysicalUnits.toLocaleString('en-IN')} units</span>
          </div>
        </div>

      </div>

    </div>
  );
}
