import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../../../api';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import useDocumentTitle from '../../../hooks/useDocumentTitle';
import AuthShell from '../AuthShell';

export default function ForgotPassword() {
  useDocumentTitle('Reset password');
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const sendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await authApi.forgotPassword(email); setStep(2); toast.success('If the account exists, a code was sent to its WhatsApp number'); }
    catch (err) { toast.error(err?.message || 'Something went wrong'); }
    finally { setLoading(false); }
  };

  const reset = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.resetPassword({ email, otp, newPassword });
      toast.success('Password reset. Please log in.');
      navigate('/login');
    } catch (err) { toast.error(err?.message || 'Invalid or expired code'); }
    finally { setLoading(false); }
  };

  return (
    <AuthShell title="Reset your password" subtitle={step === 1 ? 'We will send a one-time code to the WhatsApp number linked to your account.' : `Enter the code sent for ${email}.`}
      footer={<Link to="/login" className="font-semibold text-primary-soft hover:underline">Back to login</Link>}>
      {step === 1 ? (
        <form onSubmit={sendOtp} className="space-y-4">
          <Input label="Email address" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Button type="submit" loading={loading} fullWidth size="lg">Send code</Button>
        </form>
      ) : (
        <form onSubmit={reset} className="space-y-4">
          <Input label="One-time code" inputMode="numeric" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6} required className="tracking-[0.4em] text-center text-lg" />
          <Input label="New password" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required hint="At least 6 characters" />
          <Button type="submit" loading={loading} fullWidth size="lg">Reset password</Button>
          <button type="button" onClick={() => setStep(1)} className="w-full text-xs text-muted hover:text-ink">Use a different email</button>
        </form>
      )}
    </AuthShell>
  );
}
