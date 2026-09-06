import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authApi } from '../../../api';
import useAuthStore from '../../../store/auth.store';
import useCartStore from '../../../store/cart.store';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import toast from 'react-hot-toast';

export default function Login() {
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

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      setToken(res.data.token);
      setUser(res.data.user);
      await fetchCart();
      sessionStorage.removeItem('auth_redirect');
      navigate(redirectTo, { replace: true });
    } catch (err) {
      toast.error(err?.message || 'Invalid credentials');
    } finally { setLoading(false); }
  };

  const sendOtp = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) { toast.error('Enter a valid 10-digit Indian mobile number'); return; }
    setLoading(true);
    try { await authApi.sendOtp('+91' + digits); setOtpSent(true); toast.success('OTP sent on WhatsApp'); }
    catch (err) { toast.error(err.message || 'Failed to send OTP'); }
    finally { setLoading(false); }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.verifyOtp('+91' + phone.replace(/\D/g, ''), otp);
      setToken(res.data.token);
      setUser(res.data.user);
      await fetchCart();
      sessionStorage.removeItem('auth_redirect');
      navigate(redirectTo, { replace: true });
    } catch (err) { toast.error(err?.message || 'Invalid OTP'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-black tracking-widest" style={{ color: '#e91e8c' }}>DUNDU</Link>
          <p className="mt-2 text-sm" style={{ color: '#666' }}>Welcome back</p>
        </div>

        <div className="rounded-2xl p-7" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2e2e2e' }}>
          {/* Tabs */}
          <div className="flex rounded-xl p-1 mb-6" style={{ backgroundColor: '#111' }}>
            {[['password', 'Email & Password'], ['otp', 'OTP Login']].map(([t, label]) => (
              <button key={t} onClick={() => { setTab(t); setOtpSent(false); }}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
                style={tab === t
                  ? { backgroundColor: '#2a2a2a', color: '#f5f5f5' }
                  : { backgroundColor: 'transparent', color: '#666' }}>
                {label}
              </button>
            ))}
          </div>

          {tab === 'password' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <div className="text-right">
                <Link to="/forgot-password" className="text-xs hover:underline" style={{ color: '#e91e8c' }}>Forgot password?</Link>
              </div>
              <Button type="submit" loading={loading} fullWidth size="lg">Login</Button>
              <a href="/api/auth/google"
                className="flex items-center justify-center gap-2 w-full rounded-xl py-2.5 text-sm font-medium transition-colors hover:bg-white/5"
                style={{ border: '1px solid #2e2e2e', color: '#bbb' }}>
                <img src="https://www.google.com/favicon.ico" alt="" className="h-4 w-4" />
                Continue with Google
              </a>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#aaa' }}>Phone Number</label>
                <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid #2e2e2e' }}>
                  <span className="flex items-center px-3 text-sm font-semibold" style={{ backgroundColor: '#252525', color: '#f5f5f5', borderRight: '1px solid #2e2e2e', whiteSpace: 'nowrap' }}>🇮🇳 +91</span>
                  <input type="tel" value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    className="flex-1 px-3 py-2.5 text-sm focus:outline-none"
                    style={{ backgroundColor: '#1a1a1a', color: '#f5f5f5' }}
                    required />
                </div>
              </div>
              {!otpSent ? (
                <Button type="button" onClick={sendOtp} loading={loading} fullWidth size="lg">Send OTP</Button>
              ) : (
                <>
                  <Input label="Enter OTP" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} required />
                  <Button type="submit" loading={loading} fullWidth size="lg">Verify & Login</Button>
                  <button type="button" onClick={sendOtp} className="text-xs hover:underline w-full text-center" style={{ color: '#e91e8c' }}>Resend OTP</button>
                </>
              )}
            </form>
          )}

          <p className="text-center text-sm mt-6" style={{ color: '#666' }}>
            New here? <Link to="/signup" state={location.state} className="font-medium hover:underline" style={{ color: '#e91e8c' }}>Create account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
