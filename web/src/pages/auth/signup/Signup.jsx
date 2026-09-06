import { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { authApi } from '../../../api';
import useAuthStore from '../../../store/auth.store';
import useCartStore from '../../../store/cart.store';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import toast from 'react-hot-toast';

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = sessionStorage.getItem('auth_redirect') || location.state?.from?.pathname || '/';
  const [searchParams] = useSearchParams();
  const { setToken, setUser } = useAuthStore();
  const { fetchCart } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '',
    referral_code: searchParams.get('ref') || '',
  });

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const setPhone = (digits) => setForm((p) => ({ ...p, phone: digits.replace(/\D/g, '').slice(0, 10) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.phone && form.phone.length !== 10) {
      toast.error('Phone number must be exactly 10 digits'); return;
    }
    setLoading(true);
    try {
      const res = await authApi.signup({
        ...form,
        phone: form.phone ? '+91' + form.phone : '',
      });
      setToken(res.data.token);
      setUser(res.data.user);
      await fetchCart();
      if (form.referral_code) {
        toast.success('🎉 Referral applied! 30% off your first order.');
      }
      sessionStorage.removeItem('auth_redirect');
      navigate(redirectTo, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Signup failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-black tracking-widest" style={{ color: '#e91e8c' }}>DUNDU</Link>
          <p className="mt-2 text-sm" style={{ color: '#666' }}>Create your account</p>
        </div>
        <div className="rounded-2xl p-7" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2e2e2e' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Full Name" value={form.name} onChange={set('name')} required />
            <Input label="Email" type="email" value={form.email} onChange={set('email')} required />
            {/* Phone — +91 prefix */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#aaa' }}>Phone <span style={{ color: '#555' }}>(optional)</span></label>
              <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid #2e2e2e' }}>
                <span className="flex items-center px-3 text-sm font-semibold" style={{ backgroundColor: '#252525', color: '#f5f5f5', borderRight: '1px solid #2e2e2e', whiteSpace: 'nowrap' }}>🇮🇳 +91</span>
                <input type="tel" value={form.phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  className="flex-1 px-3 py-2.5 text-sm focus:outline-none"
                  style={{ backgroundColor: '#1a1a1a', color: '#f5f5f5' }} />
              </div>
            </div>
            <Input label="Password" type="password" value={form.password} onChange={set('password')} required />

            {/* Referral code */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#888' }}>
                Referral Code <span style={{ color: '#555' }}>(optional)</span>
              </label>
              <input
                value={form.referral_code}
                onChange={set('referral_code')}
                placeholder="e.g. VLRA3B9K2"
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none uppercase"
                style={{ backgroundColor: '#111', border: `1px solid ${form.referral_code ? '#e91e8c' : '#2e2e2e'}`, color: '#f5f5f5', letterSpacing: '0.05em' }}
                onFocus={(e) => { e.target.style.borderColor = '#e91e8c'; }}
                onBlur={(e) => { e.target.style.borderColor = form.referral_code ? '#e91e8c' : '#2e2e2e'; }}
              />
              {form.referral_code && (
                <p className="text-xs mt-1" style={{ color: '#4ade80' }}>
                  🎁 30% off your first order will be applied automatically!
                </p>
              )}
            </div>

            <Button type="submit" loading={loading} fullWidth size="lg">Create Account</Button>
            <a href="/api/auth/google"
              className="flex items-center justify-center gap-2 w-full rounded-xl py-2.5 text-sm font-medium transition-colors hover:bg-white/5"
              style={{ border: '1px solid #2e2e2e', color: '#bbb' }}>
              <img src="https://www.google.com/favicon.ico" alt="" className="h-4 w-4" />
              Sign up with Google
            </a>
          </form>
          <p className="text-center text-sm mt-6" style={{ color: '#666' }}>
            Already have an account? <Link to="/login" state={location.state} className="font-medium hover:underline" style={{ color: '#e91e8c' }}>Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
