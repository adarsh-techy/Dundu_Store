const crypto = require('crypto');
const QRCode = require('qrcode');
const db = require('../../config/db');
const { ok, notFound, badRequest } = require('../../utils/response');
const whatsapp = require('../../services/whatsapp.service');

const STATUS_FLOW = ['pending', 'packed', 'shipped', 'delivered'];

const generateTrackingNumber = () => `DUNDU-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;

const list = async (req, res) => {
  const { status, category, date, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const params = [];
  const conditions = [];

  if (status) { params.push(status); conditions.push(`o.status=$${params.length}`); }
  if (category) {
    params.push(category);
    conditions.push(
      `o.id IN (SELECT DISTINCT oi.order_id FROM order_items oi
                JOIN products p ON oi.product_id=p.id
                JOIN categories c ON p.category_id=c.id
                WHERE c.slug=$${params.length})`
    );
  }
  if (date) { params.push(date); conditions.push(`o.created_at::date = $${params.length}::date`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const countParams = params.slice();
  params.push(limit, offset);

  const [{ rows }, countRes] = await Promise.all([
    db.query(
      `SELECT o.*, u.name AS user_name, u.phone AS user_phone,
              (
                SELECT json_agg(item_data)
                FROM (
                  SELECT jsonb_build_object(
                    'product_name',  oi.product_name,
                    'variant_info',  oi.variant_info,
                    'product_image', (
                      SELECT pi.url FROM product_images pi
                      WHERE pi.product_id = oi.product_id AND pi.is_primary = true
                      LIMIT 1
                    )
                  ) AS item_data
                  FROM order_items oi
                  WHERE oi.order_id = o.id
                  ORDER BY oi.id
                ) sub
              ) AS items
       FROM orders o JOIN users u ON o.user_id=u.id
       ${where}
       ORDER BY o.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    ),
    db.query(
      `SELECT COUNT(*) FROM orders o JOIN users u ON o.user_id=u.id ${where}`,
      countParams
    ),
  ]);
  ok(res, { orders: rows, total: parseInt(countRes.rows[0].count) });
};

const getOne = async (req, res) => {
  const { rows } = await db.query(
    `SELECT o.*, u.name AS user_name, u.phone AS user_phone,
            picker.name AS picked_up_by_name, picker.phone AS picked_up_by_phone,
            deliverer.name AS delivered_by_name, deliverer.phone AS delivered_by_phone,
            json_agg(
              jsonb_build_object(
                'id',           oi.id,
                'product_id',   oi.product_id,
                'variant_id',   oi.variant_id,
                'product_name', oi.product_name,
                'variant_info', oi.variant_info,
                'quantity',     oi.quantity,
                'unit_price',   oi.unit_price,
                'product_image', pi_sub.url
              )
            ) AS items,
            a.name, a.phone, a.address_line1, a.address_line2,
            a.city, a.state, a.pincode, a.is_default
     FROM orders o
     JOIN users u ON o.user_id=u.id
     JOIN order_items oi ON oi.order_id=o.id
     LEFT JOIN LATERAL (
       SELECT url FROM product_images
       WHERE product_id = oi.product_id AND is_primary = true
       LIMIT 1
     ) pi_sub ON true
     LEFT JOIN addresses a ON o.address_id=a.id
     LEFT JOIN users picker ON o.picked_up_by = picker.id
     LEFT JOIN users deliverer ON o.delivered_by = deliverer.id
     WHERE o.id=$1
     GROUP BY o.id, u.name, u.phone, a.id, picker.name, picker.phone, deliverer.name, deliverer.phone`,
    [req.params.id]
  );
  if (!rows.length) return notFound(res, 'Order not found');
  ok(res, { order: rows[0] });
};

const CANCELLABLE_FROM = ['pending', 'packed'];

const updateStatus = async (req, res) => {
  const { status, courier_name, courier_tracking_number, courier_phone } = req.body;
  const { rows } = await db.query('SELECT * FROM orders WHERE id=$1', [req.params.id]);
  if (!rows.length) return notFound(res, 'Order not found');

  const order = rows[0];

  if (status === 'returned' && order.status === 'return_requested') {
    await db.query("UPDATE orders SET status='returned', updated_at=now() WHERE id=$1", [order.id]);
  } else if (status === 'delivered' && order.status === 'return_requested') {
    // Reject return — revert to delivered
    await db.query("UPDATE orders SET status='delivered', updated_at=now() WHERE id=$1", [order.id]);
  } else if (status === 'cancelled') {
    if (!CANCELLABLE_FROM.includes(order.status)) {
      return badRequest(res, 'Order cannot be cancelled at this stage');
    }
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const { rows: items } = await client.query(
        'SELECT product_id, variant_id, quantity FROM order_items WHERE order_id=$1',
        [order.id]
      );
      for (const item of items) {
        if (item.variant_id) {
          await client.query('UPDATE product_variants SET stock=stock+$1 WHERE id=$2', [item.quantity, item.variant_id]);
        } else {
          await client.query('UPDATE products SET stock=stock+$1 WHERE id=$2', [item.quantity, item.product_id]);
        }
      }
      await client.query("UPDATE orders SET status='cancelled', updated_at=now() WHERE id=$1", [order.id]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } else {
    const currentIdx = STATUS_FLOW.indexOf(order.status);
    const newIdx = STATUS_FLOW.indexOf(status);
    if (newIdx === -1 || (currentIdx !== -1 && newIdx <= currentIdx)) {
      return badRequest(res, 'Invalid status transition');
    }
    if (status === 'shipped') {
      const isDundu = courier_name === 'Dundu Delivery';
      const trackingNumber = isDundu ? generateTrackingNumber() : (courier_tracking_number || null);
      const qrToken = isDundu ? crypto.randomBytes(16).toString('hex') : null;
      await db.query(
        `UPDATE orders SET status=$1, courier_name=$2, courier_tracking_number=$3, courier_phone=$4,
                delivery_qr_token=$5, updated_at=now() WHERE id=$6`,
        [status, courier_name || null, trackingNumber, courier_phone || null, qrToken, order.id]
      );
      if (isDundu) {
        const qrDataUrl = await QRCode.toDataURL(qrToken);
        const { rows: userRows } = await db.query('SELECT phone FROM users WHERE id=$1', [order.user_id]);
        whatsapp.sendOrderShipped(userRows[0]?.phone, order.order_number).catch(console.error);
        return ok(res, { qr_data_url: qrDataUrl, courier_tracking_number: trackingNumber }, 'Order marked as shipped');
      }
    } else {
      await db.query("UPDATE orders SET status=$1, updated_at=now() WHERE id=$2", [status, order.id]);
    }
  }

  const { rows: userRows } = await db.query('SELECT phone FROM users WHERE id=$1', [order.user_id]);
  const phone = userRows[0]?.phone;
  if (phone) {
    const notifyMap = {
      packed: () => whatsapp.sendOrderPacked(phone, order.order_number),
      shipped: () => whatsapp.sendOrderShipped(phone, order.order_number),
      delivered: () => whatsapp.sendOrderDelivered(phone, order.order_number),
      cancelled: () => whatsapp.sendOrderCancelled(phone, order.order_number),
    };
    notifyMap[status]?.().catch(console.error);
  }

  ok(res, {}, `Order marked as ${status}`);
};

const getQr = async (req, res) => {
  const { rows } = await db.query('SELECT delivery_qr_token FROM orders WHERE id=$1', [req.params.id]);
  if (!rows.length) return notFound(res, 'Order not found');
  if (!rows[0].delivery_qr_token) return badRequest(res, 'This order has no pickup QR');
  const qrDataUrl = await QRCode.toDataURL(rows[0].delivery_qr_token);
  ok(res, { qr_data_url: qrDataUrl });
};

const updateCourier = async (req, res) => {
  const { courier_name, courier_tracking_number, courier_phone } = req.body;
  const { rows } = await db.query('SELECT id FROM orders WHERE id=$1', [req.params.id]);
  if (!rows.length) return notFound(res, 'Order not found');
  await db.query(
    `UPDATE orders SET courier_name=$1, courier_tracking_number=$2, courier_phone=$3, updated_at=now() WHERE id=$4`,
    [courier_name || null, courier_tracking_number || null, courier_phone || null, req.params.id]
  );
  ok(res, {}, 'Courier details updated');
};

const getReturnRequests = async (req, res) => {
  const { date, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const params = [];
  const conditions = [];

  if (date) { params.push(date); conditions.push(`rr.created_at::date = $${params.length}::date`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const countParams = params.slice();
  params.push(limit, offset);

  const [{ rows }, countRes, chargeRes] = await Promise.all([
    db.query(
      `SELECT rr.*, o.order_number, o.total AS order_total, u.name AS user_name, u.phone AS user_phone
       FROM return_requests rr
       JOIN orders o ON rr.order_id=o.id
       JOIN users u ON o.user_id=u.id
       ${where}
       ORDER BY rr.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    ),
    db.query(`SELECT COUNT(*) FROM return_requests rr ${where}`, countParams),
    db.query("SELECT value FROM settings WHERE key='return_courier_charge'"),
  ]);
  const courierCharge = chargeRes.rows.length ? parseInt(chargeRes.rows[0].value) || 0 : 0;
  const returns = rows.map((r) => ({
    ...r,
    courier_charge: courierCharge,
    refund_amount: Math.max(0, parseFloat(r.order_total) - courierCharge),
  }));
  ok(res, { returns, total: parseInt(countRes.rows[0].count) });
};

const handleReturn = async (req, res) => {
  const { status, admin_note } = req.body;
  if (!['approved', 'rejected'].includes(status)) return badRequest(res, 'Invalid status');

  const { rows: rr } = await db.query(
    'SELECT * FROM return_requests WHERE id=$1',
    [req.params.id]
  );
  if (!rr.length) return notFound(res, 'Return request not found');
  if (rr[0].status !== 'pending') return badRequest(res, 'Return already reviewed');

  if (status === 'approved') {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const { rows: items } = await client.query(
        'SELECT product_id, variant_id, quantity FROM order_items WHERE order_id=$1',
        [rr[0].order_id]
      );
      for (const item of items) {
        if (item.variant_id) {
          await client.query('UPDATE product_variants SET stock=stock+$1 WHERE id=$2', [item.quantity, item.variant_id]);
        } else {
          await client.query('UPDATE products SET stock=stock+$1 WHERE id=$2', [item.quantity, item.product_id]);
        }
      }
      await client.query(
        'UPDATE return_requests SET status=$1, admin_note=$2, updated_at=now() WHERE id=$3',
        [status, admin_note || null, req.params.id]
      );
      await client.query(
        "UPDATE orders SET status='returned', updated_at=now() WHERE id=$1",
        [rr[0].order_id]
      );

      // Deduct loyalty points earned on this order
      const { rows: orderInfo } = await client.query(
        `SELECT o.total, u.phone
         FROM orders o LEFT JOIN users u ON o.user_id = u.id
         WHERE o.id = $1`,
        [rr[0].order_id]
      );
      const ord = orderInfo[0];
      if (ord && ord.phone) {
        const phone = ord.phone.replace(/\D/g, '');
        const pointsToDeduct = Math.floor(parseFloat(ord.total) / 500) * 20;
        if (pointsToDeduct > 0) {
          await client.query(
            `UPDATE loyalty_cards
             SET points = GREATEST(0, points - $1), updated_at = now()
             WHERE phone = $2`,
            [pointsToDeduct, phone]
          );
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } else {
    await db.query(
      'UPDATE return_requests SET status=$1, admin_note=$2, updated_at=now() WHERE id=$3',
      [status, admin_note || null, req.params.id]
    );
    // Rejected — revert order status back to delivered
    await db.query(
      "UPDATE orders SET status='delivered', updated_at=now() WHERE id=$1",
      [rr[0].order_id]
    );
  }

  ok(res, {}, `Return ${status}`);
};

module.exports = { list, getOne, updateStatus, updateCourier, getReturnRequests, handleReturn, getQr };
