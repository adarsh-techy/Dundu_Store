const env = require('../../config/env');

let twilioClient = null;
if (env.twilio.accountSid && env.twilio.accountSid.startsWith('AC') && env.twilio.authToken) {
  try {
    const twilio = require('twilio');
    twilioClient = twilio(env.twilio.accountSid, env.twilio.authToken);
  } catch (err) {
    console.warn('⚠️ Twilio initialization failed, using mock mode:', err.message);
  }
}

const sendWhatsApp = async (to, body) => {
  if (!twilioClient) {
    console.log(`[Twilio Mock] To: ${to} | Message: ${body}`);
    return;
  }
  const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to.startsWith('+') ? to : '+91' + to}`;
  return twilioClient.messages.create({
    from: env.twilio.whatsappFrom.startsWith('whatsapp:') ? env.twilio.whatsappFrom : `whatsapp:${env.twilio.whatsappFrom}`,
    to: formattedTo,
    body,
  });
};

const sendOtp = (phone, otp) =>
  sendWhatsApp(phone, `Your Dundu verification code is: ${otp}. Valid for 5 minutes.`);

const sendWelcome = (phone, name) =>
  sendWhatsApp(phone, `Welcome to Dundu${name ? `, ${name}` : ''}! 🎉 Your account is ready — start shopping now.`);

// deliveryEstimateText, e.g. "3-7 days" or "12-16 Sep" — optional, omitted from the
// message entirely if not supplied (e.g. when the settings lookup fails).
const sendOrderConfirmed = (phone, orderNumber, total, deliveryEstimateText) =>
  sendWhatsApp(
    phone,
    `Your Dundu order #${orderNumber} for ₹${total} is confirmed!` +
    (deliveryEstimateText ? ` Expected delivery: ${deliveryEstimateText}.` : '') +
    ` We'll notify you as it's packed and shipped.`
  );

const sendPaymentSuccess = (phone, orderNumber, total) =>
  sendWhatsApp(phone, `Payment of ₹${total} received for your Dundu order #${orderNumber}. Thank you!`);

const sendPaymentFailed = (phone, orderNumber) =>
  sendWhatsApp(phone, `Your payment for Dundu order #${orderNumber} could not be verified. Please try again or choose Cash on Delivery.`);

const sendOrderPacked = (phone, orderNumber) =>
  sendWhatsApp(phone, `Good news! Your Dundu order #${orderNumber} has been packed and is ready for dispatch.`);

const sendOrderShipped = (phone, orderNumber, trackingUrl) =>
  sendWhatsApp(
    phone,
    `Your Dundu order #${orderNumber} has been shipped! ${trackingUrl ? 'Track here: ' + trackingUrl : ''}`
  );

const sendOrderDelivered = (phone, orderNumber) =>
  sendWhatsApp(phone, `Your Dundu order #${orderNumber} has been delivered. Thank you for shopping with us!`);

const sendOrderCancelled = (phone, orderNumber) =>
  sendWhatsApp(phone, `Your Dundu order #${orderNumber} has been cancelled.`);

const RETURN_METHOD_TEXT = {
  wallet: (amount) => `₹${amount} has been credited to your Dundu wallet.`,
  original: (amount) => `₹${amount} has been refunded to your original payment method — it should reflect in 5-7 business days.`,
  bank_transfer: (amount, reference) => `₹${amount} has been sent via bank transfer${reference ? ` (ref: ${reference})` : ''}.`,
  replacement: (_amount, reference) => `A replacement order${reference ? ` #${reference}` : ''} has been created for the same item(s) and will be shipped shortly — no refund needed.`,
};

const sendReturnApproved = (phone, orderNumber, refundMethod, refundAmount, refundReference) =>
  sendWhatsApp(
    phone,
    `Your return for Dundu order #${orderNumber} has been approved. ` +
    (RETURN_METHOD_TEXT[refundMethod]?.(refundAmount, refundReference) || 'Your refund is being processed.')
  );

const sendReturnRejected = (phone, orderNumber, note) =>
  sendWhatsApp(
    phone,
    `Your return request for Dundu order #${orderNumber} could not be approved.` +
    (note ? ` Reason: ${note}` : '') + ` Contact support if you have questions.`
  );

const sendDeliveryOtp = (phone, orderNumber, otp) =>
  sendWhatsApp(phone, `Your delivery PIN for Dundu order #${orderNumber} is: ${otp}. Share this with the delivery executive upon arrival.`);

const sendBroadcast = async (phones, message) => {
  const results = [];
  for (const phone of phones) {
    try {
      await sendWhatsApp(phone, message);
      results.push({ phone, status: 'sent' });
    } catch (err) {
      results.push({ phone, status: 'failed', error: err.message });
    }
  }
  return results;
};

module.exports = {
  sendWhatsApp,
  sendOtp,
  sendWelcome,
  sendOrderConfirmed,
  sendPaymentSuccess,
  sendPaymentFailed,
  sendOrderPacked,
  sendOrderShipped,
  sendOrderDelivered,
  sendOrderCancelled,
  sendReturnApproved,
  sendReturnRejected,
  sendDeliveryOtp,
  sendBroadcast,
};
