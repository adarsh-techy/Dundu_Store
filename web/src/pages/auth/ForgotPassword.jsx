import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const sendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await authApi.forgotPassword(email); setStep(2); toast.success('OTP sent'); }
    catch { toast.error('Something went wrong'); }
    finally { setLoading(false); }
  };

  const reset = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.resetPassword({ email, otp, newPassword });
      toast.success('Password reset! Please login.');
      navigate('/login');
    } catch (err) { toast.error(err.message || 'Invalid OTP'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-black tracking-widest" style={{ color: '#e91e8c' }}>DUNDU</Link>
          <p className="mt-2 text-sm" style={{ color: '#666' }}>Reset your password</p>
        </div>
        <div className="rounded-2xl p-7 space-y-4" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2e2e2e' }}>
          {step === 1 ? (
            <form onSubmit={sendOtp} className="space-y-4">
              <Input label="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Button type="submit" loading={loading} fullWidth>Send OTP</Button>
            </form>
          ) : (
            <form onSubmit={reset} className="space-y-4">
              <Input label="OTP" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} required />
              <Input label="New Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
              <Button type="submit" loading={loading} fullWidth>Reset Password</Button>
            </form>
          )}
          <p className="text-center text-sm" style={{ color: '#666' }}>
            <Link to="/login" className="hover:underline" style={{ color: '#e91e8c' }}>Back to login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
