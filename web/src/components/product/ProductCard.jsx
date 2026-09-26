import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Heart, ShoppingBag, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatPrice, discount } from '../../utils/format';
import { imageUrl } from '../../utils/image';
import useCartStore from '../../store/cart.store';
import useAuthStore from '../../store/auth.store';
import useSettingsStore from '../../store/settings.store';
import { userApi } from '../../api';

export default function ProductCard({ product, priority = false }) {
  const { addToCart, isLoading } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const offerBadgeColor = useSettingsStore((s) => s.offerBadgeColor);
  const offerBadgeTextColor = useSettingsStore((s) => s.offerBadgeTextColor);
  const navigate = useNavigate();
  const location = useLocation();
  const [wishlisted, setWishlisted] = useState(!!product.is_wishlisted);
  const [busy, setBusy] = useState(false);

  const id = product.product_id || product.id;
  const off = discount(product.price, product.offer_price);
  const soldOut = product.stock !== undefined && product.stock !== null && Number(product.stock) <= 0;
  const rating = Number(product.avg_rating) || 0;

  const requireLogin = () => {
    sessionStorage.setItem('auth_redirect', location.pathname + location.search);
    navigate('/login', { state: { from: location } });
  };

  const handleAddToCart = async (e) => {
    e.preventDefault();
    if (!isAuthenticated()) return requireLogin();
    // Products with size/colour variants are chosen on the detail page.
    if (product.has_variants || product.variant_count > 0) { navigate(`/products/${id}`); return; }
    try {
      await addToCart(id);
      toast.success('Added to your bag');
    } catch (err) {
      toast.error(err?.message || 'Could not add to bag');
    }
  };

  const handleWishlist = async (e) => {
    e.preventDefault();
    if (!isAuthenticated()) return requireLogin();
    if (busy) return;
    setBusy(true);
    try {
      const res = await userApi.toggleWishlist(id);
      setWishlisted(!!res.data.wishlisted);
      toast.success(res.data.wishlisted ? 'Saved to wishlist' : 'Removed from wishlist');
    } catch {
      toast.error('Something went wrong');
    } finally { setBusy(false); }
  };

  return (
    <Link to={`/products/${id}`} className="group block" aria-label={product.name}>
      <div className="relative overflow-hidden rounded-2xl aspect-[3/4] bg-elevated border border-line/60">
        <img
          src={imageUrl(product.image || product.primary_image)}
          alt={product.name}
          loading={priority ? 'eager' : 'lazy'}
          className={`w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06] ${soldOut ? 'opacity-50 grayscale' : ''}`}
        />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
          {off > 0 && !soldOut && (
            <span className="text-[11px] font-bold px-2 py-1 rounded-full shadow" style={{ backgroundColor: offerBadgeColor, color: offerBadgeTextColor }}>
              {off}% OFF
            </span>
          )}
          {product.is_new_arrival && <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-white text-black">NEW</span>}
        </div>

        <button
          onClick={handleWishlist}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={wishlisted}
          className="absolute top-2.5 right-2.5 h-9 w-9 rounded-full glass border border-white/10 flex items-center justify-center hover:scale-110 transition-transform"
        >
          <Heart className={`h-4 w-4 transition-colors ${wishlisted ? 'fill-primary text-primary' : 'text-white'}`} />
        </button>

        {soldOut ? (
          <span className="absolute inset-x-3 bottom-3 text-center text-xs font-bold py-2 rounded-full bg-black/70 text-white">Sold out</span>
        ) : (
          <button
            onClick={handleAddToCart}
            disabled={isLoading}
            className="absolute inset-x-3 bottom-3 translate-y-[140%] group-hover:translate-y-0 focus-visible:translate-y-0 transition-transform duration-300
              h-10 rounded-full bg-white text-black text-sm font-semibold flex items-center justify-center gap-2 shadow-lg hover:bg-primary hover:text-white"
          >
            <ShoppingBag className="h-4 w-4" /> Add to bag
          </button>
        )}
      </div>

      <div className="mt-2.5 px-0.5">
        {product.category_name && <p className="text-[10.5px] uppercase tracking-wider text-faint font-semibold">{product.category_name}</p>}
        <p className="text-sm font-medium line-clamp-2 leading-snug text-ink-2 group-hover:text-ink transition-colors">{product.name}</p>
        <div className="flex items-center justify-between gap-2 mt-1">
          <div className="flex items-baseline gap-2">
            <span className={`text-sm font-bold ${product.offer_price ? 'text-success' : 'text-ink'}`}>
              {formatPrice(product.offer_price || product.price)}
            </span>
            {product.offer_price && <span className="text-xs line-through text-faint">{formatPrice(product.price)}</span>}
          </div>
          {rating > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-warning">
              <Star className="h-3 w-3 fill-current" />{rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
