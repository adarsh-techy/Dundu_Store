import React from 'react';
import { ShoppingCart, Heart, Search, Package, TrendingUp, Layers } from 'lucide-react';
import { formatPrice } from '../../../../utils/format';

function MetricCard({ title, value, subtext, icon: Icon, color, bg }) {
  return (
    <div className={`p-5 rounded-2xl border ${bg} flex items-center justify-between shadow-sm`}>
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-black text-gray-900 mt-1">{value}</h3>
        <p className="text-xs text-gray-500 mt-1">{subtext}</p>
      </div>
      <div className={`p-3 rounded-xl ${color} text-white shadow-md`}>
        <Icon className="h-6 w-6" />
      </div>
    </div>
  );
}

export default function OverviewTab({ data }) {
  const topCarted = data?.top_carted || [];
  const topWishlisted = data?.top_wishlisted || [];
  const topOrdered = data?.top_ordered || [];
  const topSearched = data?.top_searched || [];

  const totalOrdersCount = topOrdered.reduce((acc, curr) => acc + (parseInt(curr.order_count) || 0), 0);
  const totalCartAdds = topCarted.reduce((acc, curr) => acc + (parseInt(curr.cart_count) || 0), 0);
  const totalWishlistSaves = topWishlisted.reduce((acc, curr) => acc + (parseInt(curr.wishlist_count) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Top Product Sales"
          value={totalOrdersCount}
          subtext="Units sold across top items"
          icon={Package}
          color="bg-orange-500"
          bg="bg-orange-50/50 border-orange-200"
        />
        <MetricCard
          title="Total Cart Activity"
          value={totalCartAdds}
          subtext="Times products added to cart"
          icon={ShoppingCart}
          color="bg-blue-500"
          bg="bg-blue-50/50 border-blue-200"
        />
        <MetricCard
          title="Wishlist Engagement"
          value={totalWishlistSaves}
          subtext="Products saved to wishlist"
          icon={Heart}
          color="bg-pink-500"
          bg="bg-pink-50/50 border-pink-200"
        />
        <MetricCard
          title="Top Customer Search"
          value={topSearched[0]?.term ? `"${topSearched[0].term}"` : 'N/A'}
          subtext={`${topSearched[0]?.count || 0} total searches`}
          icon={Search}
          color="bg-purple-500"
          bg="bg-purple-50/50 border-purple-200"
        />
      </div>

      {/* Top Performing Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Most Ordered Product */}
        <div className="p-5 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-extrabold text-orange-600 bg-orange-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
              🔥 #1 Best Seller
            </span>
            <span className="text-xs text-gray-400">Most Ordered Item</span>
          </div>
          {topOrdered[0] ? (
            <div className="flex gap-4 items-center">
              <img
                src={topOrdered[0].image || '/placeholder.svg'}
                alt=""
                className="w-16 h-20 object-cover rounded-xl border border-gray-100 bg-gray-50 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-900 text-base truncate">{topOrdered[0].name}</h4>
                <p className="text-sm font-semibold text-orange-600 mt-0.5">
                  {topOrdered[0].offer_price ? formatPrice(topOrdered[0].offer_price) : formatPrice(topOrdered[0].price)}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs font-bold bg-orange-50 text-orange-700 px-2 py-0.5 rounded border border-orange-200">
                    {topOrdered[0].order_count} units sold
                  </span>
                  {topOrdered[0].category && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      {topOrdered[0].category}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-4 text-center">No order data yet</p>
          )}
        </div>

        {/* Most Carted Product */}
        <div className="p-5 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-extrabold text-blue-600 bg-blue-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
              🛒 Most In-Demand
            </span>
            <span className="text-xs text-gray-400">Top Carted Item</span>
          </div>
          {topCarted[0] ? (
            <div className="flex gap-4 items-center">
              <img
                src={topCarted[0].image || '/placeholder.svg'}
                alt=""
                className="w-16 h-20 object-cover rounded-xl border border-gray-100 bg-gray-50 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-900 text-base truncate">{topCarted[0].name}</h4>
                <p className="text-sm font-semibold text-blue-600 mt-0.5">
                  {topCarted[0].offer_price ? formatPrice(topCarted[0].offer_price) : formatPrice(topCarted[0].price)}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                    {topCarted[0].cart_count} cart adds
                  </span>
                  {topCarted[0].top_size && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      Top Size: {topCarted[0].top_size}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-4 text-center">No cart data yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
