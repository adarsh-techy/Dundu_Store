import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Palette, Megaphone, Eye, PartyPopper,
  Paintbrush, Globe, Ticket, CheckCircle2,
} from 'lucide-react';
import { festivalApi } from '../../../api';
import toast from 'react-hot-toast';
import './FestivalPage.css';

const TABS = [
  { key: 'theme',   icon: Paintbrush,    label: 'Theme & Branding' },
  { key: 'popup',   icon: Megaphone,     label: 'Popup Offer' },
  { key: 'preview', icon: Eye,           label: 'Live Preview' },
];

// Reusable Toggle
function Toggle({ on, onChange, loading }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={loading}
      className={`fest-toggle ${on ? 'on' : 'off'}`}
    >
      <span />
    </button>
  );
}

// Color field with swatch
function ColorField({ label, value, onChange }) {
  return (
    <div className="fest-field">
      <label className="fest-label">{label}</label>
      <div className="fest-color-row">
        <input
          type="color"
          className="fest-color-swatch"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#ffffff'}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          className="fest-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#ffffff"
          maxLength={7}
        />
      </div>
    </div>
  );
}

// ── Theme Tab ─────────────────────────────────────────────────────────────────
function ThemeTab({ cfg, setCfg, onSave, saving }) {
  return (
    <div className="festival-content">
      {/* General identity */}
      <div className="fest-card">
        <div className="fest-card-header">
          <div className="fest-card-icon" style={{ background: '#FEF9C3' }}>🎪</div>
          <div>
            <h3>Festival Identity</h3>
            <p>Name, emoji and banner text</p>
          </div>
        </div>

        <div className="fest-field">
          <label className="fest-label">Festival Name</label>
          <input className="fest-input" value={cfg.festival_name || ''} onChange={e => setCfg(p => ({ ...p, festival_name: e.target.value }))} placeholder="e.g. Diwali Sale 2025" />
        </div>

        <div className="fest-field">
          <label className="fest-label">Festival Emoji</label>
          <input className="fest-input" value={cfg.festival_emoji || ''} onChange={e => setCfg(p => ({ ...p, festival_emoji: e.target.value }))} placeholder="🪔 🎉 🎃 🎄" maxLength={8} />
          <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 5 }}>This emoji is shown next to the festival name everywhere</p>
        </div>

        <div className="fest-field">
          <label className="fest-label">Festival Banner Text</label>
          <input className="fest-input" value={cfg.festival_banner_text || ''} onChange={e => setCfg(p => ({ ...p, festival_banner_text: e.target.value }))} placeholder="e.g. 🪔 Diwali Sale — Up to 50% off!" />
          <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 5 }}>Shown in the top announcement-style banner on the web store</p>
        </div>
      </div>

      {/* Colors */}
      <div className="fest-card">
        <div className="fest-card-header">
          <div className="fest-card-icon" style={{ background: '#EDE9FE' }}>
            <Palette style={{ width: 18, height: 18, color: '#7C3AED' }} />
          </div>
          <div>
            <h3>Theme Colors</h3>
            <p>Page background & navbar colors</p>
          </div>
        </div>

        <ColorField label="Page Background Color" value={cfg.festival_bg_color || '#FFF7ED'} onChange={v => setCfg(p => ({ ...p, festival_bg_color: v }))} />
        <ColorField label="Navbar Background Color" value={cfg.festival_navbar_color || '#7C3AED'} onChange={v => setCfg(p => ({ ...p, festival_navbar_color: v }))} />
        <ColorField label="Navbar Text / Icon Color" value={cfg.festival_navbar_text_color || '#FFFFFF'} onChange={v => setCfg(p => ({ ...p, festival_navbar_text_color: v }))} />

        {/* Color preview bar */}
        <div style={{ marginTop: 18, borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
          <div style={{
            background: cfg.festival_navbar_color || '#7C3AED',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: cfg.festival_navbar_text_color || '#ffffff',
            fontWeight: 800,
            fontSize: 13,
          }}>
            <span>{cfg.festival_emoji || '🎉'}</span>
            <span>{cfg.festival_name || 'Festival Store'}</span>
          </div>
          <div style={{ background: cfg.festival_bg_color || '#FFF7ED', padding: 20, textAlign: 'center', fontSize: 12, color: '#64748b', fontWeight: 600 }}>
            Page Background Preview
          </div>
        </div>
      </div>

      {/* Logo */}
      <div className="fest-card">
        <div className="fest-card-header">
          <div className="fest-card-icon" style={{ background: '#DBEAFE' }}>
            <Globe style={{ width: 18, height: 18, color: '#1D4ED8' }} />
          </div>
          <div>
            <h3>Festival Logo</h3>
            <p>Replaces the store logo during the festival</p>
          </div>
        </div>

        <div className="fest-field">
          <label className="fest-label">Logo Image URL</label>
          <input className="fest-input" value={cfg.festival_logo_url || ''} onChange={e => setCfg(p => ({ ...p, festival_logo_url: e.target.value }))} placeholder="https://..." />
          <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 5 }}>Paste a URL to any image (PNG/WebP recommended, transparent background)</p>
        </div>

        {cfg.festival_logo_url && (
          <div style={{ marginTop: 14, padding: 16, background: cfg.festival_navbar_color || '#7C3AED', borderRadius: 12, display: 'flex', justifyContent: 'center' }}>
            <img
              src={cfg.festival_logo_url}
              alt="Festival Logo Preview"
              style={{ height: 42, objectFit: 'contain', maxWidth: '100%' }}
              onError={e => { e.target.style.display = 'none'; }}
            />
          </div>
        )}
      </div>

      {/* Save */}
      <div style={{ gridColumn: '1 / -1' }}>
        <div className="fest-save-row" style={{ borderTop: 'none', marginTop: 0 }}>
          <button className="fest-save-btn" onClick={onSave} disabled={saving}>
            {saving ? '⏳ Saving...' : '💾 Save Theme Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Popup Tab ─────────────────────────────────────────────────────────────────
function PopupTab({ cfg, setCfg, onSave, saving }) {
  const popupOn = cfg.festival_popup_enabled === 'true' || cfg.festival_popup_enabled === true;

  return (
    <div className="festival-content">
      {/* Popup toggle + settings */}
      <div className="fest-card">
        <div className="fest-card-header">
          <div className="fest-card-icon" style={{ background: '#FCE7F3' }}>
            <Megaphone style={{ width: 18, height: 18, color: '#DB2777' }} />
          </div>
          <div>
            <h3>Popup Controls</h3>
            <p>Show/hide the festival offer popup</p>
          </div>
        </div>

        {/* Enable popup */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 14, border: `1.5px solid ${popupOn ? '#bbf7d0' : '#e2e8f0'}`, background: popupOn ? '#f0fdf4' : '#f8fafc', marginBottom: 18 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', margin: 0 }}>Show Popup on Web Store</p>
            <p style={{ fontSize: 12, color: '#64748b', margin: '3px 0 0' }}>{popupOn ? '🟢 Popup is active — customers will see it' : 'Popup is hidden from the web store'}</p>
          </div>
          <Toggle on={popupOn} onChange={() => setCfg(p => ({ ...p, festival_popup_enabled: !popupOn ? 'true' : 'false' }))} />
        </div>

        <div className="fest-field">
          <label className="fest-label">Popup Heading</label>
          <input className="fest-input" value={cfg.festival_popup_heading || ''} onChange={e => setCfg(p => ({ ...p, festival_popup_heading: e.target.value }))} placeholder="🪔 Diwali Sale is Live!" />
        </div>

        <div className="fest-field">
          <label className="fest-label">Popup Subtext</label>
          <input className="fest-input" value={cfg.festival_popup_subtext || ''} onChange={e => setCfg(p => ({ ...p, festival_popup_subtext: e.target.value }))} placeholder="Get 30% off on all orders today!" />
        </div>

        <div className="fest-field">
          <label className="fest-label">Badge / Offer Text</label>
          <input className="fest-input" value={cfg.festival_popup_badge_text || ''} onChange={e => setCfg(p => ({ ...p, festival_popup_badge_text: e.target.value }))} placeholder="✨ LIMITED TIME OFFER" />
        </div>
      </div>

      {/* Coupon + CTA */}
      <div className="fest-card">
        <div className="fest-card-header">
          <div className="fest-card-icon" style={{ background: '#DCFCE7' }}>
            <Ticket style={{ width: 18, height: 18, color: '#16A34A' }} />
          </div>
          <div>
            <h3>Coupon & Button</h3>
            <p>Coupon code, CTA button text & color</p>
          </div>
        </div>

        <div className="fest-field">
          <label className="fest-label">Coupon Code</label>
          <input className="fest-input" value={cfg.festival_popup_coupon || ''} onChange={e => setCfg(p => ({ ...p, festival_popup_coupon: e.target.value.toUpperCase() }))} placeholder="DIWALI30" style={{ textTransform: 'uppercase', fontFamily: 'ui-monospace, monospace', fontWeight: 800, letterSpacing: '2px' }} />
          <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 5 }}>Leave empty to show no coupon code in the popup</p>
        </div>

        <div className="fest-field">
          <label className="fest-label">Button Text</label>
          <input className="fest-input" value={cfg.festival_popup_btn_text || ''} onChange={e => setCfg(p => ({ ...p, festival_popup_btn_text: e.target.value }))} placeholder="Shop Now 🛍️" />
        </div>

        <ColorField label="Button Color" value={cfg.festival_popup_btn_color || '#E91E8C'} onChange={v => setCfg(p => ({ ...p, festival_popup_btn_color: v }))} />

        <div className="fest-field">
          <label className="fest-label">Popup Expires At</label>
          <input className="fest-input" type="datetime-local" value={cfg.festival_popup_expires_at || ''} onChange={e => setCfg(p => ({ ...p, festival_popup_expires_at: e.target.value }))} />
          <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 5 }}>After this date/time, the popup will stop showing automatically. Leave empty for no expiry.</p>
        </div>
      </div>

      {/* Save */}
      <div style={{ gridColumn: '1 / -1' }}>
        <div className="fest-save-row" style={{ borderTop: 'none', marginTop: 0 }}>
          <button className="fest-save-btn" onClick={onSave} disabled={saving}>
            {saving ? '⏳ Saving...' : '💾 Save Popup Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Preview Tab ───────────────────────────────────────────────────────────────
function PreviewTab({ cfg }) {
  const popupOn = cfg.festival_popup_enabled === 'true' || cfg.festival_popup_enabled === true;
  const festOn  = cfg.festival_enabled === 'true' || cfg.festival_enabled === true;

  return (
    <div className="festival-preview-wrap">
      {/* Browser mockup */}
      <div>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>🌐 Web Store — Navbar & Page Theme</h3>
        <div className="browser-mockup">
          <div className="browser-bar">
            <div className="browser-dots">
              <span /><span /><span />
            </div>
            <div className="browser-url">dundu.store/home</div>
          </div>

          {/* Festival banner strip */}
          {cfg.festival_banner_text && (
            <div style={{
              background: cfg.festival_navbar_color || '#7C3AED',
              color: cfg.festival_navbar_text_color || '#fff',
              textAlign: 'center',
              padding: '7px',
              fontSize: 12.5,
              fontWeight: 700,
              opacity: 0.9,
            }}>
              {cfg.festival_banner_text}
            </div>
          )}

          <div className="preview-navbar" style={{ background: cfg.festival_navbar_color || '#7C3AED', color: cfg.festival_navbar_text_color || '#fff' }}>
            <div className="preview-navbar-logo">
              {cfg.festival_logo_url
                ? <img src={cfg.festival_logo_url} alt="logo" style={{ height: 32, objectFit: 'contain' }} />
                : <span>{cfg.festival_emoji || '🎉'} {cfg.festival_name || 'Festival Store'}</span>
              }
            </div>
            <div className="preview-navbar-links" style={{ color: cfg.festival_navbar_text_color || '#fff' }}>
              <span>Home</span>
              <span>Products</span>
              <span>Cart 🛒</span>
            </div>
          </div>

          <div className="preview-page-body" style={{ background: festOn ? (cfg.festival_bg_color || '#FFF7ED') : '#f8fafc' }}>
            <div className="preview-page-placeholder">
              {festOn ? '🎪 Festival theme is active on the web store!' : '⬜ Festival mode is OFF — normal theme shown'}
            </div>
          </div>
        </div>
      </div>

      {/* Popup preview */}
      {popupOn && (
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>🎁 Festival Offer Popup Preview</h3>
          <div className="festival-popup-preview">
            <div className="festival-popup-card">
              <div className="festival-popup-ribbon" />

              <div className="festival-popup-emoji">{cfg.festival_emoji || '🎉'}</div>

              {cfg.festival_popup_badge_text && (
                <div className="festival-popup-badge">{cfg.festival_popup_badge_text}</div>
              )}

              <h2 className="festival-popup-heading">
                {cfg.festival_popup_heading || '🎉 Festival Sale is Live!'}
              </h2>

              <p className="festival-popup-subtext">
                {cfg.festival_popup_subtext || 'Get exclusive discounts on all orders today!'}
              </p>

              {cfg.festival_popup_coupon && (
                <div className="festival-popup-coupon">{cfg.festival_popup_coupon}</div>
              )}

              <button
                className="festival-popup-btn"
                style={{ background: cfg.festival_popup_btn_color || '#E91E8C' }}
              >
                {cfg.festival_popup_btn_text || 'Shop Now 🛍️'}
              </button>

              {cfg.festival_popup_expires_at && (
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 12 }}>
                  ⏰ Expires: {new Date(cfg.festival_popup_expires_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {!popupOn && (
        <div style={{ padding: 24, borderRadius: 16, background: '#f8fafc', border: '1.5px dashed #e2e8f0', textAlign: 'center', color: '#94a3b8', fontSize: 13.5, fontWeight: 600 }}>
          Popup is currently disabled — enable it in the <strong>Popup Offer</strong> tab to see the preview here.
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function FestivalPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['festival-config'], queryFn: festivalApi.get });
  const raw = data?.data?.festival || {};

  const [activeTab, setActiveTab] = useState('theme');
  const [cfg, setCfg] = useState({});
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    if (!isLoading && !hydrated && data) {
      setCfg(raw);
      setHydrated(true);
    }
  }, [isLoading, data]);

  const festEnabled = cfg.festival_enabled === 'true' || cfg.festival_enabled === true;

  const handleToggleFestival = async () => {
    const next = !festEnabled;
    setCfg(p => ({ ...p, festival_enabled: next ? 'true' : 'false' }));
    try {
      await festivalApi.update({ festival_enabled: next ? 'true' : 'false' });
      qc.invalidateQueries({ queryKey: ['festival-config'] });
      toast.success(`Festival mode ${next ? 'enabled 🎉' : 'disabled'}`);
    } catch { toast.error('Failed to update'); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await festivalApi.update(cfg);
      qc.invalidateQueries({ queryKey: ['festival-config'] });
      toast.success('Festival settings saved! 🎊');
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 4000);
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  if (isLoading) return (
    <div className="fest-loading">
      <div className="fest-spinner" />
    </div>
  );

  return (
    <div className="festival-page">
      {/* Header */}
      <div className="festival-header">
        <div className="festival-header-left">
          <h1>
            <PartyPopper style={{ width: 26, height: 26, color: '#db2777' }} />
            Festival Offers
          </h1>
          <p>Configure your store's festive theme, popup offer, and branding for special occasions</p>
        </div>

        {/* Master enable/disable */}
        <div className={`festival-enable-pill ${festEnabled ? 'active' : ''}`}>
          <span>{festEnabled ? '🟢' : '⚫'} Festival Mode</span>
          <Toggle on={festEnabled} onChange={handleToggleFestival} />
        </div>
      </div>

      {/* Status banner */}
      <div className={`fest-status-banner ${festEnabled ? 'on' : 'off'}`}>
        <div className="fest-status-dot" />
        {festEnabled
          ? `✨ Festival Mode is LIVE on your web store — customers are seeing the ${cfg.festival_name || 'festival'} theme!`
          : 'Festival Mode is OFF — the web store is showing its normal theme. Enable it above to go live.'}
      </div>

      {/* Saved confirmation */}
      {savedMsg && (
        <div className="fest-saved-bar">
          <CheckCircle2 style={{ width: 18, height: 18 }} />
          Settings saved successfully!
        </div>
      )}

      {/* Tabs */}
      <div className="festival-tabs">
        {TABS.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            className={`festival-tab-btn ${activeTab === key ? 'active' : ''}`}
            onClick={() => setActiveTab(key)}
          >
            <Icon style={{ width: 15, height: 15 }} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'theme'   && <ThemeTab   cfg={cfg} setCfg={setCfg} onSave={handleSave} saving={saving} />}
      {activeTab === 'popup'   && <PopupTab   cfg={cfg} setCfg={setCfg} onSave={handleSave} saving={saving} />}
      {activeTab === 'preview' && <PreviewTab cfg={cfg} />}
    </div>
  );
}
