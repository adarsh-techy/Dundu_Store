import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronRight, Package } from 'lucide-react';
import { orderApi } from '../../../api';
import { formatPrice, formatDate, pluralize } from '../../../utils/format';
import { imageUrl } from '../../../utils/image';
import PageHeader from '../../../components/ui/PageHeader';
import EmptyState from '../../../components/ui/EmptyState';
import Badge from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import useDocumentTitle from '../../../hooks/useDocumentTitle';
import { STATUS_META } from '../../../utils/orderStatus';


export default function Orders() {
  useDocumentTitle('My orders');
  const { data, isLoading } = useQuery({ queryKey: ['orders'], queryFn: orderApi.list });
  const orders = data?.data?.orders || [];

  return (
    <div className="container-x max-w-3xl py-6 md:py-10">
      <PageHeader title="My orders" subtitle={orders.length ? pluralize(orders.length, 'order') : undefined} crumbs={[{ label: 'Orders' }]} />
      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      ) : orders.length === 0 ? (
        <EmptyState icon={Package} title="No orders yet" description="When you place an order it will show up here with live status updates." action="Start shopping" to="/products" />
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const st = STATUS_META[o.status] || STATUS_META.pending;
            const items = o.items || [];
            return (
              <Link key={o.id} to={`/orders/${o.id}`} className="card card-hover block overflow-hidden animate-fade-up">
                <div className="flex items-center justify-between px-4 py-3 border-b border-line">
                  <div className="flex items-center gap-2.5">
                    <p className="text-sm font-bold text-ink">#{o.order_number}</p>
                    <Badge color={st.color} dot>{st.label}</Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted">
                    {formatDate(o.created_at)} <ChevronRight className="h-4 w-4 text-faint" />
                  </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex shrink-0">
                    {items.slice(0, 3).map((item, i) => (
                      <div key={i} className="w-11 h-14 rounded-lg overflow-hidden bg-elevated border-2 border-card" style={{ marginLeft: i ? -10 : 0 }}>
                        <img src={imageUrl(item.image)} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                    {items.length > 3 && (
                      <div className="w-11 h-14 rounded-lg bg-elevated border-2 border-card flex items-center justify-center text-[11px] font-bold text-muted" style={{ marginLeft: -10 }}>+{items.length - 3}</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {items.slice(0, 2).map((item, i) => (
                      <p key={i} className="text-xs text-ink-2 truncate">{item.product_name} <span className="text-faint">× {item.quantity}</span></p>
                    ))}
                    {items.length > 2 && <p className="text-xs text-faint">+{items.length - 2} more</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-ink">{formatPrice(o.total)}</p>
                    <p className="text-[11px] text-muted">{pluralize(items.length, 'item')}</p>
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
