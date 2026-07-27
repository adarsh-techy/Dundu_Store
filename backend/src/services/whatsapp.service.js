const twilio = require('twilio');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const from = process.env.TWILIO_WHATSAPP_FROM;

const send = async (to, message) => {
  return client.messages.create({
    from,
    to: `whatsapp:${to}`,
    body: message,
  });
};

const sendOtp = (phone, otp) =>
  send(phone, `Your Dundu OTP is *${otp}*. Valid for 10 minutes. Do not share it with anyone.`);

const sendOrderConfirmed = (phone, orderNumber, total) =>
  send(phone, `✅ Order #${orderNumber} confirmed! Total: ₹${total}. Thank you for shopping at Dundu.`);

const sendOrderPacked = (phone, orderNumber) =>
  send(phone, `📦 Your order #${orderNumber} is packed and ready to ship.`);

const sendOrderShipped = (phone, orderNumber) =>
  send(phone, `🚚 Your order #${orderNumber} is on the way!`);

const sendDeliveryOtp = (phone, otp, orderNumber) =>
  send(phone, `🚚 Your Dundu order #${orderNumber} is out for delivery! Share OTP *${otp}* with the delivery agent only when your order arrives.`);

const sendOrderDelivered = (phone, orderNumber) =>
  send(phone, `🎉 Your order #${orderNumber} has been delivered. Enjoy your purchase from Dundu!`);

const sendOrderCancelled = (phone, orderNumber) =>
  send(phone, `❌ Your order #${orderNumber} has been cancelled. Refund will be processed within 5-7 days.`);

const sendPaymentSuccess = (phone, orderNumber, amount) =>
  send(phone, `💰 Payment of ₹${amount} received for order #${orderNumber}.`);

const sendPaymentFailed = (phone, orderNumber) =>
  send(phone, `⚠️ Payment failed for order #${orderNumber}. Please retry or contact support.`);

const sendAbandonedCart = (phone) =>
  send(phone, `🛒 You left items in your cart at Dundu! Complete your purchase before they sell out.`);

const sendCustom = (phone, message) => send(phone, message);

const sendWelcome = (phone, name) =>
  send(phone,
    `🎉 Welcome to Dundu, *${name}*!\n\n` +
    `We're so glad you joined us! ✨\n\n` +
    `🛍️ Shop the latest in Women, Kids, Newborn & Maternity fashion.\n` +
    `🎁 Use code *WELCOME10* for 10% off your first order!\n` +
    `💌 Invite friends & earn rewards with our Refer & Earn program.\n\n` +
    `👉 Start shopping: dundu.com\n\n` +
    `---\n\n` +
    `🎉 ഡുണ്ടുവിലേക്ക് സ്വാഗതം, *${name}*!\n\n` +
    `നിങ്ങൾ ഞങ്ങളോടൊപ്പം ചേർന്നതിൽ ഞങ്ങൾക്ക് വളരെ സന്തോഷം! ✨\n\n` +
    `🛍️ സ്ത്രീകൾ, കുട്ടികൾ, നവജാതൻ & മാതൃത്വ ഫാഷൻ ശേഖരം ഷോപ്പ് ചെയ്യൂ.\n` +
    `🎁 ആദ്യ ഓർഡറിൽ 10% ഓഫിന് *WELCOME10* കോഡ് ഉപയോഗിക്കൂ!\n` +
    `💌 സുഹൃത്തുക്കളെ ക്ഷണിച്ച് Refer & Earn വഴി പ്രതിഫലം നേടൂ.\n\n` +
    `👉 ഇപ്പോൾ ഷോപ്പ് ചെയ്യൂ: dundu.com\n\n` +
    `_Dundu — Fashion for Every Moment | ഓരോ നിമിഷത്തിനും ഫാഷൻ_`
  );

const sendBirthday = (phone, name, discountPct) =>
  send(phone,
    `🎂 Happy Birthday, *${name}*! 🎉\n\n` +
    `Dundu wishes you a wonderful day! As a birthday gift, enjoy *${discountPct}% OFF* your next order.\n\n` +
    `🎁 Your birthday discount has been added to your account. Valid today only!\n\n` +
    `👉 Shop now at dundu.com\n\n_Dundu — Fashion for Every Moment_`
  );

module.exports = {
  sendOtp,
  sendCustom,
  sendWelcome,
  sendBirthday,
  sendOrderConfirmed,
  sendOrderPacked,
  sendOrderShipped,
  sendDeliveryOtp,
  sendOrderDelivered,
  sendOrderCancelled,
  sendPaymentSuccess,
  sendPaymentFailed,
  sendAbandonedCart,
};
