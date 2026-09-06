import React, { useEffect, useState } from 'react';
import { firstPurchaseApi } from '../../../api';
import NotificationModal from '../../../components/ui/NotificationModal';
import './FirstPurchasePage.css';

const DEFAULT_SLABS = [
  { min_order: 0, max_order: 500, discount_amount: 50 },
  { min_order: 500, max_order: 1000, discount_amount: 100 },
  { min_order: 1000, max_order: 1500, discount_amount: 150 },
  { min_order: 1500, max_order: 999999, discount_amount: 200 },
];

export default function FirstPurchasePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({
    enabled: true,
    discount_amount: 100,
    min_order: 0,
    coupon_code: 'WELCOME100',
    auto_apply: true,
    title: '🎉 1st Order Welcome Discount!',
    subtitle: 'Get exclusive welcome discount savings automatically on your 1st order!',
    slabs: DEFAULT_SLABS,
    stats: {
      total_claims: 0,
      total_savings: 0,
      total_revenue: 0,
    },
  });

  const [notifModal, setNotifModal] = useState({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  });

  const showNotify = (type, title, message) => {
    setNotifModal({ isOpen: true, type, title, message });
  };

  const closeNotify = () => {
    setNotifModal((prev) => ({ ...prev, isOpen: false }));
  };

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await firstPurchaseApi.get();
      const resData = res.data || res;
      setData({
        ...resData,
        slabs: (resData.slabs && resData.slabs.length > 0) ? resData.slabs : DEFAULT_SLABS,
      });
    } catch (err) {
      showNotify('error', 'Error Loading Settings', err.response?.data?.message || 'Failed to load first purchase offer config.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await firstPurchaseApi.update(data);
      showNotify(
        'success',
        'Settings Saved! 💾',
        `1st Purchase Offer updated successfully! Tier slabs configured for dynamic order amount discounts.`
      );
      fetchConfig();
    } catch (err) {
      showNotify('error', 'Save Failed', err.response?.data?.message || 'Failed to save first purchase offer settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSlab = () => {
    const currentSlabs = data.slabs || [];
    const lastSlab = currentSlabs[currentSlabs.length - 1];
    const newMin = lastSlab ? (lastSlab.max_order < 999999 ? lastSlab.max_order : lastSlab.min_order + 500) : 0;
    const newMax = newMin + 500;
    const newDiscount = lastSlab ? lastSlab.discount_amount + 50 : 50;

    setData((prev) => ({
      ...prev,
      slabs: [...currentSlabs, { min_order: newMin, max_order: newMax, discount_amount: newDiscount }],
    }));
  };

  const handleUpdateSlab = (index, field, value) => {
    const updatedSlabs = [...(data.slabs || [])];
    updatedSlabs[index] = {
      ...updatedSlabs[index],
      [field]: value,
    };
    setData((prev) => ({ ...prev, slabs: updatedSlabs }));
  };

  const handleRemoveSlab = (index) => {
    const updatedSlabs = (data.slabs || []).filter((_, i) => i !== index);
    setData((prev) => ({ ...prev, slabs: updatedSlabs }));
  };

  // Preview total calculation for sample order subtotal 750
  const sampleSubtotal = 750;
  const matchedSlab = (data.slabs || []).find((s) => sampleSubtotal >= s.min_order && sampleSubtotal < s.max_order);
  const sampleDiscount = data.enabled ? (matchedSlab ? matchedSlab.discount_amount : data.discount_amount) : 0;
  const sampleFinalTotal = Math.max(0, sampleSubtotal - sampleDiscount);

  return (
    <div className="fp-container">
      <NotificationModal
        isOpen={notifModal.isOpen}
        type={notifModal.type}
        title={notifModal.title}
        message={notifModal.message}
        onClose={closeNotify}
      />

      {/* Header */}
      <div className="fp-header">
        <div>
          <h1 className="fp-title">🎁 1st Purchase Offer & Tier Slabs Management</h1>
          <p className="fp-subtitle">
            Configure welcome discounts and tiered order amount slabs (₹0-500, ₹500-1000, ₹1000-1500, etc.) for first-time buyers automatically.
          </p>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="fp-stats-grid">
        <div className="fp-stat-card">
          <div className="fp-stat-icon fp-icon-pink">🎁</div>
          <div>
            <div className="fp-stat-label">Active Slabs</div>
            <div className="fp-stat-val">{(data.slabs || []).length} Tiers</div>
          </div>
        </div>

        <div className="fp-stat-card">
          <div className="fp-stat-icon fp-icon-blue">👥</div>
          <div>
            <div className="fp-stat-label">1st Buyers Claimed</div>
            <div className="fp-stat-val">{data.stats?.total_claims || 0} Orders</div>
          </div>
        </div>

        <div className="fp-stat-card">
          <div className="fp-stat-icon fp-icon-green">💰</div>
          <div>
            <div className="fp-stat-label">Customer Savings</div>
            <div className="fp-stat-val">₹{data.stats?.total_savings?.toLocaleString() || 0}</div>
          </div>
        </div>

        <div className="fp-stat-card">
          <div className="fp-stat-icon fp-icon-amber">🛍️</div>
          <div>
            <div className="fp-stat-label">1st Order Revenue</div>
            <div className="fp-stat-val">₹{data.stats?.total_revenue?.toLocaleString() || 0}</div>
          </div>
        </div>
      </div>

      {/* Main Form Layout */}
      <div className="fp-layout">
        {/* Left Form Settings */}
        <div className="fp-card">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              Loading 1st purchase settings...
            </div>
          ) : (
            <form onSubmit={handleSave}>
              <h3 className="fp-card-title">First Purchase Offer & Slab Config</h3>
              <p className="fp-card-sub">
                Configure master enable toggle, heading text, and tier slabs based on cart subtotal ranges.
              </p>

              {/* Master Enable Toggle */}
              <div className="fp-setting-box">
                <label className="fp-toggle-label">
                  <input
                    type="checkbox"
                    checked={data.enabled}
                    onChange={(e) => setData({ ...data, enabled: e.target.checked })}
                  />
                  <span>Enable 1st Purchase Discount Offer</span>
                </label>
                <p className="fp-help-text">
                  When turned ON, first-time buyers automatically receive the slab discount matching their 1st order subtotal.
                </p>
              </div>

              {/* Tier Slabs Management (0-500, 500-1000, 1000-1500, etc.) */}
              <div style={{ marginTop: '20px', marginBottom: '24px', background: '#f8fafc', padding: '20px', borderRadius: '18px', border: '1.5px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                      📊 1st Order Tier Slabs (Order Amount Ranges)
                    </h4>
                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                      Define discount amounts for different order subtotal ranges.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSlab}
                    style={{
                      background: '#10b981',
                      color: '#fff',
                      border: 'none',
                      padding: '8px 14px',
                      borderRadius: '10px',
                      fontWeight: '800',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    + Add Tier Slab
                  </button>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#e2e8f0', color: '#334155', fontSize: '11px', fontWeight: '900', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px', borderRadius: '6px 0 0 6px' }}>Min Subtotal (₹)</th>
                      <th style={{ padding: '8px 10px' }}>Max Subtotal (₹)</th>
                      <th style={{ padding: '8px 10px' }}>Discount (₹ OFF)</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', borderRadius: '0 6px 6px 0' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.slabs || []).map((slab, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '8px 6px' }}>
                          <input
                            type="number"
                            min="0"
                            value={slab.min_order}
                            onChange={(e) => handleUpdateSlab(idx, 'min_order', parseFloat(e.target.value) || 0)}
                            style={{ width: '90%', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '700' }}
                          />
                        </td>
                        <td style={{ padding: '8px 6px' }}>
                          <input
                            type="number"
                            min="0"
                            value={slab.max_order}
                            onChange={(e) => handleUpdateSlab(idx, 'max_order', parseFloat(e.target.value) || 0)}
                            style={{ width: '90%', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '700' }}
                          />
                        </td>
                        <td style={{ padding: '8px 6px' }}>
                          <input
                            type="number"
                            min="0"
                            value={slab.discount_amount}
                            onChange={(e) => handleUpdateSlab(idx, 'discount_amount', parseFloat(e.target.value) || 0)}
                            style={{ width: '90%', padding: '6px 10px', borderRadius: '8px', border: '1.5px solid #10b981', fontWeight: '800', color: '#047857' }}
                          />
                        </td>
                        <td style={{ padding: '8px 6px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveSlab(idx)}
                            style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', padding: '6px 10px', borderRadius: '8px', fontWeight: '800', fontSize: '12px', cursor: 'pointer' }}
                          >
                            🗑 Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Banner Heading */}
              <div className="fp-field-group">
                <label className="fp-label">Offer Banner Heading</label>
                <input
                  type="text"
                  value={data.title}
                  onChange={(e) => setData({ ...data, title: e.target.value })}
                  className="fp-input"
                  placeholder="🎉 1st Order Welcome Discount!"
                  required
                />
              </div>

              {/* Banner Subtitle */}
              <div className="fp-field-group">
                <label className="fp-label">Offer Description Subtitle</label>
                <textarea
                  rows={3}
                  value={data.subtitle}
                  onChange={(e) => setData({ ...data, subtitle: e.target.value })}
                  className="fp-input"
                  placeholder="Get exclusive welcome discount savings automatically on your 1st order!"
                  required
                />
              </div>

              <div style={{ marginTop: '28px', textAlign: 'right' }}>
                <button type="submit" className="fp-save-btn" disabled={saving}>
                  {saving ? 'Saving Changes...' : '💾 Save First Purchase Offer & Slabs'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right Live Phone Preview Simulator */}
        <div>
          <h3 className="fp-card-title" style={{ marginBottom: '14px' }}>📱 Live Mobile Preview</h3>
          <div className="fp-phone-wrap">
            <div className="fp-phone-notch" />
            <div className="fp-phone-screen">
              <div>
                <div className="fp-phone-header">
                  <span className="fp-phone-title">DUNDU STORE</span>
                </div>

                {/* Offer Banner Card */}
                {data.enabled ? (
                  <div className="fp-banner-card">
                    <span className="fp-banner-badge">✨ 1ST ORDER EXCLUSIVE</span>
                    <h4 className="fp-banner-heading">{data.title}</h4>
                    <p className="fp-banner-sub">{data.subtitle}</p>
                    <div style={{ background: '#f0fdf4', padding: '10px 12px', borderRadius: '12px', border: '1px solid #10b981', marginTop: '10px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '900', color: '#047857', display: 'block' }}>
                        🎉 Sample Cart Subtotal: ₹{sampleSubtotal}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#059669' }}>
                        Tier Discount: ₹{sampleDiscount} OFF
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '16px', borderRadius: '14px', textAlign: 'center', fontSize: '12px', fontWeight: '800', marginBottom: '14px' }}>
                    ⚠️ 1st Purchase Offer is currently DISABLED.
                  </div>
                )}

                {/* Checkout Summary Card */}
                <div className="fp-checkout-preview">
                  <div style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', marginBottom: '10px' }}>
                    🛍️ Checkout Summary (1st Order)
                  </div>
                  <div className="fp-summary-row">
                    <span>Order Subtotal</span>
                    <span>₹{sampleSubtotal}</span>
                  </div>
                  {data.enabled && sampleDiscount > 0 && (
                    <div className="fp-summary-row discount">
                      <span>🎁 1st Order Welcome Offer</span>
                      <span>- ₹{sampleDiscount}</span>
                    </div>
                  )}
                  <div className="fp-summary-row">
                    <span>Delivery Charge</span>
                    <span style={{ color: '#16a34a', fontWeight: '800' }}>FREE</span>
                  </div>
                  <div className="fp-summary-row total">
                    <span>Total Amount Payable</span>
                    <span style={{ color: '#059669' }}>₹{sampleFinalTotal}</span>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>
                  {data.enabled ? '🎉 First-time buyer saves ₹' + sampleDiscount + '!' : 'No discount active'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
