import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ChevronLeft, MessageCircle, CheckCircle } from 'lucide-react';
import { orderApi } from '../../../api';
import { formatPrice, formatDate } from '../../../utils/format';
import Spinner from '../../../components/ui/Spinner';
import toast from 'react-hot-toast';
import useNow from '../../../hooks/useNow';

const SUPPORT_WA = import.meta.env.VITE_SUPPORT_WHATSAPP || '919999999999';

const RULES = [
  { icon: '🕐', title: 'Submit within 24 hours', desc: 'Request must be raised within 24 hours of delivery' },
  { icon: '📦', title: 'Return within 48 hours', desc: 'Item must be sent back within 48 hours of approval' },
  { icon: '🏷️', title: 'Original condition',     desc: 'Unused, with tags and original packaging intact' },
  { icon: '🎥', title: 'Unboxing video required', desc: 'A continuous, uncut unboxing video starting from package opening is mandatory for return approval' },
];

const REASONS = [
  { id: 'damaged', label: 'Product is damaged / defective', emoji: '💔' },
  { id: 'wrong',   label: 'Wrong item received',            emoji: '❌' },
  { id: 'size',    label: 'Size / fit issue',               emoji: '📏' },
  { id: 'quality', label: 'Quality not as described',       emoji: '⭐' },
  { id: 'mind',    label: 'Changed my mind',                emoji: '🔄' },
];

export default function ReturnRequest() {
  const { id } = useParams();
  const now = useNow();
  const [selectedReason, setSelectedReason] = useState(null);
  const [customMsg, setCustomMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ['order', id], queryFn: () => orderApi.getOne(id) });
  const order = data?.data?.order;

  if (isLoading) return <Spinner />;
  if (!order) return <div className="text-center py-20" style={{ color: '#555' }}>Order not found</div>;

  if (order.status !== 'delivered') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-3">
        <p className="text-4xl">🚫</p>
        <p className="text-sm font-semibold" style={{ color: '#f5f5f5' }}>Return not available</p>
        <p className="text-xs" style={{ color: '#666' }}>Only delivered orders can be returned.</p>
        <Link to={`/orders/${id}`} className="text-sm font-semibold hover:underline" style={{ color: '#e91e8c' }}>Back to Order</Link>
      </div>
    );
  }

  const deliveredAt = new Date(order.updated_at);
  const canReturn = (now - deliveredAt.getTime()) < 24 * 60 * 60 * 1000;

  if (!canReturn) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-3">
        <p className="text-4xl">⏰</p>
        <p className="text-sm font-semibold" style={{ color: '#f5f5f5' }}>Return window expired</p>
        <p className="text-xs" style={{ color: '#666' }}>Return requests must be submitted within 24 hours of delivery.</p>
        <Link to={`/orders/${id}`} className="text-sm font-semibold hover:underline" style={{ color: '#e91e8c' }}>Back to Order</Link>
      </div>
    );
  }

  const msLeft = deliveredAt.getTime() + 24 * 60 * 60 * 1000 - now;
  const hrsLeft = Math.floor(msLeft / (1000 * 60 * 60));
  const minsLeft = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));

  const finalReason = selectedReason
    ? customMsg.trim() ? `${selectedReason.label}. ${customMsg.trim()}` : selectedReason.label
    : customMsg.trim();

  const buildWhatsAppMsg = () => {
    const items = order.items?.map((i) => `  • ${i.product_name} × ${i.quantity}`).join('\n') || '';
    return encodeURIComponent(
      `Hi Dundu 👋\n\nReturn request for my order.\n\n` +
      `📦 Order: #${order.order_number}\n` +
      `📅 Ordered: ${formatDate(order.created_at)}\n` +
      `💰 Total: ${formatPrice(order.total)}\n\n` +
      `🛍️ Items:\n${items}\n\n` +
      `📝 Reason: ${finalReason}\n\nPlease assist. Thank you!`
    );
  };

  const handleSubmit = async () => {
    if (!finalReason) { toast.error('Please select a reason or describe your issue'); return; }
    setSubmitting(true);
    try {
      await orderApi.returnRequest(id, finalReason);
      setDone(true);
      setTimeout(() => {
        window.open(`https://wa.me/${SUPPORT_WA}?text=${buildWhatsAppMsg()}`, '_blank');
      }, 600);
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
          style={{ backgroundColor: '#0a2e1a', border: '2px solid #166534' }}>
          <CheckCircle className="h-8 w-8" style={{ color: '#4ade80' }} />
        </div>
        <p className="text-lg font-bold" style={{ color: '#f5f5f5' }}>Return Request Submitted!</p>
        <p className="text-sm" style={{ color: '#888' }}>
          A WhatsApp message has been opened. Send it to complete your return.
        </p>
        <button
          onClick={() => window.open(`https://wa.me/${SUPPORT_WA}?text=${buildWhatsAppMsg()}`, '_blank')}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold"
          style={{ backgroundColor: '#25d366', color: '#fff', border: 'none' }}
        >
          <MessageCircle className="h-4 w-4" /> Open WhatsApp Again
        </button>
        <Link to="/orders" className="block text-sm font-semibold hover:underline" style={{ color: '#e91e8c' }}>
          Back to My Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-3 py-5 md:px-4 md:py-8 space-y-4 pb-10">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to={`/orders/${id}`} className="p-1.5 rounded-lg transition-colors hover:bg-white/5">
          <ChevronLeft className="h-5 w-5" style={{ color: '#888' }} />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold" style={{ color: '#f5f5f5' }}>Request a Return</p>
          <p className="text-xs" style={{ color: '#555' }}>Order #{order.order_number}</p>
        </div>
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0"
          style={{ backgroundColor: '#2d1010', color: '#f87171', border: '1px solid #5a1e1e' }}>
          ⏱ {hrsLeft}h {minsLeft}m left
        </span>
      </div>

      {/* ── 1. RULES ── */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #ef4444' }}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ backgroundColor: '#450a0a' }}>
          <span style={{ fontSize: 16 }}>↩️</span>
          <p className="text-sm font-bold" style={{ color: '#fca5a5' }}>Return Rules</p>
          <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: '#7f1d1d', color: '#fca5a5' }}>Read before proceeding</span>
        </div>
        <div style={{ backgroundColor: '#1c0a0a' }}>
          {RULES.map(({ icon, title, desc }, i) => (
            <div key={title} className="flex items-start gap-3 px-4 py-3"
              style={{ borderTop: i === 0 ? 'none' : '1px solid #2d1010' }}>
              <span className="text-lg shrink-0 mt-0.5">{icon}</span>
              <div>
                <p className="text-sm font-bold" style={{ color: '#fca5a5' }}>{title}</p>
                <p className="text-xs mt-0.5 leading-snug" style={{ color: '#9a6060' }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="px-4 py-2.5 text-center" style={{ backgroundColor: '#2d0f0f', borderTop: '1px solid #3a1010' }}>
          <p className="text-xs" style={{ color: '#fca5a5' }}>
            Returns accepted for <span style={{ color: '#fff', fontWeight: 700 }}>defects &amp; wrong items only.</span>{' '}
            We verify every request.
          </p>
        </div>
      </div>

      {/* ── 2. MESSAGE ── */}
      <div className="rounded-xl px-4 py-3.5 flex items-start gap-3"
        style={{ backgroundColor: '#0f1a2e', border: '1px solid #1e3a5a' }}>
        <span className="text-xl shrink-0 mt-0.5">💬</span>
        <div>
          <p className="text-sm font-bold" style={{ color: '#93c5fd' }}>How this works</p>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: '#6080a0' }}>
            Select a reason below and describe the issue. After submitting, a pre-filled WhatsApp message
            will open — send it to our support team and we'll guide you through the return process.
          </p>
        </div>
      </div>

      {/* ── 3. REASON SELECTION ── */}
      <div className="space-y-2">
        <p className="text-sm font-bold" style={{ color: '#ddd' }}>Select a reason</p>
        <div className="space-y-2">
          {REASONS.map((r) => {
            const active = selectedReason?.id === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setSelectedReason(active ? null : r)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                style={active
                  ? { backgroundColor: '#1a0a12', border: '1.5px solid #e91e8c' }
                  : { backgroundColor: '#1a1a1a', border: '1px solid #2e2e2e' }
                }
              >
                <span style={{ fontSize: 18 }}>{r.emoji}</span>
                <span className="text-sm font-medium flex-1" style={{ color: active ? '#e91e8c' : '#ddd' }}>
                  {r.label}
                </span>
                <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    border: `2px solid ${active ? '#e91e8c' : '#444'}`,
                    backgroundColor: active ? '#e91e8c' : 'transparent',
                  }}>
                  {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 4. TYPE YOUR MESSAGE ── */}
      <div className="space-y-2">
        <p className="text-sm font-bold" style={{ color: '#ddd' }}>
          {selectedReason ? 'Add more details' : 'Describe the issue'}
          {!selectedReason && (
            <span className="ml-1.5 text-xs font-normal" style={{ color: '#555' }}>
              (required if no reason selected)
            </span>
          )}
        </p>
        <textarea
          value={customMsg}
          onChange={(e) => setCustomMsg(e.target.value)}
          rows={4}
          placeholder={
            selectedReason
              ? 'Describe the defect or issue in detail, mention any damage, wrong colour, or missing parts...'
              : 'Tell us what went wrong — e.g. wrong size delivered, item is torn, colour is different from what was shown...'
          }
          className="w-full rounded-xl px-3 py-3 text-sm focus:outline-none resize-none"
          style={{ backgroundColor: '#1a1a1a', border: '1px solid #2e2e2e', color: '#f5f5f5', lineHeight: 1.65 }}
          onFocus={(e) => { e.target.style.borderColor = '#e91e8c'; }}
          onBlur={(e) => { e.target.style.borderColor = '#2e2e2e'; }}
        />
        <p className="text-[11px]" style={{ color: '#444' }}>
          Clear descriptions help us process your return faster.
        </p>
      </div>

      {/* Submit */}
      <div className="space-y-2">
        <button
          onClick={handleSubmit}
          disabled={!finalReason || submitting}
          className="w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2"
          style={{
            backgroundColor: finalReason ? '#25d366' : '#1a2e1a',
            color: finalReason ? '#fff' : '#444',
            border: 'none',
            opacity: submitting ? 0.7 : 1,
            cursor: finalReason && !submitting ? 'pointer' : 'not-allowed',
          }}
        >
          <MessageCircle className="h-4 w-4" />
          {submitting ? 'Submitting…' : 'Submit Return Request'}
        </button>
        <p className="text-[11px] text-center" style={{ color: '#555' }}>
          After submitting, WhatsApp opens with a pre-filled message — just send it to complete your return.
        </p>
      </div>

    </div>
  );
}
