import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/auth.store';
import { settingsApi } from '../../api';

function isBirthdayToday(dob) {
  if (!dob) return false;
  const d = new Date(dob);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function dismissKey() {
  const t = new Date();
  return `dundu_bday_dismissed_${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

export default function BirthdayPopup() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [discount, setDiscount] = useState(15);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!user?.date_of_birth || !isBirthdayToday(user.date_of_birth)) return;

    settingsApi.getPayment().then((res) => {
      const d = res.data?.data || res.data;
      if (!d?.birthday_popup_enabled) return;
      if (d?.birthday_discount) setDiscount(d.birthday_discount);

      if (!localStorage.getItem(dismissKey())) setVisible(true);

      intervalRef.current = setInterval(() => {
        if (!localStorage.getItem(dismissKey())) setVisible(true);
      }, 2 * 60 * 1000);
    }).catch(() => {});

    return () => clearInterval(intervalRef.current);
  }, [user?.id, user?.date_of_birth]);

  function handleShopNow() {
    setVisible(false);
    navigate('/products');
  }

  function handleDismiss() {
    localStorage.setItem(dismissKey(), '1');
    setVisible(false);
  }

  if (!visible) return null;

  const firstName = user?.name?.split(' ')[0] || 'Dear Customer';

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={handleDismiss}>
      <div
        className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: 'linear-gradient(135deg, #e91e8c 0%, #c2185b 100%)' }}
        onClick={(e) => e.stopPropagation()}>

        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none"
          style={{ background: 'rgba(255,255,255,0.12)', transform: 'translate(35%, -35%)' }} />
        <div className="absolute bottom-0 left-0 w-28 h-28 rounded-full pointer-events-none"
          style={{ background: 'rgba(255,255,255,0.1)', transform: 'translate(-30%, 30%)' }} />

        <div className="relative px-8 pt-10 pb-8 text-center">
          <div className="text-7xl mb-4 leading-none">🎂</div>
          <h2 className="text-2xl font-extrabold text-white mb-1">Happy Birthday!</h2>
          <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.82)' }}>
            {firstName}, today is your special day 🎉
          </p>

          <div className="rounded-2xl px-6 py-4 mb-7" style={{ background: 'rgba(255,255,255,0.18)' }}>
            <p className="text-5xl font-black text-white leading-none">{discount}%</p>
            <p className="text-sm font-bold text-white mt-0.5">Birthday Discount</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.72)' }}>
              Applied automatically at checkout — no code needed
            </p>
          </div>

          <button
            onClick={handleShopNow}
            className="w-full py-4 rounded-2xl font-extrabold text-base transition-opacity hover:opacity-90"
            style={{ background: '#fff', color: '#e91e8c' }}>
            🛍️ Shop Now
          </button>

          <button
            onClick={handleDismiss}
            className="w-full mt-3 py-2 text-xs font-medium transition-colors"
            style={{ color: 'rgba(255,255,255,0.65)' }}>
            No, I don't want to purchase today
          </button>
        </div>
      </div>
    </div>
  );
}
