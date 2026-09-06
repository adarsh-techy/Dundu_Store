import { useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { announcementApi } from '../../api';

const LS_KEY = 'dundu_popup_last_shown';

export default function WelcomePopup() {
  const [visible, setVisible] = useState(false);
  const [bannerHeight, setBannerHeight] = useState(0);
  const bannerRef = useRef(null);
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['announcements'],
    queryFn: announcementApi.list,
    staleTime: 2 * 60 * 1000,
  });

  const nowMins = (() => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); })();
  const allAnnouncements = data?.data?.announcements || [];
  const announcements = allAnnouncements.filter((a) => {
    if (!a.show_popup) return false;
    if (!a.scheduled_time) return true;
    const [h, m] = a.scheduled_time.split(':').map(Number);
    return nowMins >= h * 60 + m;
  });
  const intervalMinutes = data?.data?.popup_interval_minutes ?? 10;

  useEffect(() => {
    if (!announcements.length) return;
    const last = parseInt(localStorage.getItem(LS_KEY) || '0');
    const elapsedMinutes = (Date.now() - last) / 60000;
    if (elapsedMinutes < intervalMinutes) return;
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, [announcements.length, intervalMinutes]);

  useEffect(() => {
    if (bannerRef.current) {
      setBannerHeight(bannerRef.current.offsetHeight);
    }
  }, [visible, announcements.length]);

  const close = () => {
    localStorage.setItem(LS_KEY, String(Date.now()));
    setVisible(false);
  };
  const shopNow = () => { close(); navigate('/products'); };

  if (!visible || !announcements.length) return null;

  const hero = announcements[0];

  return (
    <>
      {/* Fixed banner strips at very top */}
      <div ref={bannerRef} style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10001 }}>
        {announcements.map((a) => (
          <div key={a.id} style={{
            backgroundColor: a.bg_color, color: a.text_color,
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex', whiteSpace: 'nowrap',
              animation: 'marquee 18s linear infinite',
            }}>
              {[...Array(6)].map((_, i) => (
                <span key={i} style={{
                  padding: '9px 40px', fontSize: '13px',
                  fontWeight: 700, flexShrink: 0,
                }}>
                  {a.text}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Backdrop + centered card (sits below the banner) */}
      <div
        onClick={close}
        style={{
          position: 'fixed',
          top: bannerHeight,
          left: 0, right: 0, bottom: 0,
          zIndex: 10000,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
          animation: 'fadeIn 0.3s ease',
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: '460px',
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: '0 32px 80px rgba(0,0,0,0.35)',
            animation: 'slideUp 0.35s ease',
            position: 'relative',
            backgroundColor: hero.bg_color,
          }}
        >
          {/* Body */}
          <div style={{ padding: '36px 28px 30px', textAlign: 'center' }}>
            <p style={{
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.22em',
              color: hero.text_color, opacity: 0.65, marginBottom: '10px',
              textTransform: 'uppercase',
            }}>
              Dundu
            </p>

            <h2 style={{
              fontSize: '26px', fontWeight: 900,
              color: hero.text_color, lineHeight: 1.2,
              marginBottom: '10px',
            }}>
              {hero.text}
            </h2>

            {announcements.slice(1).map((a) => (
              <p key={a.id} style={{
                fontSize: '14px', fontWeight: 600,
                color: hero.text_color, opacity: 0.8,
                marginBottom: '4px',
              }}>
                {a.text}
              </p>
            ))}

            <div style={{ display: 'flex', gap: '10px', marginTop: '28px', justifyContent: 'center' }}>
              <button
                onClick={shopNow}
                style={{
                  padding: '12px 32px', borderRadius: '50px',
                  backgroundColor: hero.text_color, color: hero.bg_color,
                  fontSize: '14px', fontWeight: 800, border: 'none',
                  cursor: 'pointer', letterSpacing: '0.04em',
                }}
              >
                Shop Now
              </button>
              <button
                onClick={close}
                style={{
                  padding: '12px 28px', borderRadius: '50px',
                  backgroundColor: 'transparent', color: hero.text_color,
                  fontSize: '14px', fontWeight: 600,
                  border: `2px solid ${hero.text_color}`,
                  cursor: 'pointer', opacity: 0.8,
                }}
              >
                Maybe Later
              </button>
            </div>
          </div>

          {/* Close ✕ */}
          <button
            onClick={close}
            style={{
              position: 'absolute', top: '10px', right: '10px',
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '50%', width: '32px', height: '32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={15} color={hero.text_color} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(24px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
      `}</style>
    </>
  );
}
