import React from 'react';
import { Ruler, Palette } from 'lucide-react';
import { formatPrice } from '../../../../utils/format';

function VariantBarRow({ rank, label, count, max, color, minPrice, maxPrice }) {
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

export default function VariantsTab({ data }) {
  const orderBySize = data?.order_by_size || [];
  const orderByColor = data?.order_by_color || [];

  const maxSize = orderBySize[0]?.count || 1;
  const maxColor = orderByColor[0]?.count || 1;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Sizes Breakdown */}
      <div className="bg-white rounded-2xl border border-blue-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100">
          <div className="p-2.5 bg-blue-600 text-white rounded-xl">
            <Ruler className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Most Ordered Garment Sizes</h3>
            <p className="text-xs text-gray-500">Breakdown of sizes purchased across orders</p>
          </div>
        </div>
        {orderBySize.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">No size sales data yet</p>
        ) : (
          orderBySize.map((item, i) => (
            <VariantBarRow
              key={item.size}
              rank={i + 1}
              label={item.size}
              count={item.count}
              max={maxSize}
              color="bg-blue-500"
              minPrice={item.min_price}
              maxPrice={item.max_price}
            />
          ))
        )}
      </div>

      {/* Colors Breakdown */}
      <div className="bg-white rounded-2xl border border-indigo-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100">
          <div className="p-2.5 bg-indigo-600 text-white rounded-xl">
            <Palette className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Most Ordered Colors</h3>
            <p className="text-xs text-gray-500">Breakdown of color preferences by customer orders</p>
          </div>
        </div>
        {orderByColor.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">No color sales data yet</p>
        ) : (
          orderByColor.map((item, i) => (
            <VariantBarRow
              key={item.color}
              rank={i + 1}
              label={item.color}
              count={item.count}
              max={maxColor}
              color="bg-indigo-500"
              minPrice={item.min_price}
              maxPrice={item.max_price}
            />
          ))
        )}
      </div>
    </div>
  );
}
