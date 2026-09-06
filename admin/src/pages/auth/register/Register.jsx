import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../../../api';
import toast from 'react-hot-toast';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await authApi.adminRegister({ name: form.name, email: form.email, phone: form.phone, password: form.password });
      toast.success('Account created! Please login.');
      navigate('/login');
    } catch (err) {
      toast.error(err?.message || err?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-3xl font-bold text-white">Dundu</p>
          <p className="text-gray-400 text-sm mt-1">First-time setup — create the super admin account</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-2xl p-7 space-y-4 shadow-xl">
          {[
            { key: 'name', label: 'Full Name', type: 'text', placeholder: 'Your name', required: true },
            { key: 'email', label: 'Email', type: 'email', placeholder: 'admin@example.com', required: true },
            { key: 'phone', label: 'Phone', type: 'tel', placeholder: '+91 9876543210', required: false },
            { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••', required: true },
          ].map((f) => (
            <div key={f.key}>
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wide block mb-1">{f.label}</label>
              <input type={f.type} value={form[f.key]} onChange={set(f.key)} required={f.required} placeholder={f.placeholder}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors" />
            </div>
          ))}
          <div>
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wide block mb-1">Confirm Password</label>
            <input type="password" value={form.confirmPassword} onChange={set('confirmPassword')} required placeholder="••••••••"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors" />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            {loading && <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>}
            Create Account
          </button>
          <p className="text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">Sign In</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
