const db = require('../../../config/db');
const { ok, notFound, badRequest } = require('../../../utils/response');
const otpService = require('../../../services/otp/otp.service');
const whatsapp = require('../../../services/whatsapp/whatsapp.service');

const DELIVERY_OTP_TTL_MINUTES = 360;

const ORDER_SUMMARY_FIELDS = `
  o.id, o.order_number, o.total, o.status, o.picked_up_at, o.delivered_by,
  o.courier_tracking_number,
  u.name AS customer_name, u.phone AS customer_phone,
  a.address_line1, a.address_line2, a.city, a.state, a.pincode
`;

const available = async (_req, res) => {
  const { rows } = await db.query(
    `SELECT ${ORDER_SUMMARY_FIELDS}
     FROM orders o
     JOIN users u ON o.user_id = u.id
     LEFT JOIN addresses a ON o.address_id = a.id
     WHERE o.status = 'shipped' AND o.courier_name = 'Dundu Delivery' AND o.picked_up_at IS NULL
     ORDER BY o.updated_at ASC`
  );
  ok(res, { orders: rows });
};

const myOrders = async (req, res) => {
  const { rows } = await db.query(
    `SELECT ${ORDER_SUMMARY_FIELDS}
     FROM orders o
     JOIN users u ON o.user_id = u.id
     LEFT JOIN addresses a ON o.address_id = a.id
     WHERE o.picked_up_by = $1 AND o.status = 'shipped'
     ORDER BY o.picked_up_at ASC`,
    [req.user.id]
  );
  ok(res, { orders: rows });
};

const pickup = async (req, res) => {
  const { token } = req.body;
  if (!token) return badRequest(res, 'QR token is required');

  const { rows } = await db.query(
    `SELECT o.id, o.order_number, o.user_id, u.phone
     FROM orders o JOIN users u ON o.user_id = u.id
     WHERE o.delivery_qr_token = $1 AND o.status = 'shipped' AND o.picked_up_at IS NULL`,
    [token]
  );
  if (!rows.length) return notFound(res, 'Invalid QR code or order already picked up');
  const order = rows[0];

  await db.query(
    'UPDATE orders SET picked_up_by=$1, picked_up_at=now(), updated_at=now() WHERE id=$2',
    [req.user.id, order.id]
  );

  const otp = otpService.generate();
  await otpService.save(`delivery:${order.id}`, otp, DELIVERY_OTP_TTL_MINUTES);
  if (order.phone) {
    whatsapp.sendDeliveryOtp?.(order.phone, order.order_number, otp)?.catch(console.error);
  }

  ok(res, { order_id: order.id, order_number: order.order_number }, 'Order picked up');
};

const resendOtp = async (req, res) => {
  const { orderId } = req.body;
  const { rows } = await db.query(
    `SELECT o.id, o.order_number, u.phone
     FROM orders o JOIN users u ON o.user_id = u.id
     WHERE o.id=$1 AND o.picked_up_by=$2 AND o.status='shipped'`,
    [orderId, req.user.id]
  );
  if (!rows.length) return notFound(res, 'Order not found in your active deliveries');
  const order = rows[0];

  const otp = otpService.generate();
  await otpService.save(`delivery:${order.id}`, otp, DELIVERY_OTP_TTL_MINUTES);
  if (order.phone) {
    whatsapp.sendDeliveryOtp?.(order.phone, order.order_number, otp)?.catch(console.error);
  }
  ok(res, {}, 'OTP resent');
};

const complete = async (req, res) => {
  const { orderId, otp } = req.body;
  if (!otp) return badRequest(res, 'OTP is required');

  const { rows } = await db.query(
    "SELECT id, order_number, user_id FROM orders WHERE id=$1 AND picked_up_by=$2 AND status='shipped'",
    [orderId, req.user.id]
  );
  if (!rows.length) return notFound(res, 'Order not found in your active deliveries');
  const order = rows[0];

  const valid = await otpService.verify(`delivery:${order.id}`, otp);
  if (!valid) return badRequest(res, 'Invalid or expired OTP');

  await db.query(
    `UPDATE orders SET status='delivered', delivered_by=$1, delivery_completed_at=now(), updated_at=now() WHERE id=$2`,
    [req.user.id, order.id]
  );

  const { rows: userRows } = await db.query('SELECT phone FROM users WHERE id=$1', [order.user_id]);
  if (userRows[0]?.phone) {
    whatsapp.sendOrderDelivered?.(userRows[0].phone, order.order_number)?.catch(console.error);
  }

  ok(res, {}, 'Delivery completed');
};

module.exports = { available, myOrders, pickup, resendOtp, complete };
