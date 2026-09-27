const Razorpay = require('razorpay');
const crypto = require('crypto');
const env = require('../../config/env');

let razorpay = null;
if (env.razorpay.keyId && env.razorpay.keySecret) {
  razorpay = new Razorpay({
    key_id: env.razorpay.keyId,
    key_secret: env.razorpay.keySecret,
  });
}

const createOrder = async (amount, currency = 'INR', receipt) => {
  if (!razorpay) throw new Error('Razorpay credentials not configured');
  return razorpay.orders.create({
    amount: Math.round(amount * 100), // convert to paise
    currency,
    receipt,
  });
};

const verifySignature = (orderId, paymentId, signature) => {
  if (!env.razorpay.keySecret) return false;
  const body = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac('sha256', env.razorpay.keySecret)
    .update(body)
    .digest('hex');
  if (typeof signature !== 'string' || signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
};

// Refund (fully or partially) a captured Razorpay payment — used for "original payment
// method" return refunds. Throws if Razorpay isn't configured or the refund is rejected.
const refundPayment = async (paymentId, amount) => {
  if (!razorpay) throw new Error('Razorpay credentials not configured');
  return razorpay.payments.refund(paymentId, {
    amount: Math.round(amount * 100), // paise
  });
};

const fetchOrder = async (orderId) => {
  if (!razorpay) throw new Error('Razorpay credentials not configured');
  return razorpay.orders.fetch(orderId);
};

module.exports = { createOrder, verifySignature, refundPayment, fetchOrder };
