import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { formatPrice, discount } from '../../utils/format';
import useCartStore from '../../store/cart.store';
import useAuthStore from '../../store/auth.store';
import useSettingsStore from '../../store/settings.store';
import toast from 'react-hot-toast';
import { userApi } from '../../api';

export default function ProductCard({ product }) {
  const { addToCart, isLoading } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const offerBadgeColor = useSettingsStore((s) => s.offerBadgeColor);
  const offerBadgeTextColor = useSettingsStore((s) => s.offerBadgeTextColor);
  const navigate = useNavigate();
  const location = useLocation();

  const off = discount(product.price, product.offer_price);

  const handleAddToCart = async (e) => {
    e.preventDefault();
    if (!isAuthenticated()) { sessionStorage.setItem('auth_redirect', location.pathname); navigate('/login', { state: { from: location } }); return; }
    try {
      await addToCart(product.product_id || product.id);
      toast.success('Added to cart');
    } catch {
      toast.error('Failed to add to cart');
    }
  };

  const handleWishlist = async (e) => {
    e.preventDefault();
    if (!isAuthenticated()) { sessionStorage.setItem('auth_redirect', location.pathname); navigate('/login', { state: { from: location } }); return; }
    try {
      const res = await userApi.toggleWishlist(product.product_id || product.id);
      toast.success(res.data.wishlisted ? 'Added to wishlist' : 'Removed from wishlist');
    } catch {
      toast.error('Something went wrong');
    }
  };

  return (
    <Link to={`/products/${product.product_id || product.id}`} className="group block">
      <div className="relative overflow-hidden rounded-xl aspect-[3/4]" style={{ backgroundColor: '#222' }}>
        <img
          src={product.image || product.primary_image || '/placeholder.jpg'}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {off > 0 && (
          <span className="absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: offerBadgeColor, color: offerBadgeTextColor }}>
            {off}% OFF
          </span>
        )}
        <button
          onClick={handleWishlist}
          className="absolute top-2 right-2 p-1.5 rounded-full shadow hover:scale-110 transition-transform"
          style={{ backgroundColor: '#1a1a1a' }}
        >
          <Heart className="h-4 w-4" style={{ color: '#e91e8c' }} />
        </button>
        <div className="absolute top-0 left-0 right-0 p-3 -translate-y-full group-hover:translate-y-0 transition-transform duration-200">
          <button
            onClick={handleAddToCart}
            disabled={isLoading}
            className="w-full text-white text-sm font-medium py-2 rounded-lg transition-colors mb-2"
            style={{ backgroundColor: '#e91e8c' }}
          >
            Add to Cart
          </button>
        </div>
      </div>
      <div className="mt-2 px-0.5">
        <div className="flex items-start justify-between gap-1">
          <p className="text-sm font-medium line-clamp-2 leading-snug" style={{ color: '#ddd' }}>{product.name}</p>
          {product.avg_rating > 0 && (
            <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
              <span className="text-xs" style={{ color: '#facc15' }}>★</span>
              <span className="text-[11px] font-medium" style={{ color: '#facc15' }}>{Number(product.avg_rating).toFixed(1)}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-semibold" style={{ color: product.offer_price ? '#22c55e' : '#f5f5f5' }}>
            {formatPrice(product.offer_price || product.price)}
          </span>
          {product.offer_price && (
            <span className="text-xs line-through" style={{ color: '#666' }}>{formatPrice(product.price)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
