import { X, Trash2, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import useCartStore from '../../store/cart.store';
import { formatPrice } from '../../utils/format';

export default function CartDrawer() {
  const { items, isOpen, closeCart, updateItem, removeItem, totalPrice } = useCartStore();

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={closeCart} />
      <aside className="fixed right-0 top-0 h-full w-full max-w-sm z-50 flex flex-col shadow-2xl"
        style={{ backgroundColor: '#1a1a1a', borderLeft: '1px solid #2e2e2e' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid #2e2e2e' }}>
          <h2 className="font-semibold text-lg" style={{ color: '#f5f5f5' }}>
            Shopping Cart {items.length > 0 && <span className="text-sm font-normal" style={{ color: '#888' }}>({items.length})</span>}
          </h2>
          <button onClick={closeCart} className="p-1 rounded-full hover:bg-white/10 transition-colors">
            <X className="h-5 w-5" style={{ color: '#aaa' }} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: '#666' }}>
              <ShoppingBag className="h-12 w-12" />
              <p className="text-sm">Your cart is empty</p>
              <Link to="/products" onClick={closeCart} className="text-sm font-medium hover:underline"
                style={{ color: '#e91e8c' }}>
                Start shopping
              </Link>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex gap-3">
                <img
                  src={item.image || '/placeholder.svg'}
                  alt={item.name}
                  className="w-16 h-20 object-cover rounded-lg shrink-0"
                  style={{ backgroundColor: '#222' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug line-clamp-2" style={{ color: '#f5f5f5' }}>{item.name}</p>
                  {(item.size || item.color) && (
                    <p className="text-xs mt-0.5" style={{ color: '#666' }}>{[item.size, item.color].filter(Boolean).join(' / ')}</p>
                  )}
                  <p className="text-sm font-semibold mt-1" style={{ color: '#e91e8c' }}>
                    {formatPrice(item.offer_price || item.price)}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center rounded-lg" style={{ border: '1px solid #2e2e2e' }}>
                      <button
                        onClick={() => item.quantity > 1 ? updateItem(item.id, item.quantity - 1) : removeItem(item.id)}
                        className="px-2 py-1 hover:text-white transition-colors"
                        style={{ color: '#888' }}
                      >−</button>
                      <span className="px-3 text-sm font-medium" style={{ color: '#f5f5f5' }}>{item.quantity}</span>
                      <button
                        onClick={() => updateItem(item.id, item.quantity + 1)}
                        className="px-2 py-1 hover:text-white transition-colors"
                        style={{ color: '#888' }}
                      >+</button>
                    </div>
                    <button onClick={() => removeItem(item.id)} className="transition-colors" style={{ color: '#555' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = '#555'; }}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-4 space-y-3" style={{ borderTop: '1px solid #2e2e2e' }}>
            <div className="flex justify-between text-sm font-semibold">
              <span style={{ color: '#ddd' }}>Total</span>
              <span style={{ color: '#e91e8c' }}>{formatPrice(totalPrice())}</span>
            </div>
            <Link
              to="/checkout"
              onClick={closeCart}
              className="block w-full text-white font-medium py-3 rounded-xl text-center transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#e91e8c' }}
            >
              Proceed to Checkout
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
