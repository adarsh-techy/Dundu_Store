import { Link } from 'react-router-dom';
import logo from '../../assets/logo.png';

/** Two-column auth layout: brand panel on desktop, form card everywhere. */
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="container-x py-8 md:py-16">
      <div className="mx-auto max-w-5xl grid md:grid-cols-[1.05fr_1fr] rounded-3xl overflow-hidden border border-line bg-card shadow-card">
        <div className="relative hidden md:flex flex-col justify-between p-10 bg-gradient-to-br from-[#2a0b1c] via-[#170a11] to-bg">
          <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-primary/30 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <Link to="/" className="relative flex items-center gap-2">
            <img src={logo} alt="" className="h-10 w-10 object-contain" />
            <span className="font-display text-2xl text-ink">Dundu</span>
          </Link>
          <div className="relative">
            <p className="font-display text-4xl leading-tight text-ink">Fashion for <span className="text-gradient italic">every chapter</span>.</p>
            <ul className="mt-6 space-y-2.5 text-sm text-ink-2">
              <li>✦ Loyalty points on every order</li>
              <li>✦ Refer friends, both of you save</li>
              <li>✦ Wallet refunds, instant</li>
              <li>✦ WhatsApp order updates</li>
            </ul>
          </div>
          <p className="relative text-xs text-faint">© {new Date().getFullYear()} Dundu</p>
        </div>
        <div className="p-6 sm:p-10">
          <div className="md:hidden flex items-center gap-2 mb-6">
            <img src={logo} alt="" className="h-8 w-8 object-contain" />
            <span className="font-display text-xl text-ink">Dundu</span>
          </div>
          <h1 className="font-display text-3xl text-ink">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
          <div className="mt-7">{children}</div>
          {footer && <div className="mt-7 text-center text-sm text-muted">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

export function GoogleButton({ label = 'Continue with Google' }) {
  return (
    <a href="/api/auth/google"
      className="flex items-center justify-center gap-2.5 w-full h-11 rounded-xl border border-line bg-surface text-sm font-semibold text-ink-2 hover:text-ink hover:border-line-strong transition-colors">
      <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12S6.7 21.6 12 21.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
      </svg>
      {label}
    </a>
  );
}

export function Divider({ children = 'or' }) {
  return (
    <div className="flex items-center gap-3 text-xs text-faint">
      <span className="flex-1 divider" />{children}<span className="flex-1 divider" />
    </div>
  );
}

export function PhoneInput({ value, onChange, ...props }) {
  return (
    <div className="flex rounded-xl overflow-hidden border border-line bg-surface focus-within:border-primary focus-within:shadow-[0_0_0_3px_var(--pink-glow)] transition-all">
      <span className="flex items-center px-3 text-sm font-semibold text-ink-2 bg-elevated border-r border-line whitespace-nowrap">🇮🇳 +91</span>
      <input type="tel" inputMode="numeric" value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
        placeholder="10-digit mobile number" maxLength={10}
        className="flex-1 px-3 py-2.5 text-sm bg-transparent text-ink outline-none placeholder:text-faint" {...props} />
    </div>
  );
}
