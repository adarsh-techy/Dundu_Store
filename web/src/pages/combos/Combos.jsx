import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Gift } from 'lucide-react';
import { comboApi } from '../../api';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { imageUrl } from '../../utils/image';
import { formatPrice, discount } from '../../utils/format';

export default function Combos() {
  useDocumentTitle('Combo offers');
  const { data, isLoading } = useQuery({ queryKey: ['combos'], queryFn: comboApi.list });
  const combos = data?.data?.combos || [];

  return (
    <div className="container-x py-8 md:py-12">
      <PageHeader title="Combo offers" subtitle="Curated sets at one bundle price — pick your sizes and save." crumbs={[{ label: 'Combos' }]} />
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-[4/4.2] rounded-2xl" />)}
        </div>
      ) : combos.length === 0 ? (
        <EmptyState icon={Gift} title="No combos right now" description="Check back soon — new bundles drop regularly." action="Browse products" to="/products" />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {combos.map((c) => {
            const off = discount(c.price, c.offer_price);
            const preview = (c.slots || []).flatMap((s) => (s.products || []).slice(0, 1));
            return (
              <Link key={c.id} to={`/combos/${c.id}`} className="card card-hover overflow-hidden group animate-fade-up">
                <div className="relative aspect-[4/3] bg-elevated overflow-hidden">
                  {c.image_url ? (
                    <img src={imageUrl(c.image_url)} alt={c.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                  ) : (
                    <div className="grid grid-cols-2 h-full">
                      {preview.slice(0, 4).map((p, i) => (
                        <img key={i} src={imageUrl(p?.image)} alt="" className="w-full h-full object-cover" loading="lazy" />
                      ))}
                    </div>
                  )}
                  {off > 0 && <span className="absolute top-3 left-3 text-[11px] font-bold px-2 py-1 rounded-full bg-primary text-white">Save {off}%</span>}
                </div>
                <div className="p-4">
                  <p className="font-semibold text-ink">{c.name}</p>
                  <p className="text-xs text-muted mt-1 line-clamp-2">{c.description || (c.slots || []).map((s) => s.slot_label).join(' + ')}</p>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold text-success">{formatPrice(c.offer_price || c.price)}</span>
                      {c.offer_price && <span className="text-xs line-through text-faint">{formatPrice(c.price)}</span>}
                    </div>
                    <span className="text-xs font-semibold text-primary-soft">{(c.slots || []).length} items</span>
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
