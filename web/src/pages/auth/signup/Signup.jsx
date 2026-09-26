import { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../../../api';
import useAuthStore from '../../../store/auth.store';
import useCartStore from '../../../store/cart.store';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import useDocumentTitle from '../../../hooks/useDocumentTitle';
import AuthShell, { GoogleButton, Divider, PhoneInput } from '../AuthShell';

export default function Signup() {
  useDocumentTitle('Create account');
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = sessionStorage.getItem('auth_redirect') || location.state?.from?.pathname || '/';
  const [searchParams] = useSearchParams();
  const { setToken, setUser } = useAuthStore();
  const { fetchCart } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', referral_code: searchParams.get('ref') || '' });
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.phone && form.phone.length !== 10) { toast.error('Phone number must be exactly 10 digits'); return; }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const res = await authApi.signup({ ...form, phone: form.phone ? '+91' + form.phone : '' });
      setToken(res.data.token);
      setUser(res.data.user);
      await fetchCart();
      toast.success(form.referral_code ? '🎉 Welcome! Your referral discount is ready.' : 'Welcome to Dundu!');
      sessionStorage.removeItem('auth_redirect');
      navigate(redirectTo, { replace: true });
    } catch (err) {
      toast.error(err?.message || 'Signup failed');
    } finally { setLoading(false); }
  };

  return (
    <AuthShell title="Create your account" subtitle="It takes less than a minute."
      footer={<>Already have an account? <Link to="/login" state={location.state} className="font-semibold text-primary-soft hover:underline">Log in</Link></>}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Full name" autoComplete="name" value={form.name} onChange={set('name')} required />
        <Input label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} required />
        <div>
          <label className="block text-xs font-semibold tracking-wide text-muted mb-1.5">Phone <span className="text-faint font-normal">(for OTP login & order updates)</span></label>
          <PhoneInput value={form.phone} onChange={(v) => setForm((p) => ({ ...p, phone: v }))} />
        </div>
        <Input label="Password" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} required hint="At least 6 characters" />
        <Input label={<>Referral code <span className="text-faint font-normal">(optional)</span></>} value={form.referral_code} onChange={set('referral_code')} placeholder="e.g. DNDA3B9K2" className="uppercase tracking-wider"
          hint={form.referral_code ? '🎁 30% off your first order will be applied automatically' : undefined} />
        <Button type="submit" loading={loading} fullWidth size="lg">Create account</Button>
        <Divider />
        <GoogleButton label="Sign up with Google" />
        <p className="text-[11px] text-faint text-center">By continuing you agree to our <Link to="/help/privacy" className="underline">terms and privacy policy</Link>.</p>
      </form>
    </AuthShell>
  );
}
