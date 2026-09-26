import { useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, ShoppingBag, Gift } from 'lucide-react';
import toast from 'react-hot-toast';
import { comboApi } from '../../api';
import useCartStore from '../../store/cart.store';
import useAuthStore from '../../store/auth.store';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Price from '../../components/ui/Price';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { imageUrl } from '../../utils/image';
import { formatPrice } from '../../utils/format';

export default function ComboDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { addComboToCart, isLoading: adding } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const { data, isLoading, isError } = useQuery({ queryKey: ['combo', id], queryFn: () => comboApi.getOne(id) });
  const combo = data?.data?.combo;
  useDocumentTitle(combo?.name || 'Combo');

  // selection[slotId] = { product_id, variant_id }
  const [selection, setSelection] = useState({});
  const [qty, setQty] = useState(1);

  const slots = combo?.slots || [];
  const complete = useMemo(() => slots.every((s) => {
    const sel = selection[s.id];
    const product = (s.products || []).find((p) => p.id === sel?.product_id) || ((s.products || []).length === 1 ? s.products[0] : null);
    if (!product) return false;
    const variants = (product.variants || []).filter((v) => (v.stock ?? 0) > 0);
    return variants.length === 0 || !!sel?.variant_id;
  }), [slots, selection]);

  const choose = (slotId, productId) => setSelection((s) => ({ ...s, [slotId]: { product_id: productId, variant_id: null } }));
  const chooseVariant = (slotId, productId, variantId) => setSelection((s) => ({ ...s, [slotId]: { product_id: productId, variant_id: variantId } }));

  const addToBag = async () => {
    if (!isAuthenticated()) {
      sessionStorage.setItem('auth_redirect', location.pathname);
      navigate('/login', { state: { from: location } });
      return;
    }
    const combo_selections = slots.map((s) => {
      const sel = selection[s.id] || {};
      const product = (s.products || []).find((p) => p.id === sel.product_id) || s.products?.[0];
      const variant = (product?.variants || []).find((v) => v.id === sel.variant_id);
      return { slot_id: s.id, slot_label: s.slot_label, product_id: product?.id, variant_id: variant?.id || null, size: variant?.size || null, color: variant?.color || null };
    });
    try {
      await addComboToCart(combo.id, combo_selections, qty);
      toast.success('Bundle added to your bag');
    } catch (e) {
      toast.error(e?.message || 'Could not add bundle');
    }
  };

  if (isLoading) return <Spinner />;
  if (isError || !combo) return <EmptyState icon={Gift} title="Combo not found" action="See all combos" to="/combos" />;

  const total = Number(combo.offer_price || combo.price);
  const regular = slots.reduce((sum, s) => {
    const sel = selection[s.id];
    const p = (s.products || []).find((x) => x.id === sel?.product_id) || s.products?.[0];
    return sum + (Number(p?.offer_price || p?.price) || 0);
  }, 0);

  return (
    <div className="container-x py-6 md:py-10">
      <PageHeader title={combo.name} subtitle={combo.description} crumbs={[{ label: 'Combos', to: '/combos' }, { label: combo.name }]} />
      <div className="grid lg:grid-cols-[1fr_380px] gap-8">
        <div className="space-y-6">
          {combo.image_url && (
            <div className="rounded-3xl overflow-hidden aspect-[16/8] bg-elevated">
              <img src={imageUrl(combo.image_url)} alt={combo.name} className="w-full h-full object-cover" />
            </div>
          )}
          {slots.map((slot, idx) => {
            const sel = selection[slot.id];
            const products = slot.products || [];
            const chosen = products.find((p) => p.id === sel?.product_id) || (products.length === 1 ? products[0] : null);
            const variants = (chosen?.variants || []);
            return (
              <section key={slot.id} className="card p-5 animate-fade-up">
                <div className="flex items-center gap-3 mb-4">
                  <span className="h-7 w-7 rounded-full bg-primary/15 text-primary-soft text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                  <h2 className="font-semibold text-ink">{slot.slot_label}</h2>
                  {products.length > 1 && <span className="text-xs text-muted">Choose one</span>}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {products.map((p) => {
                    const active = chosen?.id === p.id;
                    return (
                      <button key={p.id} onClick={() => choose(slot.id, p.id)}
                        className={`relative text-left rounded-2xl overflow-hidden border transition-all ${active ? 'border-primary ring-2 ring-primary/30' : 'border-line hover:border-line-strong'}`}>
                        <div className="aspect-[3/4] bg-elevated"><img src={imageUrl(p.image)} alt={p.name} className="w-full h-full object-cover" loading="lazy" /></div>
                        <div className="p-2.5">
                          <p className="text-xs font-medium text-ink line-clamp-2">{p.name}</p>
                          <p className="text-[11px] text-muted mt-0.5">{formatPrice(p.offer_price || p.price)}</p>
                        </div>
                        {active && <span className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center"><Check className="h-3.5 w-3.5" /></span>}
                      </button>
                    );
                  })}
                </div>

                {chosen && variants.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-muted mb-2">Size / colour</p>
                    <div className="flex flex-wrap gap-2">
                      {variants.map((v) => {
                        const out = (v.stock ?? 0) <= 0;
                        const active = sel?.variant_id === v.id;
                        return (
                          <button key={v.id} disabled={out} onClick={() => chooseVariant(slot.id, chosen.id, v.id)}
                            className={`chip ${active ? 'is-active' : ''} ${out ? 'opacity-40 line-through' : ''}`}>
                            {[v.size, v.color].filter(Boolean).join(' · ') || 'One size'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <aside className="lg:sticky lg:top-28 h-fit card p-5 space-y-4">
          <p className="eyebrow">Bundle price</p>
          <Price price={combo.price} offer={combo.offer_price} size="lg" />
          {regular > total && (
            <p className="text-xs text-success">You save {formatPrice(regular - total)} vs. buying separately ({formatPrice(regular)})</p>
          )}
          <div className="divider" />
          <ul className="space-y-2 text-sm">
            {slots.map((s) => {
              const sel = selection[s.id];
              const p = (s.products || []).find((x) => x.id === sel?.product_id) || (s.products?.length === 1 ? s.products[0] : null);
              const v = (p?.variants || []).find((x) => x.id === sel?.variant_id);
              return (
                <li key={s.id} className="flex items-start justify-between gap-3">
                  <span className="text-muted">{s.slot_label}</span>
                  <span className="text-right text-ink-2">{p ? p.name : <span className="text-warning">Choose</span>}{v ? <span className="text-faint"> · {[v.size, v.color].filter(Boolean).join(' ')}</span> : null}</span>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-muted">Quantity</span>
            <div className="inline-flex items-center rounded-full border border-line">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="h-9 w-9 text-muted hover:text-ink" aria-label="Decrease">−</button>
              <span className="w-6 text-center text-sm font-semibold">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(10, q + 1))} className="h-9 w-9 text-muted hover:text-ink" aria-label="Increase">+</button>
            </div>
          </div>
          <Button fullWidth size="lg" pill icon={ShoppingBag} loading={adding} disabled={!complete} onClick={addToBag}>
            {complete ? `Add bundle · ${formatPrice(total * qty)}` : 'Complete your selection'}
          </Button>
          {combo.stock != null && combo.stock <= 5 && combo.stock > 0 && <p className="text-xs text-warning text-center">Only {combo.stock} left</p>}
        </aside>
      </div>
    </div>
  );
}
