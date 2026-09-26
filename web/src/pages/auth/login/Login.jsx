import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../../../api';
import useAuthStore from '../../../store/auth.store';
import useCartStore from '../../../store/cart.store';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import useDocumentTitle from '../../../hooks/useDocumentTitle';
import AuthShell, { GoogleButton, Divider, PhoneInput } from '../AuthShell';

export default function Login() {
  useDocumentTitle('Login');
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = sessionStorage.getItem('auth_redirect') || location.state?.next || location.state?.from?.pathname || '/';
  const { setToken, setUser } = useAuthStore();
  const { fetchCart } = useCartStore();
  const [tab, setTab] = useState('password');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');

  const finish = async (res) => {
    setToken(res.data.token);
    setUser(res.data.user);
    await fetchCart();
    sessionStorage.removeItem('auth_redirect');
    toast.success(`Welcome back${res.data.user?.name ? `, ${res.data.user.name.split(' ')[0]}` : ''}!`);
    navigate(redirectTo, { replace: true });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await finish(await authApi.login({ email, password })); }
    catch (err) { toast.error(err?.message || 'Invalid credentials'); }
    finally { setLoading(false); }
  };

  const sendOtp = async () => {
    if (phone.length !== 10) { toast.error('Enter a valid 10-digit mobile number'); return; }
    setLoading(true);
    try { await authApi.sendOtp('+91' + phone); setOtpSent(true); toast.success('OTP sent on WhatsApp'); }
    catch (err) { toast.error(err.message || 'Failed to send OTP'); }
    finally { setLoading(false); }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await finish(await authApi.verifyOtp('+91' + phone, otp)); }
    catch (err) { toast.error(err?.message || 'Invalid OTP'); }
    finally { setLoading(false); }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Log in to track orders, use your wallet and earn rewards."
      footer={<>New here? <Link to="/signup" state={location.state} className="font-semibold text-primary-soft hover:underline">Create an account</Link></>}>
      <div className="flex rounded-xl p-1 mb-6 bg-surface border border-line" role="tablist">
        {[['password', 'Email & password'], ['otp', 'Phone OTP']].map(([t, label]) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => { setTab(t); setOtpSent(false); }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === t ? 'bg-elevated text-ink shadow' : 'text-muted hover:text-ink'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'password' ? (
        <form onSubmit={handleLogin} className="space-y-4">
          <Input label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <div className="text-right -mt-1">
            <Link to="/forgot-password" className="text-xs text-primary-soft hover:underline">Forgot password?</Link>
          </div>
          <Button type="submit" loading={loading} fullWidth size="lg">Log in</Button>
          <Divider />
          <GoogleButton />
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold tracking-wide text-muted mb-1.5">Phone number</label>
            <PhoneInput value={phone} onChange={setPhone} required disabled={otpSent} />
          </div>
          {!otpSent ? (
            <Button type="button" onClick={sendOtp} loading={loading} fullWidth size="lg">Send OTP on WhatsApp</Button>
          ) : (
            <>
              <Input label="Enter the 6-digit code" inputMode="numeric" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6} required autoFocus className="tracking-[0.4em] text-center text-lg" />
              <Button type="submit" loading={loading} fullWidth size="lg">Verify & log in</Button>
              <div className="flex justify-between text-xs">
                <button type="button" onClick={() => setOtpSent(false)} className="text-muted hover:text-ink">Change number</button>
                <button type="button" onClick={sendOtp} className="text-primary-soft hover:underline">Resend OTP</button>
              </div>
            </>
          )}
        </form>
      )}
    </AuthShell>
  );
}
