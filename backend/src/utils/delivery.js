// Shared delivery-estimate formatting — used by the order-confirmation WhatsApp
// message and any endpoint that needs to tell a customer when to expect their order.

const DEFAULT_MIN_DAYS = 3;
const DEFAULT_MAX_DAYS = 7;

const getDeliveryEstimateSettings = async (queryable) => {
  const { rows } = await queryable.query(
    "SELECT key, value FROM settings WHERE key IN ('delivery_estimate_min_days','delivery_estimate_max_days')"
  );
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  let minDays = parseInt(map.delivery_estimate_min_days, 10);
  let maxDays = parseInt(map.delivery_estimate_max_days, 10);
  if (!Number.isFinite(minDays) || minDays < 0) minDays = DEFAULT_MIN_DAYS;
  if (!Number.isFinite(maxDays) || maxDays < minDays) maxDays = Math.max(minDays, DEFAULT_MAX_DAYS);
  return { minDays, maxDays };
};

const formatEstimateText = (minDays, maxDays) =>
  minDays === maxDays ? `${minDays} day${minDays === 1 ? '' : 's'}` : `${minDays}-${maxDays} days`;

// "12-16 Sep" style date range, for a friendlier message than a raw day count.
const formatEstimateDateRange = (minDays, maxDays, from = new Date()) => {
  const fmt = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const start = new Date(from); start.setDate(start.getDate() + minDays);
  const end = new Date(from); end.setDate(end.getDate() + maxDays);
  return minDays === maxDays ? fmt(start) : `${fmt(start)} - ${fmt(end)}`;
};

module.exports = { getDeliveryEstimateSettings, formatEstimateText, formatEstimateDateRange };
