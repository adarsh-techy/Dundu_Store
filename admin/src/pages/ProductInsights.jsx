import { useQuery } from '@tanstack/react-query';
import { ShoppingCart, Heart, Search, Ruler, Palette, Package, Tag, Layers, LayoutGrid } from 'lucide-react';
import { insightsApi } from '../api';
import { formatPrice } from '../utils/format';

const MEDAL = {
  1: 'bg-yellow-400 text-yellow-900',
  2: 'bg-gray-300 text-gray-700',
  3: 'bg-orange-300 text-orange-900',
};

function RankBadge({ rank }) {
  return (
    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${MEDAL[rank] || 'bg-gray-100 text-gray-500'}`}>
      {rank}
    </span>
  );
}

function ProductRow({ rank, product, countKey, countLabel, countColor, showVariant }) {
  const users = product.user_names || [];
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <RankBadge rank={rank} />
      <img
        src={product.image || '/placeholder.svg'}
        alt={product.name}
        className="w-10 h-12 object-cover rounded-lg shrink-0 bg-gray-100"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{product.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {product.offer_price ? formatPrice(product.offer_price) : formatPrice(product.price)}
        </p>
        {showVariant && (product.top_size || product.top_color) && (
          <div className="flex gap-1.5 mt-1 flex-wrap">
            {product.top_size && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                <Ruler className="h-2.5 w-2.5" /> {product.top_size}
              </span>
            )}
            {product.top_color && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
                <Palette className="h-2.5 w-2.5" /> {product.top_color}
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
      <span className={`text-sm font-bold ${countColor} shrink-0`}>
        {product[countKey]} <span className="text-xs font-normal text-gray-400">{countLabel}</span>
      </span>
    </div>
  );
}

function SearchRow({ rank, item }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <RankBadge rank={rank} />
      <p className="flex-1 text-sm font-medium text-gray-800 capitalize">{item.term}</p>
      <span className="text-sm font-bold text-purple-600 shrink-0">
        {item.count} <span className="text-xs font-normal text-gray-400">searches</span>
      </span>
    </div>
  );
}

function BarRow({ rank, label, count, max, color, minPrice, maxPrice }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  const priceRange = minPrice != null
    ? (Math.round(minPrice) === Math.round(maxPrice)
        ? formatPrice(minPrice)
        : `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`)
    : null;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <RankBadge rank={rank} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-xs font-semibold text-gray-700 truncate capitalize">{label}</span>
          <span className="text-xs font-bold text-gray-500 ml-2 shrink-0">{count} units</span>
        </div>
        {priceRange && (
          <p className="text-xs text-gray-400 mb-1">{priceRange}</p>
        )}
        <div className="h-1.5 rounded-full bg-gray-100">
          <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, color, bgColor, borderColor, children, empty, badge }) {
  return (
    <div className={`rounded-2xl border ${borderColor} ${bgColor} shadow-sm`}>
      <div className="flex items-center gap-2 p-5 pb-3">
        <div className={`p-2 rounded-xl ${color}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <h2 className="font-bold text-gray-800 flex-1">{title}</h2>
        {badge && <span className="text-xs text-gray-400 bg-white/70 px-2 py-0.5 rounded-full border border-gray-200">{badge}</span>}
      </div>
      <div className="px-5 pb-5">
        {empty ? (
          <p className="text-sm text-gray-400 py-6 text-center">No data yet</p>
        ) : children}
      </div>
    </div>
  );
}

export default function ProductInsights() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-product-insights'],
    queryFn: insightsApi.getProducts,
    staleTime: 60_000,
  });

  const topCarted     = data?.data?.top_carted     || [];
  const topWishlisted = data?.data?.top_wishlisted  || [];
  const topSearched   = data?.data?.top_searched   || [];
  const orderBySize   = data?.data?.order_by_size   || [];
  const orderByColor  = data?.data?.order_by_color  || [];
  const topOrdered        = data?.data?.top_ordered        || [];
  const orderByCategory    = data?.data?.order_by_category    || [];
  const orderBySubCategory = data?.data?.order_by_sub_category || [];
  const orderByType        = data?.data?.order_by_type        || [];

  const maxOrderCategory    = orderByCategory[0]?.count    || 1;
  const maxOrderSubCategory = orderBySubCategory[0]?.count || 1;
  const maxOrderType        = orderByType[0]?.count        || 1;

  const maxSize  = orderBySize[0]?.count  || 1;
  const maxColor = orderByColor[0]?.count || 1;

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Product Insights</h1>
        <p className="text-sm text-gray-500 mt-0.5">Top products, sizes, and colors by cart adds, wishlists, and searches</p>
      </div>

      {/* Most Ordered */}
      <Section
        icon={Package}
        title="Most Ordered Products"
        color="bg-orange-500"
        bgColor="bg-orange-50"
        borderColor="border-orange-200"
        badge="by units sold"
        empty={topOrdered.length === 0}
      >
        {topOrdered.map((p, i) => (
          <div key={p.product_id} className="flex items-center gap-3 py-2.5 border-b border-gray-400 last:border-0">
            <RankBadge rank={i + 1} />
            <img
              src={p.image || '/placeholder.svg'}
              alt={p.name}
              className="w-10 h-12 object-cover rounded-lg shrink-0 bg-gray-100"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {p.category && <span className="mr-2 text-orange-600 font-semibold">{p.category}</span>}
                {p.offer_price ? formatPrice(p.offer_price) : formatPrice(p.price)}
              </p>
            </div>
            <span className="text-sm font-bold text-orange-600 shrink-0">
              {p.order_count} <span className="text-xs font-normal text-gray-400">units</span>
            </span>
          </div>
        ))}
      </Section>

      {/* Row 1 — products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Section
          icon={ShoppingCart}
          title="Most Added to Cart"
          color="bg-blue-500"
          bgColor="bg-blue-50"
          borderColor="border-blue-200"
          badge="top size & color shown"
          empty={topCarted.length === 0}
        >
          {topCarted.map((p, i) => (
            <ProductRow
              key={p.product_id}
              rank={i + 1}
              product={p}
              countKey="cart_count"
              countLabel="adds"
              countColor="text-blue-600"
              showVariant
            />
          ))}
        </Section>

        <Section
          icon={Heart}
          title="Most Wishlisted"
          color="bg-pink-500"
          bgColor="bg-pink-50"
          borderColor="border-pink-200"
          empty={topWishlisted.length === 0}
        >
          {topWishlisted.map((p, i) => (
            <ProductRow
              key={p.product_id}
              rank={i + 1}
              product={p}
              countKey="wishlist_count"
              countLabel="saves"
              countColor="text-pink-600"
            />
          ))}
        </Section>

        <Section
          icon={Search}
          title="Top Searches"
          color="bg-purple-500"
          bgColor="bg-purple-50"
          borderColor="border-purple-200"
          empty={topSearched.length === 0}
        >
          {topSearched.map((item, i) => (
            <SearchRow key={item.term} rank={i + 1} item={item} />
          ))}
        </Section>
      </div>

      {/* Row 2 — size & color breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Section
          icon={Ruler}
          title="Most Ordered Sizes"
          color="bg-blue-600"
          bgColor="bg-white"
          borderColor="border-blue-200"
          badge="by units sold"
          empty={orderBySize.length === 0}
        >
          {orderBySize.map((item, i) => (
            <BarRow
              key={item.size}
              rank={i + 1}
              label={item.size}
              count={item.count}
              max={maxSize}
              color="bg-blue-400"
              minPrice={item.min_price}
              maxPrice={item.max_price}
            />
          ))}
        </Section>

        <Section
          icon={Palette}
          title="Most Ordered Colors"
          color="bg-indigo-500"
          bgColor="bg-white"
          borderColor="border-indigo-200"
          badge="by units sold"
          empty={orderByColor.length === 0}
        >
          {orderByColor.map((item, i) => (
            <BarRow
              key={item.color}
              rank={i + 1}
              label={item.color}
              count={item.count}
              max={maxColor}
              color="bg-indigo-400"
              minPrice={item.min_price}
              maxPrice={item.max_price}
            />
          ))}
        </Section>
      </div>

      {/* Row 3 — most ordered by category / sub-category / type */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Section
          icon={LayoutGrid}
          title="Most Ordered Categories"
          color="bg-orange-500"
          bgColor="bg-white"
          borderColor="border-orange-200"
          badge="by units sold"
          empty={orderByCategory.length === 0}
        >
          {orderByCategory.map((item, i) => (
            <BarRow key={item.label} rank={i + 1} label={item.label} count={item.count} max={maxOrderCategory} color="bg-orange-400" minPrice={item.min_price} maxPrice={item.max_price} />
          ))}
        </Section>

        <Section
          icon={Layers}
          title="Most Ordered Sub-Categories"
          color="bg-amber-500"
          bgColor="bg-white"
          borderColor="border-amber-200"
          badge="by units sold"
          empty={orderBySubCategory.length === 0}
        >
          {orderBySubCategory.map((item, i) => (
            <BarRow key={item.label} rank={i + 1} label={item.label} count={item.count} max={maxOrderSubCategory} color="bg-amber-400" minPrice={item.min_price} maxPrice={item.max_price} />
          ))}
        </Section>

        <Section
          icon={Tag}
          title="Most Ordered Types"
          color="bg-rose-500"
          bgColor="bg-white"
          borderColor="border-rose-200"
          badge="by units sold"
          empty={orderByType.length === 0}
        >
          {orderByType.map((item, i) => (
            <BarRow key={item.label} rank={i + 1} label={item.label} count={item.count} max={maxOrderType} color="bg-rose-400" minPrice={item.min_price} maxPrice={item.max_price} />
          ))}
        </Section>
      </div>
    </div>
  );
}
