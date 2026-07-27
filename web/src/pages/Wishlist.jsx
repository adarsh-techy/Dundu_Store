import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { userApi } from '../api';
import { formatPrice } from '../utils/format';
import useCartStore from '../store/cart.store';
import Spinner from '../components/ui/Spinner';
import toast from 'react-hot-toast';

export default function Wishlist() {
  const qc = useQueryClient();
  const { addToCart } = useCartStore();
  const { data, isLoading } = useQuery({ queryKey: ['wishlist'], queryFn: userApi.getWishlist });
  const items = data?.data?.wishlist || [];

  const remove = async (product_id) => {
    await userApi.toggleWishlist(product_id);
    qc.invalidateQueries({ queryKey: ['wishlist'] });
  };

  const moveToCart = async (product_id) => {
    try {
      await addToCart(product_id);
      await userApi.toggleWishlist(product_id);
      qc.invalidateQueries({ queryKey: ['wishlist'] });
      toast.success('Moved to cart');
    } catch { toast.error('Failed'); }
  };

  if (isLoading) return <Spinner />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6" style={{ color: '#f5f5f5' }}>Wishlist</h1>
      {items.length === 0 ? (
        <div className="text-center py-20" style={{ color: '#555' }}>
          <p className="text-4xl mb-3">🤍</p>
          <p>Your wishlist is empty</p>
          <Link to="/products" className="mt-3 inline-block text-sm font-medium hover:underline" style={{ color: '#e91e8c' }}>Browse Products</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl overflow-hidden group" style={{ border: '1px solid #2e2e2e', backgroundColor: '#1a1a1a' }}>
              <Link to={`/products/${item.product_id}`}>
                <div className="aspect-[3/4] overflow-hidden" style={{ backgroundColor: '#222' }}>
                  <img src={item.image || '/placeholder.svg'} alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
              </Link>
              <div className="p-3">
                <p className="text-sm font-medium line-clamp-2 leading-snug" style={{ color: '#ddd' }}>{item.name}</p>
                <p className="text-sm font-semibold mt-1" style={{ color: '#e91e8c' }}>{formatPrice(item.offer_price || item.price)}</p>
                <div className="flex gap-1.5 mt-2">
                  <button onClick={() => moveToCart(item.product_id)}
                    className="flex-1 text-white text-xs font-medium py-1.5 rounded-lg transition-opacity hover:opacity-90"
                    style={{ backgroundColor: '#e91e8c' }}>
                    Add to Cart
                  </button>
                  <button onClick={() => remove(item.product_id)}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ border: '1px solid #2e2e2e', color: '#555' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#3b0a0a'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#555'; e.currentTarget.style.borderColor = '#2e2e2e'; }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
