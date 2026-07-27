import { useState } from 'react';
import { Star, Gift, TrendingUp, Phone } from 'lucide-react';
import { loyaltyApi } from '../api';

const REDEEM_THRESHOLD = 200;

export default function LoyaltyCard() {
  const [phone, setPhone] = useState('');
  const [card, setCard] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  const lookup = async (e) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) return;
    setLoading(true);
    setNotFound(false);
    setCard(null);
    try {
      const res = await loyaltyApi.check(digits);
      if (res.data?.card) {
        setCard(res.data.card);
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const redeemableCount = card ? Math.floor(card.points / REDEEM_THRESHOLD) : 0;
  const pointsAfterRedeem = card ? card.points % REDEEM_THRESHOLD : 0;
  const progress = card ? Math.round((pointsAfterRedeem / REDEEM_THRESHOLD) * 100) : 0;
  const redeemableAmount = redeemableCount * 200;

  return (
    <div className="max-w-lg mx-auto px-4 py-12 space-y-8">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
          style={{ backgroundColor: '#1a0a12' }}>
          <Star className="h-8 w-8" style={{ color: '#e91e8c' }} />
        </div>
        <h1 className="text-3xl font-black tracking-wide" style={{ color: '#f5f5f5' }}>Dundu Loyalty Card</h1>
        <p className="mt-2 text-sm" style={{ color: '#666' }}>
          Earn 20 points every ₹500 spent · Redeem 200 points for ₹200 off
        </p>
      </div>

      <form onSubmit={lookup} className="space-y-3">
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#888' }} />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter your phone number"
            inputMode="tel"
            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none"
            style={{ backgroundColor: '#1a1a1a', border: '1px solid #2e2e2e', color: '#f5f5f5' }}
            onFocus={(e) => { e.target.style.borderColor = '#e91e8c'; }}
            onBlur={(e) => { e.target.style.borderColor = '#2e2e2e'; }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
          style={{ backgroundColor: '#e91e8c', color: '#fff' }}
        >
          {loading ? 'Checking...' : 'Check My Card'}
        </button>
      </form>

      {card && (
        <div className="rounded-2xl p-6 space-y-5"
          style={{ background: 'linear-gradient(135deg, #1a0a12 0%, #0d0d0d 100%)', border: '1px solid #3d1226' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-lg" style={{ color: '#f5f5f5' }}>{card.name || 'Dundu Member'}</p>
              <p className="text-sm" style={{ color: '#888' }}>{card.phone}</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-black" style={{ color: '#e91e8c' }}>{card.points}</p>
              <p className="text-xs" style={{ color: '#666' }}>points</p>
            </div>
          </div>

          {redeemableCount > 0 && (
            <div className="rounded-xl px-4 py-3 flex items-center gap-3"
              style={{ backgroundColor: '#3d1226', border: '1px solid #6b2040' }}>
              <Gift className="h-5 w-5 shrink-0" style={{ color: '#e91e8c' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: '#f5c2d4' }}>
                  ₹{redeemableAmount} redeemable now!
                </p>
                <p className="text-xs" style={{ color: '#a06070' }}>Show this at the billing counter</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between text-xs" style={{ color: '#888' }}>
              <span>{pointsAfterRedeem} pts toward next redemption</span>
              <span>{REDEEM_THRESHOLD - pointsAfterRedeem} more needed</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#2e2e2e' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, backgroundColor: '#e91e8c' }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3" style={{ backgroundColor: '#111', border: '1px solid #2e2e2e' }}>
              <TrendingUp className="h-4 w-4 mb-1" style={{ color: '#e91e8c' }} />
              <p className="text-lg font-bold" style={{ color: '#f5f5f5' }}>
                ₹{Number(card.total_spent).toLocaleString('en-IN')}
              </p>
              <p className="text-xs" style={{ color: '#666' }}>Total spent</p>
            </div>
            <div className="rounded-xl p-3" style={{ backgroundColor: '#111', border: '1px solid #2e2e2e' }}>
              <Gift className="h-4 w-4 mb-1" style={{ color: '#e91e8c' }} />
              <p className="text-lg font-bold" style={{ color: '#f5f5f5' }}>
                ₹{redeemableAmount}
              </p>
              <p className="text-xs" style={{ color: '#666' }}>Redeemable cash</p>
            </div>
          </div>

          <p className="text-xs text-center" style={{ color: '#555' }}>
            Member since {new Date(card.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      )}

      {notFound && (
        <div className="text-center py-8 rounded-2xl" style={{ border: '1px solid #2e2e2e', backgroundColor: '#1a1a1a' }}>
          <Star className="h-10 w-10 mx-auto mb-3" style={{ color: '#333' }} />
          <p style={{ color: '#888' }}>No loyalty card found for this number.</p>
          <p className="text-sm mt-1" style={{ color: '#555' }}>Make a purchase at our store to get one!</p>
        </div>
      )}

      <div className="rounded-xl p-4 text-center space-y-1" style={{ backgroundColor: '#111', border: '1px solid #2e2e2e' }}>
        <p className="text-xs font-semibold" style={{ color: '#888' }}>How it works</p>
        <p className="text-xs" style={{ color: '#555' }}>Every ₹500 you spend at Dundu earns 20 points.</p>
        <p className="text-xs" style={{ color: '#555' }}>When you reach 200 points, redeem ₹200 off your next purchase!</p>
      </div>
    </div>
  );
}
