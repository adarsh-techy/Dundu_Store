import { useState } from 'react';
import { NavLink, useParams, Navigate } from 'react-router-dom';
import { ChevronDown, MessageCircle, Mail, MapPin } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '../../api';
import PageHeader from '../../components/ui/PageHeader';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { formatPrice } from '../../utils/format';

const TOPICS = {
  'shipping-returns': 'Shipping & Returns',
  faq: 'FAQ',
  contact: 'Contact Us',
  about: 'About Dundu',
  privacy: 'Privacy & Terms',
};

export default function HelpPage() {
  const { topic } = useParams();
  const title = TOPICS[topic];
  useDocumentTitle(title || 'Help');
  const { data } = useQuery({ queryKey: ['payment-settings'], queryFn: settingsApi.getPayment, staleTime: 5 * 60 * 1000 });
  const s = data?.data || {};
  if (!title) return <Navigate to="/help/faq" replace />;

  return (
    <div className="container-x py-8 md:py-12">
      <PageHeader title={title} crumbs={[{ label: 'Help' }, { label: title }]} />
      <div className="grid md:grid-cols-[220px_1fr] gap-8">
        <nav className="flex md:flex-col gap-1 overflow-x-auto scrollbar-none -mx-4 px-4 md:mx-0 md:px-0" aria-label="Help topics">
          {Object.entries(TOPICS).map(([slug, label]) => (
            <NavLink key={slug} to={`/help/${slug}`}
              className={({ isActive }) => `px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${isActive ? 'bg-primary/10 text-primary-soft' : 'text-muted hover:text-ink hover:bg-white/5'}`}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="card p-6 md:p-8 max-w-3xl animate-fade-up">
          {topic === 'shipping-returns' && <Shipping s={s} />}
          {topic === 'faq' && <Faq s={s} />}
          {topic === 'contact' && <Contact />}
          {topic === 'about' && <About />}
          {topic === 'privacy' && <Privacy />}
        </div>
      </div>
    </div>
  );
}

const H = ({ children }) => <h2 className="font-display text-xl text-ink mt-8 first:mt-0 mb-2">{children}</h2>;
const P = ({ children }) => <p className="text-sm leading-relaxed text-ink-2 mb-3">{children}</p>;

function Shipping({ s }) {
  return (
    <>
      <H>Delivery</H>
      <P>We deliver across India. Orders are usually packed within 24 hours and arrive in {s.delivery_estimate_text || '3-7 days'} depending on your location. You will get WhatsApp updates as your order is packed, shipped and delivered.</P>
      <P>Delivery costs {formatPrice(s.delivery_charge ?? 50)} per order and is free on orders above {formatPrice(s.free_delivery_threshold ?? 500)}.</P>
      <H>Cash on delivery</H>
      <P>{s.cod_enabled === false ? 'Cash on delivery is currently unavailable.' : 'Cash on delivery is available on most orders. Please keep exact change ready for the delivery executive.'}</P>
      <H>Returns</H>
      <P>Not happy with something? Request a return from the order page within 48 hours of delivery. Items must be unworn, unwashed and have their tags attached.</P>
      <P>Once approved, refunds go to your Dundu wallet instantly or back to your original payment method within 5-7 business days.</P>
      <H>Cancellations</H>
      <P>Orders can be cancelled from the order page while they are still pending or being packed. Once shipped, please use the return option instead.</P>
    </>
  );
}

function Faq({ s }) {
  const items = [
    ['How do loyalty points work?', 'You earn 20 points for every ₹500 you spend. When you reach 200 points you can redeem ₹200 off your next order at checkout.'],
    ['How does Refer & Earn work?', 'Share your referral code from your profile. Your friend gets 30% off their first order, and you receive a reward coupon once they place it.'],
    ['What is the Dundu wallet?', 'Refunds and store credits are added to your wallet. You can pay for part or all of your next order with it at checkout.'],
    ['Do you offer free delivery?', `Yes — orders above ${formatPrice(s.free_delivery_threshold ?? 500)} ship free. Otherwise delivery is ${formatPrice(s.delivery_charge ?? 50)}.`],
    ['Which payment methods do you accept?', 'UPI, debit/credit cards and net banking via Razorpay, wallet balance, and cash on delivery.'],
    ['Can I change my delivery address after ordering?', 'Contact us on WhatsApp as soon as possible; we can update it while the order is still being packed.'],
    ['How do I track my order?', 'Open My Orders from your account. Each order shows its current status and courier tracking once shipped.'],
  ];
  return (
    <div className="divide-y divide-line">
      {items.map(([q, a]) => <FaqItem key={q} q={q} a={a} />)}
    </div>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="py-3.5">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between gap-4 text-left" aria-expanded={open}>
        <span className="text-sm font-semibold text-ink">{q}</span>
        <ChevronDown className={`h-4 w-4 text-muted shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="mt-2 text-sm leading-relaxed text-ink-2 animate-fade-in">{a}</p>}
    </div>
  );
}

function Contact() {
  const wa = import.meta.env.VITE_SUPPORT_WHATSAPP;
  const waLink = wa ? `https://wa.me/${String(wa).replace(/\D/g, '')}` : null;
  return (
    <>
      <P>We're happy to help with orders, sizing, returns or anything else. Reach us on the channels below, Monday to Saturday, 10am to 7pm IST.</P>
      <div className="grid sm:grid-cols-2 gap-3 mt-5">
        <a href={waLink || '#'} target="_blank" rel="noreferrer" className="card card-hover p-4 flex items-start gap-3">
          <MessageCircle className="h-5 w-5 text-success shrink-0" />
          <div><p className="text-sm font-semibold text-ink">WhatsApp</p><p className="text-xs text-muted mt-0.5">{wa ? `+${String(wa).replace(/\D/g, '')}` : 'Fastest way to reach us'}</p></div>
        </a>
        <a href="mailto:support@dundu.in" className="card card-hover p-4 flex items-start gap-3">
          <Mail className="h-5 w-5 text-info shrink-0" />
          <div><p className="text-sm font-semibold text-ink">Email</p><p className="text-xs text-muted mt-0.5">support@dundu.in</p></div>
        </a>
        <div className="card p-4 flex items-start gap-3 sm:col-span-2">
          <MapPin className="h-5 w-5 text-primary-soft shrink-0" />
          <div><p className="text-sm font-semibold text-ink">Store</p><p className="text-xs text-muted mt-0.5">Visit our store to shop in person, collect loyalty points and enjoy in-store offers.</p></div>
        </div>
      </div>
    </>
  );
}

function About() {
  return (
    <>
      <P>Dundu started with a simple idea: clothing for the whole family should feel as good as it looks. We design for women, kids, newborns and expecting mothers with soft, breathable fabrics and thoughtful details.</P>
      <H>What we believe</H>
      <P>Comfort first. Honest prices. Small batches over fast fashion. And a shopping experience that rewards you for coming back — loyalty points, referral rewards and surprise gifts included.</P>
      <H>Shop with us</H>
      <P>Browse online, visit us in store, or both. Your loyalty card works everywhere.</P>
    </>
  );
}

function Privacy() {
  return (
    <>
      <H>Privacy</H>
      <P>We collect only what we need to fulfil your orders: your name, contact details, addresses and order history. Payment details are handled by our payment partner and never stored on our servers. We send order updates on WhatsApp and never sell your data.</P>
      <H>Terms</H>
      <P>Prices are in Indian Rupees and include applicable taxes. Offers, coupons and rewards may be changed or withdrawn at any time. Returns are accepted within 48 hours of delivery for unused items in original condition.</P>
      <P>Questions about your data? Write to privacy@dundu.in.</P>
    </>
  );
}
