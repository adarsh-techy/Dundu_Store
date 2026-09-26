import { useEffect } from 'react';
import { X, Trash2, ShoppingBag, Minus, Plus, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import useCartStore, { cartItemPrice, cartItemName, cartItemImage } from '../../store/cart.store';
import { formatPrice } from '../../utils/format';
import { imageUrl } from '../../utils/image';

export default function CartDrawer() {
  const { items, isOpen, closeCart, updateItem, removeItem, totalPrice, totalItems } = useCartStore();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === 'Escape' && closeCart();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [isOpen, closeCart]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] animate-fade-in" onClick={closeCart} />
      <aside className="fixed right-0 top-0 h-full w-full max-w-md z-[95] flex flex-col bg-surface border-l border-line shadow-2xl animate-slide-in-right"
        role="dialog" aria-modal="true" aria-label="Shopping cart">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 className="font-display text-xl text-ink">
            Your bag {items.length > 0 && <span className="text-sm font-sans text-muted">({totalItems()})</span>}
          </h2>
          <button onClick={closeCart} className="p-2 rounded-full text-muted hover:text-ink hover:bg-white/5" aria-label="Close cart">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <div className="h-16 w-16 rounded-2xl bg-elevated border border-line flex items-center justify-center">
                <ShoppingBag className="h-7 w-7 text-primary" />
              </div>
              <p className="font-display text-lg text-ink">Your bag is empty</p>
              <p className="text-sm text-muted">Find something you love.</p>
              <Link to="/products" onClick={closeCart} className="mt-2 text-sm font-semibold text-primary-soft hover:underline">
                Start shopping →
              </Link>
            </div>
          ) : (
            items.map((item) => {
              const name = cartItemName(item);
              const unit = cartItemPrice(item);
              const selections = Array.isArray(item.combo_selections) ? item.combo_selections : [];
              return (
                <div key={item.id} className="flex gap-3.5 animate-fade-in">
                  <Link to={item.combo_id ? `/combos/${item.combo_id}` : `/products/${item.product_id}`} onClick={closeCart}
                    className="w-[72px] h-[92px] rounded-xl overflow-hidden bg-elevated shrink-0">
                    <img src={imageUrl(cartItemImage(item))} alt={name} className="w-full h-full object-cover" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-snug line-clamp-2 text-ink">{name}</p>
                      <button onClick={() => removeItem(item.id)} className="text-faint hover:text-danger transition-colors shrink-0" aria-label={`Remove ${name}`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {item.combo_id ? (
                      <p className="text-xs text-muted mt-0.5 line-clamp-2">
                        Bundle · {selections.map((s) => [s.slot_label, s.size, s.color].filter(Boolean).join(' ')).join(', ') || 'combo'}
                      </p>
                    ) : (item.size || item.color) && (
                      <p className="text-xs text-muted mt-0.5">{[item.size, item.color].filter(Boolean).join(' · ')}</p>
                    )}
                    <div className="flex items-center justify-between mt-2.5">
                      <div className="inline-flex items-center rounded-full border border-line bg-card">
                        <button onClick={() => item.quantity > 1 ? updateItem(item.id, item.quantity - 1) : removeItem(item.id)}
                          className="h-8 w-8 flex items-center justify-center text-muted hover:text-ink" aria-label="Decrease quantity">
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold text-ink">{item.quantity}</span>
                        <button onClick={() => updateItem(item.id, Math.min(99, item.quantity + 1))}
                          className="h-8 w-8 flex items-center justify-center text-muted hover:text-ink" aria-label="Increase quantity">
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="text-sm font-bold text-ink">{formatPrice(unit * item.quantity)}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {items.length > 0 && (
          <div className="px-5 py-4 border-t border-line space-y-3 safe-bottom bg-surface">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Subtotal</span>
              <span className="font-bold text-ink">{formatPrice(totalPrice())}</span>
            </div>
            <p className="text-xs text-faint">Shipping and discounts are calculated at checkout.</p>
            <Link to="/checkout" onClick={closeCart}
              className="flex items-center justify-center gap-2 w-full h-12 rounded-full bg-primary text-white font-semibold hover:bg-primary-deep transition-colors">
              Checkout <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/products" onClick={closeCart} className="block text-center text-sm text-muted hover:text-ink">Continue shopping</Link>
          </div>
        )}
      </aside>
    </>
  );
}
