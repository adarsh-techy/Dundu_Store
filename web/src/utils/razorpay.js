export const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export const openRazorpayCheckout = ({ order, user, onSuccess, onError }) => {
  const options = {
    key: import.meta.env.VITE_RAZORPAY_KEY_ID,
    amount: order.amount,
    currency: order.currency,
    name: 'Dundu',
    description: `Order #${order.receipt}`,
    order_id: order.id,
    prefill: { name: user?.name, email: user?.email, contact: user?.phone },
    theme: { color: '#e11d48' },
    handler: onSuccess,
  };
  const rzp = new window.Razorpay(options);
  rzp.on('payment.failed', onError);
  rzp.on('payment.dismissed', onError);
  rzp.open();
};
