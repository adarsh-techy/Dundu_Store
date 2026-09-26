import { formatPrice, discount } from '../../utils/format';

export default function Price({ price, offer, size = 'md', className = '' }) {
  const hasOffer = offer && Number(offer) < Number(price);
  const cls = { sm: 'text-sm', md: 'text-base', lg: 'text-2xl', xl: 'text-3xl' }[size];
  return (
    <div className={`flex items-baseline gap-2 flex-wrap ${className}`}>
      <span className={`${cls} font-bold ${hasOffer ? 'text-success' : 'text-ink'}`}>{formatPrice(hasOffer ? offer : price)}</span>
      {hasOffer && (
        <>
          <span className="text-xs text-faint line-through">{formatPrice(price)}</span>
          <span className="text-xs font-bold text-primary-soft">{discount(price, offer)}% off</span>
        </>
      )}
    </div>
  );
}
