import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { userApi, loyaltyApi, orderApi, referralApi, announcementApi } from '../api';
import useAuthStore from '../store/auth.store';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Spinner from '../components/ui/Spinner';
import toast from 'react-hot-toast';
import { Star, Gift, LogOut, MapPin, Plus, Trash2, Edit2, Wifi, Package, ChevronRight, Copy, Check, Share2 } from 'lucide-react';
import { formatPrice, formatDate } from '../utils/format';

function AddrField({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="block text-xs mb-1.5" style={{ color: '#888' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
        style={{ backgroundColor: '#111', border: '1px solid #2e2e2e', color: '#f5f5f5' }}
        onFocus={(e) => { e.target.style.borderColor = '#e91e8c'; }}
        onBlur={(e) => { e.target.style.borderColor = '#2e2e2e'; }}
      />
    </div>
  );
}

const EMPTY_ADDR = { name: '', phone: '', address_line1: '', address_line2: '', city: '', state: '', pincode: '', is_default: false };

function AddressForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial ? { ...initial } : { ...EMPTY_ADDR });
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.name || !form.phone || !form.address_line1 || !form.city || !form.state || !form.pincode) {
      toast.error('Please fill all required fields');
      return;
    }
    onSave(form);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <AddrField label="Full Name *" value={form.name} onChange={set('name')} placeholder="Receiver name" />
        <AddrField label="Phone *" value={form.phone} onChange={set('phone')} placeholder="Phone number" type="tel" />
      </div>
      <AddrField label="Address Line 1 *" value={form.address_line1} onChange={set('address_line1')} placeholder="House no., Street, Area" />
      <AddrField label="Address Line 2" value={form.address_line2 || ''} onChange={set('address_line2')} placeholder="Landmark, Flat no. (optional)" />
      <div className="grid grid-cols-3 gap-3">
        <AddrField label="City *" value={form.city} onChange={set('city')} placeholder="City" />
        <AddrField label="State *" value={form.state} onChange={set('state')} placeholder="State" />
        <AddrField label="Pincode *" value={form.pincode} onChange={set('pincode')} placeholder="Pincode" />
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: '#aaa' }}>
        <input type="checkbox" checked={!!form.is_default} onChange={(e) => set('is_default')(e.target.checked)}
          className="accent-pink-500" />
        Set as default address
      </label>
      <div className="flex gap-2 pt-1">
        <Button size="sm" loading={saving} onClick={handleSave}>Save Address</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, setUser, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [dob, setDob] = useState(user?.date_of_birth?.slice(0, 10) || '');
  const [saving, setSaving] = useState(false);
  const [addingAddr, setAddingAddr] = useState(false);
  const [editingAddr, setEditingAddr] = useState(null);
  const [addrSaving, setAddrSaving] = useState(false);

  useEffect(() => {
    if (location.state?.addAddress) {
      setAddingAddr(true);
      setTimeout(() => document.getElementById('address-section')?.scrollIntoView({ behavior: 'smooth' }), 300);
    }
  }, []);

  const { data: ordersData } = useQuery({
    queryKey: ['orders'], queryFn: orderApi.list, enabled: !!user,
  });
  const { data: referralData } = useQuery({
    queryKey: ['referral'], queryFn: referralApi.getInfo, enabled: !!user,
  });
  const orders = ordersData?.data?.orders || [];
  const referralInfo = referralData?.data || null;

  const { data: notifData } = useQuery({
    queryKey: ['notifications'], queryFn: userApi.getNotifications, enabled: !!user,
  });
  const notifications = notifData?.data?.notifications || [];

  const { data: announcData } = useQuery({
    queryKey: ['announcements-profile'], queryFn: announcementApi.list,
  });
  const announcements = announcData?.data?.announcements || [];

  const { data: addrData, refetch: refetchAddrs } = useQuery({
    queryKey: ['addresses'], queryFn: userApi.getAddresses, enabled: !!user,
  });
  const addresses = addrData?.data?.addresses || [];

  const copyCode = () => {
    try {
      navigator.clipboard.writeText(referralInfo?.referral_code || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error('Could not copy'); }
  };

  const shareLink = () => {
    const code = referralInfo?.referral_code || '';
    const link = `${window.location.origin}/signup?ref=${code}`;
    if (navigator.share) {
      navigator.share({ title: 'Join Dundu', text: `Use my referral code ${code} on Dundu and get 30% off your first order!`, url: link }).catch(() => {});
    } else {
      try { navigator.clipboard.writeText(link); toast.success('Link copied!'); } catch { toast.error('Could not copy'); }
    }
  };

  const phone = user?.phone?.replace(/\D/g, '');
  const { data: loyaltyData } = useQuery({
    queryKey: ['loyalty-card', phone],
    queryFn: () => loyaltyApi.check(phone),
    enabled: !!phone,
  });
  const loyaltyCard = loyaltyData?.data?.card || null;
  const redeemableCount = loyaltyCard ? Math.floor(loyaltyCard.points / 200) : 0;
  const pointsAfterRedeem = loyaltyCard ? loyaltyCard.points % 200 : 0;
  const progress = loyaltyCard ? Math.round((pointsAfterRedeem / 200) * 100) : 0;
  const memberYear = loyaltyCard ? new Date(loyaltyCard.created_at).getFullYear() : new Date().getFullYear();

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await userApi.updateProfile({ name, date_of_birth: dob || null });
      setUser(res.data.user);
      setEditing(false);
      toast.success('Profile updated');
    } catch { toast.error('Failed to update'); }
    finally { setSaving(false); }
  };

  const saveAddress = async (form, id = null) => {
    setAddrSaving(true);
    try {
      if (id) {
        await userApi.updateAddress(id, form);
        toast.success('Address updated');
        setEditingAddr(null);
      } else {
        await userApi.addAddress(form);
        toast.success('Address added');
        setAddingAddr(false);
        if (location.state?.next) {
          navigate(location.state.next);
          return;
        }
      }
      refetchAddrs();
    } catch { toast.error('Failed to save address'); }
    finally { setAddrSaving(false); }
  };

  const deleteAddress = async (id) => {
    try {
      await userApi.deleteAddress(id);
      toast.success('Address deleted');
      refetchAddrs();
    } catch { toast.error('Failed to delete'); }
  };

  if (!user) return <Spinner />;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold" style={{ color: '#f5f5f5' }}>My Profile</h1>

      {/* ── Profile card ── */}
      <section className="rounded-2xl p-6" style={{ border: '1px solid #2e2e2e', backgroundColor: '#1a1a1a' }}>
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl shrink-0"
            style={{ backgroundColor: '#1a0a12', color: '#e91e8c' }}>
            {user.name?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-lg truncate" style={{ color: '#f5f5f5' }}>{user.name}</p>
            {user.email && <p className="text-sm" style={{ color: '#777' }}>{user.email}</p>}
            {user.phone && <p className="text-sm" style={{ color: '#888' }}>{user.phone}</p>}
            {user.date_of_birth && (
              <p className="text-sm" style={{ color: '#888' }}>
                🎂 {new Date(user.date_of_birth).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>

        {editing ? (
          <div className="space-y-3">
            <Input label="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
            <div>
              <label className="block text-xs mb-1.5" style={{ color: '#888' }}>Date of Birth</label>
              <input type="date" value={dob} onChange={(e) => setDob(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                style={{ backgroundColor: '#111', border: '1px solid #2e2e2e', color: '#f5f5f5', colorScheme: 'dark' }}
                onFocus={(e) => { e.target.style.borderColor = '#e91e8c'; }}
                onBlur={(e) => { e.target.style.borderColor = '#2e2e2e'; }}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={saveProfile} loading={saving} size="sm">Save</Button>
              <Button onClick={() => setEditing(false)} variant="ghost" size="sm">Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <Button onClick={() => { setEditing(true); setName(user.name); setDob(user.date_of_birth?.slice(0, 10) || ''); }} variant="outline" size="sm">
              Edit Profile
            </Button>
            <button onClick={logout} className="flex items-center gap-1.5 text-sm font-medium" style={{ color: '#e91e8c' }}>
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        )}
      </section>

      {/* ── My Orders ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold" style={{ color: '#ddd' }}>My Orders</h2>
          <Link to="/orders"
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl transition-colors hover:bg-white/5"
            style={{ color: '#e91e8c', border: '1px solid #3d1226' }}>
            View All <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {orders.length === 0 ? (
          <Link to="/orders"
            className="rounded-2xl py-10 text-center flex flex-col items-center transition-colors hover:bg-white/5"
            style={{ border: '1px solid #2e2e2e', backgroundColor: '#1a1a1a' }}>
            <Package className="h-8 w-8 mb-2" style={{ color: '#333' }} />
            <p className="text-sm" style={{ color: '#666' }}>No orders yet</p>
            <p className="text-sm mt-1" style={{ color: '#e91e8c' }}>Go to My Orders</p>
          </Link>
        ) : (
          <div className="space-y-3">
            {orders.slice(0, 5).map((order) => {
              const statusColors = {
                pending:   { bg: '#2d2000', color: '#facc15' },
                packed:    { bg: '#0a1e3d', color: '#60a5fa' },
                shipped:   { bg: '#0a1e3d', color: '#818cf8' },
                delivered: { bg: '#052e16', color: '#4ade80' },
                cancelled: { bg: '#2d1515', color: '#f87171' },
                returned:  { bg: '#1a1a1a', color: '#9ca3af' },
              };
              const st = statusColors[order.status] || statusColors.pending;
              const firstItem = order.items?.[0];

              return (
                <Link key={order.id} to={`/orders/${order.id}`}
                  className="flex items-center gap-3 rounded-2xl p-4 transition-colors hover:bg-white/5"
                  style={{ border: '1px solid #2e2e2e', backgroundColor: '#1a1a1a' }}>
                  {/* Thumbnail */}
                  <div className="w-12 h-14 rounded-xl overflow-hidden shrink-0" style={{ backgroundColor: '#2a2a2a' }}>
                    {firstItem?.image
                      ? <img src={firstItem.image} alt={firstItem.product_name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-lg">👗</div>
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: '#f5f5f5' }}>#{order.order_number}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#666' }}>{formatDate(order.created_at)}</p>
                    <p className="text-xs mt-1 font-medium" style={{ color: '#e91e8c' }}>{formatPrice(order.total)}</p>
                  </div>

                  {/* Status + arrow */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold capitalize"
                      style={{ backgroundColor: st.bg, color: st.color }}>
                      {order.status}
                    </span>
                    <ChevronRight className="h-4 w-4" style={{ color: '#555' }} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Referral ── */}
      {referralInfo && (
        <section>
          <h2 className="font-semibold mb-4" style={{ color: '#ddd' }}>Refer & Earn</h2>
          <div className="rounded-2xl p-5 space-y-4" style={{ border: '1px solid #2e2e2e', backgroundColor: '#1a1a1a' }}>

            {/* Banner */}
            <div className="rounded-xl p-4 text-center"
              style={{ background: 'linear-gradient(135deg, #1a0a12 0%, #2d1226 100%)', border: '1px solid #3d1226' }}>
              <p className="text-base font-bold" style={{ color: '#e91e8c' }}>Share & Save Together</p>
              <p className="text-xs mt-1" style={{ color: '#aaa' }}>
                Your friend gets <span style={{ color: '#4ade80', fontWeight: 700 }}>30% off</span> their first order ·
                You get <span style={{ color: '#4ade80', fontWeight: 700 }}>20% off</span> your next order
              </p>
            </div>

            {/* Code + actions */}
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: '#888' }}>Your Referral Code</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-4 py-3 rounded-xl text-center font-mono font-bold tracking-widest text-lg"
                  style={{ backgroundColor: '#111', border: '1.5px dashed #3d1226', color: '#e91e8c' }}>
                  {referralInfo.referral_code || '—'}
                </div>
                <button onClick={copyCode}
                  className="p-3 rounded-xl transition-colors"
                  style={{ backgroundColor: copied ? '#052e16' : '#1e1e1e', border: `1px solid ${copied ? '#166534' : '#2e2e2e'}` }}>
                  {copied
                    ? <Check className="h-5 w-5" style={{ color: '#4ade80' }} />
                    : <Copy className="h-5 w-5" style={{ color: '#888' }} />}
                </button>
                <button onClick={shareLink}
                  className="p-3 rounded-xl transition-colors"
                  style={{ backgroundColor: '#1a0a12', border: '1px solid #3d1226' }}>
                  <Share2 className="h-5 w-5" style={{ color: '#e91e8c' }} />
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 pt-1">
              {[
                { label: 'Friends Referred', value: referralInfo.referred_count ?? 0 },
                { label: 'Pending Rewards', value: (referralInfo.pending_rewards || []).length },
                { label: 'Rewards Used', value: (referralInfo.used_rewards || []).length },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl p-3 text-center"
                  style={{ backgroundColor: '#111', border: '1px solid #2e2e2e' }}>
                  <p className="text-xl font-bold" style={{ color: '#e91e8c' }}>{value}</p>
                  <p className="text-[10px] mt-0.5 leading-tight" style={{ color: '#666' }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Pending rewards */}
            {(referralInfo.pending_rewards || []).length > 0 && (
              <div className="rounded-xl p-3 flex items-center gap-3"
                style={{ backgroundColor: '#052e16', border: '1px solid #166534' }}>
                <Gift className="h-5 w-5 shrink-0" style={{ color: '#4ade80' }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#86efac' }}>
                    {referralInfo.pending_rewards[0].discount_percent}% off ready to use!
                  </p>
                  <p className="text-xs" style={{ color: '#4ade80' }}>
                    {referralInfo.pending_rewards[0].reward_type === 'referrer'
                      ? 'Your friend made their first purchase — enjoy your reward on the next order.'
                      : 'Applied automatically on your first order at checkout.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── ATM Loyalty Card ── */}
      {phone && (
        <section>
          <h2 className="font-semibold mb-4" style={{ color: '#ddd' }}>My Loyalty Card</h2>

          {loyaltyCard ? (
            <>
              {/* The Card */}
              <div className="relative rounded-3xl overflow-hidden select-none"
                style={{
                  background: 'linear-gradient(135deg, #0a1628 0%, #0d2d5e 25%, #1565c0 55%, #42a5f5 80%, #e0f4ff 100%)',
                  padding: '26px 24px 22px',
                  boxShadow: 'none',
                  minHeight: '205px',
                }}>

                {/* Shine overlay */}
                <div style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none',
                  background: 'linear-gradient(130deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 40%, rgba(0,0,0,0.15) 100%)',
                }} />
                {/* Top-right white-blue glow */}
                <div style={{
                  position: 'absolute', top: '-50px', right: '-50px',
                  width: '200px', height: '200px', borderRadius: '50%', pointerEvents: 'none',
                  background: 'radial-gradient(circle, rgba(224,244,255,0.55) 0%, transparent 70%)',
                }} />
                {/* Bottom-left deep blue glow */}
                <div style={{
                  position: 'absolute', bottom: '-70px', left: '-30px',
                  width: '220px', height: '220px', borderRadius: '50%', pointerEvents: 'none',
                  background: 'radial-gradient(circle, rgba(13,45,94,0.7) 0%, transparent 70%)',
                }} />

                {/* Row 1: Logo + Contactless */}
                <div className="relative flex items-center justify-between mb-5">
                  <span style={{ color: 'white', fontWeight: 900, fontSize: '19px', letterSpacing: '5px', textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
                    DUNDU
                  </span>
                  <Wifi className="h-6 w-6" style={{ color: 'rgba(255,255,255,0.65)', transform: 'rotate(90deg)' }} />
                </div>

                {/* Row 2: Chip + Points */}
                <div className="relative flex items-center justify-between mb-5">
                  {/* Golden EMV chip */}
                  <div style={{
                    width: '52px', height: '40px',
                    background: 'linear-gradient(135deg, #fce37a 0%, #f5c518 30%, #e6a000 60%, #ffd700 100%)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.3)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{
                      width: '36px', height: '26px',
                      border: '1.5px solid rgba(160,100,0,0.55)',
                      borderRadius: '4px',
                      display: 'grid', gridTemplateColumns: '1fr 1fr',
                      gridTemplateRows: '1fr 1fr',
                    }}>
                      <div style={{ borderRight: '1px solid rgba(160,100,0,0.4)', borderBottom: '1px solid rgba(160,100,0,0.4)' }} />
                      <div style={{ borderBottom: '1px solid rgba(160,100,0,0.4)' }} />
                      <div style={{ borderRight: '1px solid rgba(160,100,0,0.4)' }} />
                      <div />
                    </div>
                  </div>

                  {/* Points */}
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '9px', letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: '2px' }}>
                      Points Balance
                    </p>
                    <p style={{ color: '#ffd700', fontWeight: 900, fontSize: '42px', lineHeight: 1 }}>
                      <span style={{ fontSize: '22px', verticalAlign: 'middle', marginRight: '3px', opacity: 0.85 }}>★</span>{loyaltyCard.points}
                    </p>
                  </div>
                </div>

                {/* Row 3: Name + Since */}
                <div className="relative flex items-end justify-between">
                  <div>
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '8px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '3px' }}>
                      Member
                    </p>
                    <p style={{ color: 'white', fontWeight: 700, fontSize: '13px', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                      {(loyaltyCard.name || user.name || 'Dundu Member').slice(0, 22)}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '8px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '3px' }}>
                      Since
                    </p>
                    <p style={{ color: 'white', fontWeight: 700, fontSize: '13px' }}>{memberYear}</p>
                  </div>
                </div>
              </div>

              {/* Redeemable banner */}
              {redeemableCount > 0 && (
                <div className="mt-4 rounded-2xl px-5 py-4 flex items-center gap-3"
                  style={{ background: 'linear-gradient(135deg, #052e16 0%, #064e25 100%)', border: '1px solid #166534' }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: 'linear-gradient(135deg, #16a34a, #4ade80)' }}>
                    <Gift className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold" style={{ color: '#86efac' }}>₹{redeemableCount * 200} Redeemable Now!</p>
                    <p className="text-xs mt-0.5" style={{ color: '#4ade80' }}>Show your card at the billing counter to redeem</p>
                  </div>
                </div>
              )}

              {/* Progress bar */}
              <div className="mt-3 rounded-2xl p-4 space-y-2" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2e2e2e' }}>
                <div className="flex justify-between text-xs">
                  <span style={{ color: '#ccc' }}>{pointsAfterRedeem} pts toward next redemption</span>
                  <span style={{ color: '#666' }}>{200 - pointsAfterRedeem} more needed</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: '#2a2a2a' }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${progress}%`,
                      background: 'linear-gradient(90deg, #0d2d5e, #1565c0, #42a5f5, #e0f4ff)',
                      boxShadow: '0 0 10px rgba(66,165,245,0.7)',
                    }} />
                </div>
                <p className="text-xs text-center" style={{ color: '#555' }}>
                  Earn 20 pts every ₹500 spent · 200 pts = ₹200 off
                </p>
              </div>
            </>
          ) : (
            <div className="rounded-2xl p-8 text-center" style={{ border: '1px solid #2e2e2e', backgroundColor: '#1a1a1a' }}>
              <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: '#111' }}>
                <Star className="h-8 w-8" style={{ color: '#333' }} />
              </div>
              <p style={{ color: '#888' }}>No loyalty card yet</p>
              <p className="text-xs mt-1" style={{ color: '#555' }}>Make a purchase at our store to get started!</p>
            </div>
          )}
        </section>
      )}

      {/* ── Addresses ── */}
      <section id="address-section">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold" style={{ color: '#ddd' }}>My Addresses</h2>
          {!addingAddr && (
            <button
              onClick={() => { setAddingAddr(true); setEditingAddr(null); }}
              className="flex items-center gap-1.5 text-sm font-medium"
              style={{ color: '#e91e8c' }}>
              <Plus className="h-4 w-4" /> Add New
            </button>
          )}
        </div>

        {addingAddr && (
          <div className="mb-4 rounded-2xl p-5" style={{ backgroundColor: '#1a1a1a', border: '1px solid #3d1226' }}>
            <p className="text-sm font-semibold mb-4" style={{ color: '#f5c2d4' }}>New Address</p>
            <AddressForm
              onSave={(form) => saveAddress(form)}
              onCancel={() => setAddingAddr(false)}
              saving={addrSaving}
            />
          </div>
        )}

        {addresses.length === 0 && !addingAddr ? (
          <div className="text-center py-10 rounded-2xl" style={{ border: '1px solid #2e2e2e', backgroundColor: '#1a1a1a' }}>
            <MapPin className="h-8 w-8 mx-auto mb-2" style={{ color: '#333' }} />
            <p className="text-sm" style={{ color: '#666' }}>No addresses saved yet</p>
            <button
              onClick={() => setAddingAddr(true)}
              className="text-sm mt-2 hover:underline" style={{ color: '#e91e8c' }}>
              + Add your first address
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map((addr) => (
              <div key={addr.id} className="rounded-2xl p-4"
                style={{
                  backgroundColor: '#1a1a1a',
                  border: addr.is_default ? '1px solid #3d1226' : '1px solid #2e2e2e',
                }}>
                {editingAddr === addr.id ? (
                  <AddressForm
                    initial={addr}
                    onSave={(form) => saveAddress(form, addr.id)}
                    onCancel={() => setEditingAddr(null)}
                    saving={addrSaving}
                  />
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3 flex-1 min-w-0">
                      <MapPin className="h-4 w-4 mt-0.5 shrink-0"
                        style={{ color: addr.is_default ? '#e91e8c' : '#555' }} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <p className="font-semibold text-sm" style={{ color: '#f5f5f5' }}>{addr.name}</p>
                          {addr.is_default && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ backgroundColor: '#3d1226', color: '#e91e8c' }}>
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-xs" style={{ color: '#777' }}>{addr.phone}</p>
                        <p className="text-sm mt-1" style={{ color: '#888' }}>
                          {addr.address_line1}
                          {addr.address_line2 ? `, ${addr.address_line2}` : ''}
                        </p>
                        <p className="text-sm" style={{ color: '#888' }}>
                          {addr.city}, {addr.state} — {addr.pincode}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => { setEditingAddr(addr.id); setAddingAddr(false); }}
                        className="p-2 rounded-xl hover:bg-white/5 transition-colors"
                        style={{ color: '#666' }}>
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteAddress(addr.id)}
                        className="p-2 rounded-xl hover:bg-white/5 transition-colors"
                        style={{ color: '#e91e8c' }}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Notifications ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold" style={{ color: '#ddd' }}>Notifications</h2>
          {notifications.some((n) => !n.is_read) && (
            <button onClick={() => userApi.markNotificationsRead()}
              className="text-xs hover:underline" style={{ color: '#e91e8c' }}>
              Mark all read
            </button>
          )}
        </div>
        {announcements.length === 0 && notifications.length === 0 ? (
          <p className="text-sm" style={{ color: '#666' }}>No notifications</p>
        ) : (
          <div className="space-y-2">
            {announcements.map((a) => (
              <div key={`ann-${a.id}`} className="p-3 rounded-xl text-sm"
                style={{ border: '1px solid #2a1f00', backgroundColor: '#1a1500', color: '#ddd' }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: '#3d2e00', color: '#f5c518' }}>
                    📢 Announcement
                  </span>
                </div>
                <p className="font-medium">{a.text}</p>
              </div>
            ))}
            {notifications.map((n) => (
              <div key={n.id} className="p-3 rounded-xl text-sm"
                style={n.is_read
                  ? { border: '1px solid #2e2e2e', color: '#777', backgroundColor: '#1a1a1a' }
                  : { border: '1px solid #3d1226', color: '#ddd', backgroundColor: '#1a0a12' }}>
                <p className="font-medium">{n.title}</p>
                <p className="text-xs mt-0.5">{n.message}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
