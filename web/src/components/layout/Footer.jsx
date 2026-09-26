import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Truck, RotateCcw, ShieldCheck, MessageCircle } from 'lucide-react';
import { categoryApi } from '../../api';
import logo from '../../assets/logo.png';

const PERKS = [
  { icon: Truck, title: 'Fast delivery', text: 'Across India, tracked to your door' },
  { icon: RotateCcw, title: 'Easy returns', text: '48-hour hassle-free return window' },
  { icon: ShieldCheck, title: 'Secure payments', text: 'UPI, cards, wallet & cash on delivery' },
  { icon: MessageCircle, title: 'WhatsApp support', text: 'Order updates & help on WhatsApp' },
];

export default function Footer() {
  const { data } = useQuery({ queryKey: ['categories-nav'], queryFn: categoryApi.list, staleTime: 5 * 60 * 1000 });
  const categories = data?.data?.categories || [];
  const wa = import.meta.env.VITE_SUPPORT_WHATSAPP;
  const waLink = wa ? `https://wa.me/${String(wa).replace(/\D/g, '')}` : null;

  const col = 'space-y-2.5 text-sm';
  const link = 'text-muted hover:text-ink transition-colors';

  return (
    <footer className="mt-16 md:mt-24 border-t border-line bg-surface/60">
      {/* Perks strip */}
      <div className="container-x py-8 grid grid-cols-2 md:grid-cols-4 gap-5">
        {PERKS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-start gap-3">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary-soft" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">{title}</p>
              <p className="text-xs text-muted mt-0.5 leading-snug">{text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="divider" />

      <div className="container-x py-12 grid grid-cols-2 md:grid-cols-5 gap-8">
        <div className="col-span-2 md:col-span-2">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="" className="h-9 w-9 object-contain" />
            <span className="font-display text-2xl text-ink">Dundu</span>
          </Link>
          <p className="mt-4 text-sm text-muted leading-relaxed max-w-sm">
            Fashion for every chapter — thoughtfully made clothing for women, kids, newborns and expecting mothers.
          </p>
          <div className="mt-5 flex items-center gap-2">
            {waLink && (
              <a href={waLink} target="_blank" rel="noreferrer" className="chip"><MessageCircle className="h-3.5 w-3.5" />WhatsApp</a>
            )}
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="chip" aria-label="Instagram">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
            </a>
            <a href="https://facebook.com" target="_blank" rel="noreferrer" className="chip" aria-label="Facebook">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
            </a>
          </div>
        </div>

        <div>
          <p className="font-semibold text-ink mb-3">Shop</p>
          <ul className={col}>
            {categories.slice(0, 6).map((c) => (
              <li key={c.id}><Link to={`/products?category=${c.slug}`} className={link}>{c.name}</Link></li>
            ))}
            <li><Link to="/products?new_arrival=true" className={link}>New Arrivals</Link></li>
            <li><Link to="/products?offer=true" className={link}>Offers</Link></li>
            <li><Link to="/combos" className={link}>Combos</Link></li>
          </ul>
        </div>

        <div>
          <p className="font-semibold text-ink mb-3">Account</p>
          <ul className={col}>
            <li><Link to="/orders" className={link}>Track Orders</Link></li>
            <li><Link to="/wishlist" className={link}>Wishlist</Link></li>
            <li><Link to="/wallet" className={link}>Wallet</Link></li>
            <li><Link to="/loyalty-card" className={link}>Loyalty Card</Link></li>
            <li><Link to="/profile" className={link}>Refer &amp; Earn</Link></li>
          </ul>
        </div>

        <div>
          <p className="font-semibold text-ink mb-3">Help</p>
          <ul className={col}>
            <li><Link to="/help/shipping-returns" className={link}>Shipping &amp; Returns</Link></li>
            <li><Link to="/help/faq" className={link}>FAQ</Link></li>
            <li><Link to="/help/contact" className={link}>Contact Us</Link></li>
            <li><Link to="/help/about" className={link}>About Dundu</Link></li>
            <li><Link to="/help/privacy" className={link}>Privacy &amp; Terms</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-x py-5 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-faint">
          <p>© {new Date().getFullYear()} Dundu. All rights reserved.</p>
          <p>Made with love in India · Prices in INR, taxes included</p>
        </div>
      </div>
    </footer>
  );
}
