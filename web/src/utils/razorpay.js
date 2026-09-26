export const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export const openRazorpayCheckout = ({ order, user, onSuccess, onError, onDismiss }) => {
  const options = {
    key: import.meta.env.VITE_RAZORPAY_KEY_ID,
    amount: order.amount,
    currency: order.currency,
    name: 'Dundu',
    description: `Order #${order.receipt}`,
    order_id: order.id,
    prefill: { name: user?.name, email: user?.email, contact: user?.phone },
    theme: { color: '#e91e8c' },
    handler: onSuccess,
    // Razorpay signals a closed modal through options.modal.ondismiss, not an event.
    modal: { ondismiss: () => onDismiss?.() },
  };
  const rzp = new window.Razorpay(options);
  rzp.on('payment.failed', (resp) => onError?.(resp));
  rzp.open();
};
