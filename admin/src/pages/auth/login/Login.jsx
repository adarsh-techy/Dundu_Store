import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../../../api';
import useAuthStore from '../../../store/auth.store';
import toast from 'react-hot-toast';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import loginImage from '../../../assets/loginimage.png';
import dunduLogo from '../../../assets/logo.png';

export default function Login() {
  const navigate = useNavigate();
  const { setToken, fetchMe } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      const { role } = res.data.user;
      if (!['admin', 'super_admin'].includes(role)) {
        toast.error('Access denied. Administrator privileges required.');
        return;
      }
      setToken(res.data.token);
      await fetchMe();
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(err?.message || err?.error || 'Invalid credentials');
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
      <div className="w-full lg:w-[40%] flex items-center justify-center p-6 sm:p-10 lg:p-12 xl:p-14 bg-white">
        <div className="w-full max-w-[380px] flex flex-col justify-center space-y-7">
          
          {/* Brand Header */}
          <div className="text-center pb-2">
            <div className="flex flex-col items-center justify-center mx-auto">
              <img
                src={dunduLogo}
                alt="Dundu Store"
                className="h-14 sm:h-16 w-auto max-w-[220px] object-contain drop-shadow-sm transition-transform hover:scale-105 duration-300"
              />
              <p className="text-xs font-semibold text-slate-500 mt-2">
                Administrator Control Center
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Quick Prefill Super Admin Button */}
            <div className="bg-pink-50/80 border border-pink-200/80 rounded-xl p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse shrink-0" />
                  <p className="text-xs font-bold text-slate-900 truncate">Super Admin Access</p>
                </div>
                <p className="text-[11px] text-slate-500 font-mono truncate mt-0.5">superadmin@gmail.com</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEmail('superadmin@gmail.com');
                  setPassword('123456');
                  toast.success('Super Admin credentials filled');
                }}
                className="shrink-0 bg-pink-600 hover:bg-pink-700 active:bg-pink-800 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-all shadow-sm cursor-pointer flex items-center gap-1"
              >
                <span>Prefill</span>
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="admin@dundu.com"
                  className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 rounded-lg pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all outline-none"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 rounded-lg pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-slate-600 hover:text-slate-800">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                />
                <span>Remember this device</span>
              </label>
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
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Register Option */}
            <div className="pt-2 text-center">
              <p className="text-xs text-slate-500">
                Initial system setup?{' '}
                <Link
                  to="/register"
                  className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors"
                >
                  Register Super Admin
                </Link>
              </p>
            </div>
          </form>

          {/* Trust / Security Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 text-center">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Encrypted Admin Session &bull; &copy; {new Date().getFullYear()} Dundu</span>
          </div>

        </div>
      </div>
    </div>
  );
}
