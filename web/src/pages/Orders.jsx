import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronRight, Package } from 'lucide-react';
import { orderApi } from '../api';
import { formatPrice, formatDate } from '../utils/format';
import Spinner from '../components/ui/Spinner';

const STATUS_STYLE = {
  pending:   { bg: '#2d2000', color: '#facc15', label: 'Pending' },
  packed:    { bg: '#0a1e3d', color: '#60a5fa', label: 'Packed' },
  shipped:   { bg: '#0a1e3d', color: '#818cf8', label: 'Shipped' },
  delivered: { bg: '#052e16', color: '#4ade80', label: 'Delivered' },
  cancelled: { bg: '#2d1515', color: '#f87171', label: 'Cancelled' },
  returned:  { bg: '#1a1a1a', color: '#9ca3af', label: 'Returned' },
};

export default function Orders() {
  const { data, isLoading } = useQuery({ queryKey: ['orders'], queryFn: orderApi.list });
  const orders = data?.data?.orders || [];

  if (isLoading) return <Spinner />;

  return (
    <div className="max-w-2xl mx-auto px-3 py-5 md:px-4 md:py-8">
      <h1 className="text-xl md:text-2xl font-bold mb-5" style={{ color: '#f5f5f5' }}>My Orders</h1>

      {orders.length === 0 ? (
        <div className="text-center py-24" style={{ color: '#555' }}>
          <Package className="mx-auto mb-3 opacity-20" style={{ width: 48, height: 48 }} />
          <p className="text-sm mb-3">No orders yet</p>
          <Link to="/products" className="text-sm font-semibold hover:underline" style={{ color: '#e91e8c' }}>
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const st = STATUS_STYLE[o.status] || STATUS_STYLE.pending;
            return (
              <Link key={o.id} to={`/orders/${o.id}`}
                className="block rounded-2xl overflow-hidden transition-opacity active:opacity-80"
                style={{ border: '1px solid #2e2e2e', backgroundColor: '#1a1a1a' }}>

                {/* Top bar */}
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #222' }}>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold" style={{ color: '#f5f5f5' }}>#{o.order_number}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                      style={{ backgroundColor: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <p className="text-xs" style={{ color: '#555' }}>{formatDate(o.created_at)}</p>
                    <ChevronRight className="h-4 w-4" style={{ color: '#444' }} />
                  </div>
                </div>

                {/* Content */}
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Item thumbnails */}
                  <div className="flex shrink-0" style={{ gap: '-4px' }}>
                    {o.items?.slice(0, 3).map((item, i) => (
                      <div key={i} className="w-11 h-13 rounded-lg overflow-hidden shrink-0"
                        style={{
                          backgroundColor: '#2a2a2a',
                          border: '2px solid #1a1a1a',
                          marginLeft: i > 0 ? '-8px' : 0,
                          width: 44, height: 52,
                        }}>
                        {item.image
                          ? <img src={item.image} alt={item.product_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>👗</div>
                        }
                      </div>
                    ))}
                    {o.items?.length > 3 && (
                      <div style={{
                        width: 44, height: 52, marginLeft: -8,
                        backgroundColor: '#222', border: '2px solid #1a1a1a',
                        borderRadius: 8, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 11, color: '#666', fontWeight: 700,
                      }}>
                        +{o.items.length - 3}
                      </div>
                    )}
                  </div>

                  {/* Names */}
                  <div className="flex-1 min-w-0">
                    {o.items?.slice(0, 2).map((item, i) => (
                      <p key={i} className="text-xs truncate" style={{ color: '#888' }}>
                        {item.product_name} × {item.quantity}
                      </p>
                    ))}
                    {(o.items?.length || 0) > 2 && (
                      <p className="text-xs" style={{ color: '#555' }}>+{o.items.length - 2} more item{o.items.length - 2 > 1 ? 's' : ''}</p>
                    )}
                  </div>

                  {/* Total */}
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold" style={{ color: '#e91e8c' }}>{formatPrice(o.total)}</p>
                    <p className="text-xs" style={{ color: '#555' }}>{o.items?.length} item{o.items?.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
