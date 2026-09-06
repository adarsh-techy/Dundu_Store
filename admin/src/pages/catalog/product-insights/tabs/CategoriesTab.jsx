import React from 'react';
import { LayoutGrid, Layers, Tag } from 'lucide-react';
import { formatPrice } from '../../../../utils/format';

function CategoryBarRow({ rank, label, count, max, color, minPrice, maxPrice }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  const priceRange = minPrice != null
    ? (Math.round(minPrice) === Math.round(maxPrice)
        ? formatPrice(minPrice)
        : `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`)
    : null;
  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-700 text-xs font-bold flex items-center justify-center shrink-0">
            {rank}
          </span>
          <span className="text-sm font-bold text-gray-900 capitalize">{label}</span>
          {priceRange && (
            <span className="text-xs text-gray-400 font-medium">({priceRange})</span>
          )}
        </div>
        <span className="text-xs font-black text-gray-800 bg-gray-100 px-2 py-0.5 rounded-full">
          {count} units sold
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full ${color} transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function CategoriesTab({ data }) {
  const orderByCategory = data?.order_by_category || [];
  const orderBySubCategory = data?.order_by_sub_category || [];
  const orderByType = data?.order_by_type || [];

  const maxCategory = orderByCategory[0]?.count || 1;
  const maxSubCategory = orderBySubCategory[0]?.count || 1;
  const maxType = orderByType[0]?.count || 1;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Most Ordered Categories */}
      <div className="bg-white rounded-2xl border border-orange-200 p-5 shadow-sm">
        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-gray-100">
          <div className="p-2 bg-orange-500 text-white rounded-xl">
            <LayoutGrid className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Top Main Categories</h3>
            <p className="text-[11px] text-gray-400">By units sold</p>
          </div>
        </div>
        {orderByCategory.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">No data yet</p>
        ) : (
          orderByCategory.map((item, i) => (
            <CategoryBarRow
              key={item.label}
              rank={i + 1}
              label={item.label}
              count={item.count}
              max={maxCategory}
              color="bg-orange-500"
              minPrice={item.min_price}
              maxPrice={item.max_price}
            />
          ))
        )}
      </div>

      {/* Most Ordered Sub-Categories */}
      <div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-sm">
        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-gray-100">
          <div className="p-2 bg-amber-500 text-white rounded-xl">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Top Sub-Categories</h3>
            <p className="text-[11px] text-gray-400">By units sold</p>
          </div>
        </div>
        {orderBySubCategory.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">No data yet</p>
        ) : (
          orderBySubCategory.map((item, i) => (
            <CategoryBarRow
              key={item.label}
              rank={i + 1}
              label={item.label}
              count={item.count}
              max={maxSubCategory}
              color="bg-amber-500"
              minPrice={item.min_price}
              maxPrice={item.max_price}
            />
          ))
        )}
      </div>

      {/* Most Ordered Types */}
      <div className="bg-white rounded-2xl border border-rose-200 p-5 shadow-sm">
        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-gray-100">
          <div className="p-2 bg-rose-500 text-white rounded-xl">
            <Tag className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Top Product Types</h3>
            <p className="text-[11px] text-gray-400">By units sold</p>
          </div>
        </div>
        {orderByType.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">No data yet</p>
        ) : (
          orderByType.map((item, i) => (
            <CategoryBarRow
              key={item.label}
              rank={i + 1}
              label={item.label}
              count={item.count}
              max={maxType}
              color="bg-rose-500"
              minPrice={item.min_price}
              maxPrice={item.max_price}
            />
          ))
        )}
      </div>
    </div>
  );
}
