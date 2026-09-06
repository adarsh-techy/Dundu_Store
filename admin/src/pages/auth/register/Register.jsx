import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../../../api';
import toast from 'react-hot-toast';
import { User, Mail, Phone, Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';
import loginImage from '../../../assets/loginimage.png';
import dunduLogo from '../../../assets/dundulogo.png';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
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
      toast.success('Super admin account created! Please sign in.');
      navigate('/login');
    } catch (err) {
      toast.error(err?.message || err?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F8FAFC]">
      {/* Left 60%: Full Hero Visual */}
      <div className="w-full lg:w-[60%] relative min-h-[260px] sm:min-h-[360px] lg:min-h-screen bg-slate-900 overflow-hidden flex items-center justify-center">
        <img
          src={loginImage}
          alt="Dundu Commerce"
          className="w-full h-full object-cover absolute inset-0"
        />
        {/* Soft white shadow/feather transition on the right edge (desktop) & bottom edge (mobile) */}
        <div className="absolute inset-y-0 right-0 w-28 lg:w-44 bg-gradient-to-r from-transparent via-white/40 to-white pointer-events-none hidden lg:block" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent via-white/50 to-white pointer-events-none lg:hidden" />
      </div>

      {/* Right 40%: Refined Classic White Form */}
      <div className="w-full lg:w-[40%] flex items-center justify-center p-6 sm:p-10 lg:p-12 xl:p-14 bg-white overflow-y-auto">
        <div className="w-full max-w-[380px] flex flex-col justify-center space-y-6">
          
          {/* Brand Header */}
          <div className="space-y-3 text-center">
            <div className="flex flex-col items-center justify-center space-y-2.5 mx-auto">
              <img
                src={dunduLogo}
                alt="Dundu Fashion"
                className="h-14 sm:h-16 w-auto object-contain drop-shadow-sm transition-transform hover:scale-105 duration-300"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <span className="text-xl sm:text-2xl font-black tracking-[0.18em] uppercase bg-gradient-to-r from-pink-600 via-rose-500 to-fuchsia-600 bg-clip-text text-transparent drop-shadow-xs">
                DUNDU FASHION
              </span>
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Create Super Admin
              </h1>
              <p className="text-sm text-slate-500">
                Setup the master administrator account for your store.
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Full Name
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={form.name}
                  onChange={set('name')}
                  required
                  placeholder="Master Admin"
                  className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 rounded-lg pl-10 pr-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-all outline-none"
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  required
                  placeholder="admin@dundu.com"
                  className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 rounded-lg pl-10 pr-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-all outline-none"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Phone Number (Optional)
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                  <Phone className="h-4 w-4" />
                </div>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={set('phone')}
                  placeholder="+91 9876543210"
                  className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 rounded-lg pl-10 pr-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-all outline-none"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  required
                  placeholder="••••••••••••"
                  className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 rounded-lg pl-10 pr-10 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Confirm Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={set('confirmPassword')}
                  required
                  placeholder="••••••••••••"
                  className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 rounded-lg pl-10 pr-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-all outline-none"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-all duration-150 shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Back to sign in */}
            <div className="pt-2 text-center">
              <p className="text-xs text-slate-500">
                Already configured?{' '}
                <Link
                  to="/login"
                  className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </form>

          {/* Trust / Security Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 text-center">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Encrypted Admin Session &bull; &copy; {new Date().getFullYear()} Dundu</span>
          </div>

        </div>
      </div>
    </div>
  );
}
