const Razorpay = require('razorpay');
const crypto = require('crypto');

const getRazorpay = () => {
  if (!process.env.RAZORPAY_KEY_ID) throw new Error('Razorpay is not configured');
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

const createOrder = async (amount, currency = 'INR', receipt) => {
  return getRazorpay().orders.create({
    amount: Math.round(amount * 100), // paise
    currency,
    receipt,
  });
};

const verifySignature = (orderId, paymentId, signature) => {
  const body = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');
  return expected === signature;
};

module.exports = { createOrder, verifySignature };
