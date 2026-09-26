import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Trash2, Heart, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import { userApi } from '../../../api';
import { formatPrice, pluralize } from '../../../utils/format';
import { imageUrl } from '../../../utils/image';
import useCartStore from '../../../store/cart.store';
import PageHeader from '../../../components/ui/PageHeader';
import EmptyState from '../../../components/ui/EmptyState';
import { ProductGridSkeleton } from '../../../components/ui/Skeleton';
import useDocumentTitle from '../../../hooks/useDocumentTitle';

export default function Wishlist() {
  useDocumentTitle('Wishlist');
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
      toast.success('Moved to your bag');
    } catch (e) { toast.error(e?.message || 'Could not add to bag'); }
  };

  return (
    <div className="container-x py-6 md:py-10">
      <PageHeader title="Wishlist" subtitle={items.length ? pluralize(items.length, 'saved item') : undefined} crumbs={[{ label: 'Wishlist' }]} />
      {isLoading ? <ProductGridSkeleton count={8} /> : items.length === 0 ? (
        <EmptyState icon={Heart} title="Nothing saved yet" description="Tap the heart on any product to keep it here for later." action="Browse products" to="/products" />
      ) : (
        <div className="product-grid">
          {items.map((item) => (
            <div key={item.id} className="group animate-fade-up">
              <Link to={`/products/${item.product_id}`} className="block relative aspect-[3/4] rounded-2xl overflow-hidden bg-elevated border border-line/60">
                <img src={imageUrl(item.image)} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                <button onClick={(e) => { e.preventDefault(); remove(item.product_id); }} aria-label="Remove from wishlist"
                  className="absolute top-2.5 right-2.5 h-9 w-9 rounded-full glass border border-white/10 flex items-center justify-center text-white hover:text-danger">
                  <Trash2 className="h-4 w-4" />
                </button>
              </Link>
              <div className="mt-2.5 px-0.5">
                <p className="text-sm font-medium line-clamp-2 text-ink-2">{item.name}</p>
                <p className="text-sm font-bold mt-1 text-ink">{formatPrice(item.offer_price || item.price)}</p>
                <button onClick={() => moveToCart(item.product_id)}
                  className="mt-2.5 w-full h-10 rounded-full bg-primary text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary-deep transition-colors">
                  <ShoppingBag className="h-4 w-4" /> Add to bag
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
