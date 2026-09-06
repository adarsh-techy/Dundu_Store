import React from 'react';
import { ShoppingCart, Heart, Search, Package, Ruler, Palette } from 'lucide-react';
import { formatPrice } from '../../../../utils/format';

const MEDAL = {
  1: 'bg-yellow-400 text-yellow-950 font-black shadow-sm',
  2: 'bg-slate-300 text-slate-800 font-bold',
  3: 'bg-amber-300 text-amber-900 font-bold',
};

function RankBadge({ rank }) {
  return (
    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${MEDAL[rank] || 'bg-gray-100 text-gray-500'}`}>
      {rank}
    </span>
  );
}

function ProductRow({ rank, product, countKey, countLabel, countColor, showVariant }) {
  const users = product.user_names || [];
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50/60 transition px-2 rounded-xl">
      <RankBadge rank={rank} />
      <img
        src={product.image || '/placeholder.svg'}
        alt={product.name}
        className="w-11 h-14 object-cover rounded-lg shrink-0 bg-gray-100 border border-gray-200"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 truncate">{product.name}</p>
        <p className="text-xs font-semibold text-gray-500 mt-0.5">
          {product.offer_price ? formatPrice(product.offer_price) : formatPrice(product.price)}
        </p>
        {showVariant && (product.top_size || product.top_color) && (
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            {product.top_size && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold">
                <Ruler className="h-3 w-3" /> {product.top_size}
              </span>
            )}
            {product.top_color && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold">
                <Palette className="h-3 w-3" /> {product.top_color}
              </span>
            )}
          </div>
        )}
        {users.length > 0 && (
          <p className="text-xs text-gray-400 mt-1 truncate">
            👤 {users.slice(0, 3).join(', ')}{users.length > 3 ? ` +${users.length - 3} more` : ''}
          </p>
        )}
      </div>
      <div className="text-right shrink-0">
        <span className={`text-base font-black ${countColor}`}>
          {product[countKey]}
        </span>
        <p className="text-xs text-gray-400 font-medium">{countLabel}</p>
      </div>
    </div>
  );
}

export default function ProductDemandTab({ data }) {
  const topCarted = data?.top_carted || [];
  const topWishlisted = data?.top_wishlisted || [];
  const topOrdered = data?.top_ordered || [];
  const topSearched = data?.top_searched || [];

  return (
    <div className="space-y-6">
      {/* Most Ordered Section */}
      <div className="bg-white rounded-2xl border border-orange-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-orange-500 text-white rounded-xl">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Most Ordered Products</h2>
            <p className="text-xs text-gray-500">Products with highest total units sold</p>
          </div>
        </div>
        {topOrdered.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">No order data available yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topOrdered.map((p, i) => (
              <div key={p.product_id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-orange-50/30">
                <RankBadge rank={i + 1} />
                <img
                  src={p.image || '/placeholder.svg'}
                  alt=""
                  className="w-12 h-14 object-cover rounded-lg shrink-0 border border-gray-200"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{p.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {p.category && <span className="mr-2 text-orange-600 font-semibold">{p.category}</span>}
                    {p.offer_price ? formatPrice(p.offer_price) : formatPrice(p.price)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-base font-black text-orange-600">{p.order_count}</span>
                  <p className="text-xs text-gray-400 font-medium">units</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grid: Carted vs Wishlisted vs Searches */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Most Added to Cart */}
        <div className="bg-white rounded-2xl border border-blue-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
            <div className="p-2 bg-blue-500 text-white rounded-xl">
              <ShoppingCart className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Most Added to Cart</h3>
              <p className="text-[11px] text-gray-400">High intent to buy</p>
            </div>
          </div>
          {topCarted.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No cart data yet</p>
          ) : (
            topCarted.map((p, i) => (
              <ProductRow
                key={p.product_id}
                rank={i + 1}
                product={p}
                countKey="cart_count"
                countLabel="cart adds"
                countColor="text-blue-600"
                showVariant
              />
            ))
          )}
        </div>

        {/* Most Wishlisted */}
        <div className="bg-white rounded-2xl border border-pink-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
            <div className="p-2 bg-pink-500 text-white rounded-xl">
              <Heart className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Most Wishlisted</h3>
              <p className="text-[11px] text-gray-400">Customer favorites</p>
            </div>
          </div>
          {topWishlisted.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No wishlist data yet</p>
          ) : (
            topWishlisted.map((p, i) => (
              <ProductRow
                key={p.product_id}
                rank={i + 1}
                product={p}
                countKey="wishlist_count"
                countLabel="saves"
                countColor="text-pink-600"
              />
            ))
          )}
        </div>

        {/* Top Searches */}
        <div className="bg-white rounded-2xl border border-purple-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
            <div className="p-2 bg-purple-500 text-white rounded-xl">
              <Search className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Top Search Keywords</h3>
              <p className="text-[11px] text-gray-400">What users look for</p>
            </div>
          </div>
          {topSearched.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No search data yet</p>
          ) : (
            topSearched.map((item, i) => (
              <div key={item.term} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-2.5">
                  <RankBadge rank={i + 1} />
                  <span className="text-sm font-bold text-gray-800 capitalize">"{item.term}"</span>
                </div>
                <span className="text-xs font-black bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full">
                  {item.count} searches
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
