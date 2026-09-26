import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Star, Gift, TrendingUp, Phone } from 'lucide-react';
import { loyaltyApi } from '../../../api';
import useAuthStore from '../../../store/auth.store';
import PageHeader from '../../../components/ui/PageHeader';
import Button from '../../../components/ui/Button';
import useDocumentTitle from '../../../hooks/useDocumentTitle';
import { formatPrice } from '../../../utils/format';

const REDEEM_THRESHOLD = 200;
const REDEEM_VALUE = 200;

export default function LoyaltyCard() {
  useDocumentTitle('Loyalty card');
  const { user } = useAuthStore();
  const userDigits = (user?.phone || '').replace(/\D/g, '').slice(-10);
  const [typed, setTyped] = useState(null);          // what the visitor typed (null = untouched)
  const [queryPhone, setQueryPhone] = useState(null); // phone submitted for lookup
  const phone = typed ?? userDigits;
  const activePhone = queryPhone ?? (userDigits.length === 10 ? userDigits : '');

  const { data, isFetching, isError } = useQuery({
    queryKey: ['loyalty-card', activePhone],
    queryFn: () => loyaltyApi.check(activePhone),
    enabled: activePhone.length === 10,
    retry: false,
  });
  const card = data?.data?.card || null;
  const notFound = activePhone.length === 10 && !isFetching && (isError || (data && !card));
  const loading = isFetching;

  const lookup = (e) => { e.preventDefault(); setQueryPhone(phone.replace(/\D/g, '').slice(-10)); };

  const redeemableCount = card ? Math.floor(card.points / REDEEM_THRESHOLD) : 0;
  const pointsAfterRedeem = card ? card.points % REDEEM_THRESHOLD : 0;
  const progress = card ? Math.round((pointsAfterRedeem / REDEEM_THRESHOLD) * 100) : 0;
  const redeemableAmount = redeemableCount * REDEEM_VALUE;

  return (
    <div className="container-x max-w-2xl py-6 md:py-10">
      <PageHeader title="Loyalty card" subtitle={`Earn 20 points every ₹500 spent · Redeem ${REDEEM_THRESHOLD} points for ${formatPrice(REDEEM_VALUE)} off`} crumbs={[{ label: 'Loyalty card' }]} />

      <form onSubmit={lookup} className="flex gap-2 mb-8">
        <div className="relative flex-1">
          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-faint" />
          <input value={phone} onChange={(e) => setTyped(e.target.value)} placeholder="Enter your phone number" inputMode="tel" className="input pl-10 h-12" aria-label="Phone number" />
        </div>
        <Button type="submit" loading={loading} size="lg">Check</Button>
      </form>

      {card && (
        <div className="relative overflow-hidden rounded-3xl p-7 border border-primary/30 bg-gradient-to-br from-[#2a0b1c] via-[#170a11] to-bg animate-fade-up">
          <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-primary/25 blur-3xl" />
          <div className="relative space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="eyebrow">Member</p>
                <p className="font-display text-2xl text-ink mt-1">{card.name || 'Dundu Member'}</p>
                <p className="text-sm text-muted">{card.phone}</p>
              </div>
              <div className="text-right">
                <p className="font-display text-5xl text-primary-soft leading-none">{card.points}</p>
                <p className="text-xs text-muted mt-1">points</p>
              </div>
            </div>

            {redeemableCount > 0 && (
              <div className="rounded-2xl px-4 py-3 flex items-center gap-3 bg-primary/15 border border-primary/30">
                <Gift className="h-5 w-5 shrink-0 text-primary-soft" />
                <div>
                  <p className="text-sm font-semibold text-ink">{formatPrice(redeemableAmount)} ready to redeem</p>
                  <p className="text-xs text-muted">Use it at checkout or show this at the billing counter</p>
                </div>
              </div>
            )}

            <div>
              <div className="flex justify-between text-xs text-muted mb-2">
                <span>{pointsAfterRedeem} pts toward next reward</span>
                <span>{REDEEM_THRESHOLD - pointsAfterRedeem} more needed</span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary-soft transition-all duration-700" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="card p-4">
                <TrendingUp className="h-4 w-4 text-primary-soft" />
                <p className="text-lg font-bold text-ink mt-2">{formatPrice(card.total_spent)}</p>
                <p className="text-xs text-muted">Total spent</p>
              </div>
              <div className="card p-4">
                <Gift className="h-4 w-4 text-primary-soft" />
                <p className="text-lg font-bold text-ink mt-2">{formatPrice(redeemableAmount)}</p>
                <p className="text-xs text-muted">Redeemable now</p>
              </div>
            </div>
            <p className="text-xs text-center text-faint">Member since {new Date(card.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
      )}

      {notFound && (
        <div className="card p-8 text-center animate-fade-up">
          <Star className="h-10 w-10 mx-auto mb-3 text-faint" />
          <p className="font-display text-lg text-ink">No loyalty card yet</p>
          <p className="text-sm text-muted mt-1">Your card is created automatically with your first purchase online or in store.</p>
        </div>
      )}

      <div className="card p-5 mt-8">
        <p className="text-sm font-semibold text-ink mb-3">How it works</p>
        <ol className="space-y-2 text-sm text-ink-2 list-decimal list-inside">
          <li>Every ₹500 you spend at Dundu earns 20 points.</li>
          <li>At {REDEEM_THRESHOLD} points, redeem {formatPrice(REDEEM_VALUE)} off at checkout with one tap.</li>
          <li>Points work online and in store — one card, everywhere.</li>
        </ol>
      </div>
    </div>
  );
}
