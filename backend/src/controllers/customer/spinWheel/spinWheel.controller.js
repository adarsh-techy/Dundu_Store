const db = require('../../../config/db');
const { ok, badRequest } = require('../../../utils/response');

async function getSpinWheelSettings() {
  const { rows } = await db.query(
    `SELECT key, value FROM settings WHERE key IN (
      'spin_wheel_enabled',
      'spin_wheel_cooldown_hours',
      'spin_wheel_delay_seconds',
      'spin_wheel_max_per_day',
      'spin_wheel_start_time',
      'spin_wheel_end_time',
      'spin_wheel_require_login',
      'spin_wheel_time_slot',
      'spin_wheel_morning_start',
      'spin_wheel_morning_end',
      'spin_wheel_evening_start',
      'spin_wheel_evening_end',
      'spin_wheel_night_start',
      'spin_wheel_night_end',
      'spin_wheel_title',
      'spin_wheel_subtitle',
      'spin_wheel_force_all_timestamp',
      'spin_wheel_min_orders',
      'spin_wheel_active_from',
      'spin_wheel_active_until'
    )`
  );
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    enabled: map.spin_wheel_enabled !== 'false',
    cooldownHours: parseFloat(map.spin_wheel_cooldown_hours ?? '24'),
    delaySeconds: parseInt(map.spin_wheel_delay_seconds ?? '3', 10),
    maxPerDay: parseInt(map.spin_wheel_max_per_day ?? '1', 10),
    startTime: map.spin_wheel_start_time || '00:00',
    endTime: map.spin_wheel_end_time || '23:59',
    requireLogin: map.spin_wheel_require_login !== 'false',
    timeSlotMode: map.spin_wheel_time_slot || 'anytime',
    morningStart: map.spin_wheel_morning_start || '06:00',
    morningEnd: map.spin_wheel_morning_end || '12:00',
    eveningStart: map.spin_wheel_evening_start || '16:00',
    eveningEnd: map.spin_wheel_evening_end || '20:00',
    nightStart: map.spin_wheel_night_start || '20:00',
    nightEnd: map.spin_wheel_night_end || '23:59',
    title: map.spin_wheel_title || 'Spin & Win Real Rewards! 🎉',
    subtitle: map.spin_wheel_subtitle || 'Spin the wheel today and win exclusive discounts & gift rewards!',
    forceAllTimestamp: map.spin_wheel_force_all_timestamp || null,
    minOrders: parseInt(map.spin_wheel_min_orders ?? '0', 10),
    activeFrom: map.spin_wheel_active_from || '',
    activeUntil: map.spin_wheel_active_until || '',
  };
}

function parseMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function isCurrentTimeInSlot(settings) {
  const now = new Date();
  const curMinutes = now.getHours() * 60 + now.getMinutes();

  const mode = settings.timeSlotMode;
  if (mode === 'anytime') {
    return curMinutes >= parseMinutes(settings.startTime) && curMinutes <= parseMinutes(settings.endTime);
  }

  const inMorning = curMinutes >= parseMinutes(settings.morningStart) && curMinutes <= parseMinutes(settings.morningEnd);
  const inEvening = curMinutes >= parseMinutes(settings.eveningStart) && curMinutes <= parseMinutes(settings.eveningEnd);
  const inNight = curMinutes >= parseMinutes(settings.nightStart) && curMinutes <= parseMinutes(settings.nightEnd);

  if (mode === 'morning') return inMorning;
  if (mode === 'evening') return inEvening;
  if (mode === 'night') return inNight;
  if (mode === 'morning_evening_night') return inMorning || inEvening || inNight;

  return true;
}

async function getUserTier(userId, phone) {
  if (!userId && !phone) return 'new_users';
  let queryStr = 'SELECT COUNT(*)::int AS count FROM orders WHERE status NOT IN (\'cancelled\') AND ';
  const params = [];
  if (userId) {
    params.push(userId);
    queryStr += `user_id = $${params.length}`;
  } else {
    params.push(phone);
    queryStr += `customer_phone = $${params.length}`;
  }
  const { rows } = await db.query(queryStr, params).catch(() => ({ rows: [{ count: 0 }] }));
  const count = rows[0]?.count || 0;
  if (count === 0) return 'new_users';
  if (count >= 3) return 'vip_users';
  return 'existing_users';
}

const getConfig = async (req, res) => {
  const settings = await getSpinWheelSettings();

  const { rows: segments } = await db.query(
    `SELECT id, label, type, value, color, text_color, sort_order, target_user_type
     FROM spin_wheel_segments
     WHERE is_active = true
     ORDER BY sort_order ASC, id ASC`
  );

  let canSpin = true;
  let alreadySpun = false;
  let nextSpinAt = null;
  let userWheelEnabled = true;
  let isForced = false;
  let activeReward = null;

  // Identity comes only from the authenticated token — never from query params, so one
  // customer cannot look up another customer's rewards or popup state.
  const userId = req.user?.id || null;
  const phone = (req.user?.phone || '').replace(/\D/g, '');

  // Check if forced spin popup is active for this user or globally
  if (userId || phone) {
    let userQuery = 'SELECT id, spin_wheel_enabled, force_spin_popup, last_forced_popup_at FROM users WHERE ';
    const userParams = [];
    if (userId) {
      userParams.push(userId);
      userQuery += `id = $${userParams.length}`;
    }
    if (phone) {
      if (userId) userQuery += ' OR ';
      userParams.push(phone);
      userQuery += `RIGHT(phone, 10) = RIGHT($${userParams.length}, 10)`;
    }

    const { rows: userRows } = await db.query(userQuery, userParams).catch(() => ({ rows: [] }));

    if (userRows.length > 0) {
      const u = userRows[0];
      if (u.spin_wheel_enabled === false) {
        userWheelEnabled = false;
      }

      // Check if individual user is forced
      if (u.force_spin_popup === true) {
        isForced = true;
      } else if (settings.forceAllTimestamp) {
        const forceAllDate = new Date(settings.forceAllTimestamp);
        const lastForcedDate = u.last_forced_popup_at ? new Date(u.last_forced_popup_at) : new Date(0);
        if (forceAllDate > lastForcedDate) {
          isForced = true;
        }
      }
    } else if (settings.forceAllTimestamp) {
      isForced = true;
    }
  } else if (settings.forceAllTimestamp) {
    isForced = true;
  }

  // Check active unredeemed spin reward
  if (userId || phone) {
    let rewardQuery = `
      SELECT id, prize_label, prize_type, prize_value, coupon_code, created_at
      FROM spin_wheel_logs
      WHERE is_redeemed = false AND prize_type != 'no_prize' AND (
    `;
    const rewardParams = [];
    if (userId) {
      rewardParams.push(userId);
      rewardQuery += `user_id = $${rewardParams.length}`;
    }
    if (phone) {
      if (userId) rewardQuery += ' OR ';
      rewardParams.push(phone);
      rewardQuery += `RIGHT(phone, 10) = RIGHT($${rewardParams.length}, 10)`;
    }
    rewardQuery += `) ORDER BY created_at DESC LIMIT 1`;

    const { rows: rewardRows } = await db.query(rewardQuery, rewardParams).catch(() => ({ rows: [] }));
    if (rewardRows.length > 0) {
      activeReward = rewardRows[0];
    }
  }

  // If forced by admin, override all restrictions!
  if (isForced) {
    canSpin = true;
    userWheelEnabled = true;
    alreadySpun = false;
  } else {
    // ── Date range check ──
    if (settings.activeFrom || settings.activeUntil) {
      const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      if (settings.activeFrom && todayStr < settings.activeFrom) {
        canSpin = false;
        userWheelEnabled = false;
      }
      if (settings.activeUntil && todayStr > settings.activeUntil) {
        canSpin = false;
        userWheelEnabled = false;
      }
    }

    // ── Min orders check ──
    if (settings.minOrders > 0) {
      let orderCountQuery = 'SELECT COUNT(*)::int AS count FROM orders WHERE status NOT IN (\'cancelled\') AND ';
      const oParams = [];
      if (userId) {
        oParams.push(userId);
        orderCountQuery += `user_id = $${oParams.length}`;
      } else if (phone) {
        oParams.push(phone);
        orderCountQuery += `customer_phone = $${oParams.length}`;
      } else {
        canSpin = false;
        userWheelEnabled = false;
      }
      if (oParams.length > 0) {
        const { rows: oRows } = await db.query(orderCountQuery, oParams).catch(() => ({ rows: [{ count: 0 }] }));
        const orderCount = oRows[0]?.count || 0;
        if (orderCount < settings.minOrders) {
          canSpin = false;
          userWheelEnabled = false;
        }
      }
    } else {
      // Legacy: block new users (0 orders) when minOrders not configured
      const userTier = await getUserTier(userId, phone);
      if (userTier === 'new_users') {
        canSpin = false;
        userWheelEnabled = false;
      }
    }

    // Standard checks
    if (settings.requireLogin && !userId && !phone) {
      canSpin = false;
      userWheelEnabled = false;
    }

    const timeSlotActive = isCurrentTimeInSlot(settings);
    if (!timeSlotActive) {
      canSpin = false;
    }

    if (userId || phone) {
      let queryStr = 'SELECT created_at FROM spin_wheel_logs WHERE ';
      const params = [];
      if (userId) {
        params.push(userId);
        queryStr += `user_id = $${params.length}`;
      } else {
        params.push(phone);
        queryStr += `phone = $${params.length}`;
      }
      queryStr += ' ORDER BY created_at DESC LIMIT 1';

      const { rows: logs } = await db.query(queryStr, params);

      if (logs.length > 0) {
        const lastSpin = new Date(logs[0].created_at);
        const cooldownMs = settings.cooldownHours * 60 * 60 * 1000;
        const eligibleTime = new Date(lastSpin.getTime() + cooldownMs);
        const now = new Date();

        if (now < eligibleTime) {
          canSpin = false;
          alreadySpun = true;
          nextSpinAt = eligibleTime.toISOString();
        }
      }
    }
  }

  const finalEnabled = isForced ? true : (settings.enabled && userWheelEnabled && !alreadySpun);

  ok(res, {
    enabled: finalEnabled,
    cooldown_hours: settings.cooldownHours,
    delay_seconds: isForced ? 0 : settings.delaySeconds,
    max_per_day: settings.maxPerDay,
    require_login: settings.requireLogin,
    time_slot_mode: settings.timeSlotMode,
    start_time: settings.startTime,
    end_time: settings.endTime,
    title: settings.title,
    subtitle: settings.subtitle,
    can_spin: canSpin && userWheelEnabled,
    already_spun: isForced ? false : alreadySpun,
    is_forced: isForced,
    next_spin_at: nextSpinAt,
    active_reward: activeReward,
    segments,
  });
};

const getActiveReward = async (req, res) => {
  const userId = req.user?.id || null;
  const phone = (req.user?.phone || '').replace(/\D/g, '');

  if (!userId && !phone) {
    return ok(res, { active_reward: null });
  }

  let rewardQuery = `
    SELECT id, prize_label, prize_type, prize_value, coupon_code, created_at
    FROM spin_wheel_logs
    WHERE is_redeemed = false AND prize_type != 'no_prize' AND (
  `;
  const rewardParams = [];
  if (userId) {
    rewardParams.push(userId);
    rewardQuery += `user_id = $${rewardParams.length}`;
  }
  if (phone) {
    if (userId) rewardQuery += ' OR ';
    rewardParams.push(phone);
    rewardQuery += `RIGHT(phone, 10) = RIGHT($${rewardParams.length}, 10)`;
  }
  rewardQuery += `) ORDER BY created_at DESC LIMIT 1`;

  const { rows } = await db.query(rewardQuery, rewardParams).catch(() => ({ rows: [] }));

  ok(res, { active_reward: rows[0] || null });
};

const spinInner = async (req, res, q) => {
  const settings = await getSpinWheelSettings();

  if (!settings.enabled) {
    return badRequest(res, 'Spin & Win feature is currently disabled');
  }

  // Route is behind `authenticate`; identity is taken from the token only.
  const userId = req.user.id;
  const phone = (req.user.phone || '').replace(/\D/g, '');

  const { rows: meRows } = await q.query(
    'SELECT spin_wheel_enabled, force_spin_popup, last_forced_popup_at FROM users WHERE id=$1', [userId]
  );
  const me = meRows[0] || {};
  if (me.spin_wheel_enabled === false) {
    return badRequest(res, 'Spin & Win is not available on your account');
  }

  // An admin "forced" spin bypasses cooldown/time-slot rules exactly once.
  let isForced = me.force_spin_popup === true;
  if (!isForced && settings.forceAllTimestamp) {
    const forceAllDate = new Date(settings.forceAllTimestamp);
    const lastForcedDate = me.last_forced_popup_at ? new Date(me.last_forced_popup_at) : new Date(0);
    if (forceAllDate > lastForcedDate) isForced = true;
  }

  if (!isForced) {
    if (!isCurrentTimeInSlot(settings)) {
      return badRequest(res, 'Spin & Win is not open right now. Please come back later.');
    }

    // Cooldown + daily cap, enforced server-side (previously only shown in the UI).
    const { rows: recent } = await q.query(
      `SELECT created_at FROM spin_wheel_logs
       WHERE user_id = $1 OR (phone IS NOT NULL AND phone = $2)
       ORDER BY created_at DESC LIMIT 50`,
      [userId, phone || null]
    );
    if (recent.length) {
      const cooldownMs = settings.cooldownHours * 60 * 60 * 1000;
      const eligibleTime = new Date(new Date(recent[0].created_at).getTime() + cooldownMs);
      if (new Date() < eligibleTime) {
        return badRequest(res, 'You have already spun the wheel. Please come back later.');
      }
      const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
      const spinsToday = recent.filter((r) => new Date(r.created_at) >= dayStart).length;
      if (settings.maxPerDay > 0 && spinsToday >= settings.maxPerDay) {
        return badRequest(res, 'You have reached today\'s spin limit.');
      }
    }
  }

  // New customers check & min orders enforcement
  if (settings.minOrders > 0) {
    let orderCountQuery = 'SELECT COUNT(*)::int AS count FROM orders WHERE status NOT IN (\'cancelled\') AND ';
    const oParams = [];
    if (userId) {
      oParams.push(userId);
      orderCountQuery += `user_id = $${oParams.length}`;
    } else if (phone) {
      oParams.push(phone);
      orderCountQuery += `customer_phone = $${oParams.length}`;
    }
    if (oParams.length > 0) {
      const { rows: oRows } = await q.query(orderCountQuery, oParams).catch(() => ({ rows: [{ count: 0 }] }));
      if ((oRows[0]?.count || 0) < settings.minOrders) {
        return badRequest(res, `You need at least ${settings.minOrders} completed order(s) to spin the wheel.`);
      }
    }
  } else {
    // Legacy: block new users
    const spinUserTier = await getUserTier(userId, phone);
    if (spinUserTier === 'new_users') {
      return badRequest(res, 'New customers automatically receive a Welcome Discount on their first purchase!');
    }
  }

  // Date range check
  if (settings.activeFrom || settings.activeUntil) {
    const todayStr = new Date().toISOString().split('T')[0];
    if (settings.activeFrom && todayStr < settings.activeFrom) {
      return badRequest(res, 'The Spin & Win event has not started yet.');
    }
    if (settings.activeUntil && todayStr > settings.activeUntil) {
      return badRequest(res, 'The Spin & Win event has ended.');
    }
  }

  // Get active segments
  const { rows: segments } = await q.query(
    `SELECT id, label, type, value, coupon_code, color, text_color, probability, sort_order, target_user_type
     FROM spin_wheel_segments
     WHERE is_active = true
     ORDER BY sort_order ASC, id ASC`
  );

  if (segments.length === 0) {
    return badRequest(res, 'No active wheel prizes available right now');
  }

  let winningSegment = null;
  let targetRuleId = null;

  // 1. Check Specific Admin User Target Override
  if (userId || phone) {
    let targetQuery = `
      SELECT * FROM spin_wheel_user_targets
      WHERE is_active = true AND is_claimed = false AND (
    `;
    const targetParams = [];
    if (userId) {
      targetParams.push(userId);
      targetQuery += `user_id = $${targetParams.length}`;
    }
    if (phone) {
      if (userId) targetQuery += ' OR ';
      targetParams.push(phone);
      targetQuery += `RIGHT(phone, 10) = RIGHT($${targetParams.length}, 10)`;
    }
    targetQuery += `) ORDER BY id DESC LIMIT 1`;

    const { rows: targetRows } = await q.query(targetQuery, targetParams).catch(() => ({ rows: [] }));

    if (targetRows.length > 0) {
      const targetRule = targetRows[0];
      targetRuleId = targetRule.id;

      if (targetRule.segment_id) {
        winningSegment = segments.find((s) => s.id === targetRule.segment_id) || null;
      }

      if (!winningSegment) {
        winningSegment = {
          id: targetRule.segment_id || segments[0].id,
          label: targetRule.custom_prize_label || 'VIP Special Gift! 🎁',
          type: targetRule.custom_prize_type || 'coupon',
          value: targetRule.custom_prize_value || 50,
          coupon_code: targetRule.custom_coupon_code || 'VIPGIFT',
          color: '#E91E8C',
          text_color: '#FFFFFF',
          probability: 100,
        };
      }
    }
  }

  // 2. If no user-specific target, filter segments by user tier & roll weighted probability
  if (!winningSegment) {
    const userTier = await getUserTier(userId, phone);

    const eligibleSegments = segments.filter(
      (s) => !s.target_user_type || s.target_user_type === 'all' || s.target_user_type === userTier
    );

    const pool = eligibleSegments.length > 0 ? eligibleSegments : segments;

    const totalWeight = pool.reduce((sum, seg) => sum + (parseInt(seg.probability, 10) || 1), 0);
    let randomVal = Math.random() * totalWeight;

    for (const seg of pool) {
      const weight = parseInt(seg.probability, 10) || 1;
      if (randomVal < weight) {
        winningSegment = seg;
        break;
      }
      randomVal -= weight;
    }

    if (!winningSegment) winningSegment = pool[0];
  }

  if (targetRuleId) {
    await q.query('UPDATE spin_wheel_user_targets SET is_claimed = true WHERE id = $1', [targetRuleId]).catch(() => {});
  }

  const index = segments.findIndex((s) => s.id === winningSegment.id);
  let finalCouponCode = winningSegment.coupon_code || null;

  if (winningSegment.type === 'coupon' || winningSegment.type === 'free_shipping') {
    if (!finalCouponCode) {
      finalCouponCode = winningSegment.type === 'free_shipping'
        ? `FREESHIP_${Math.random().toString(36).substring(2, 7).toUpperCase()}`
        : `SPIN_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    }

    if (winningSegment.type === 'coupon') {
      // Generated per-spin codes are single-use, bound to this user and expire in 30 days.
      // Shared segment codes (e.g. SPIN10) stay usable by every winner, but only once each.
      const generated = !winningSegment.coupon_code;
      await q.query(
        `INSERT INTO coupons (code, discount_type, discount_value, is_active, usage_limit, per_user_limit, user_id, expires_at)
         VALUES ($1, $2, $3, true, $4, 1, $5, $6)
         ON CONFLICT (code) DO NOTHING`,
        [
          finalCouponCode,
          winningSegment.value > 50 ? 'fixed' : 'percentage',
          winningSegment.value || 0,
          generated ? 1 : null,
          generated ? userId : null,
          generated ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
        ]
      );
    }
  } else if (winningSegment.type === 'loyalty_points' && phone) {
    const points = parseInt(winningSegment.value, 10) || 10;
    await q.query(
      `INSERT INTO loyalty_cards (phone, name, points, total_spent)
       VALUES ($1, $2, $3, 0)
       ON CONFLICT (phone) DO UPDATE SET points = loyalty_cards.points + $3`,
      [phone, req.user?.name || 'Customer', points]
    ).catch(() => {});
  }

  await q.query(
    `INSERT INTO spin_wheel_logs (user_id, phone, segment_id, prize_label, prize_type, prize_value, coupon_code, is_redeemed)
     VALUES ($1, $2, $3, $4, $5, $6, $7, false)`,
    [
      userId,
      phone || null,
      winningSegment.id || null,
      winningSegment.label,
      winningSegment.type,
      winningSegment.value || 0,
      finalCouponCode,
    ]
  );

  // Clear forced spin flag after spin is completed
  await q.query(
    'UPDATE users SET force_spin_popup = false, last_forced_popup_at = NOW() WHERE id = $1', [userId]
  ).catch(() => {});

  ok(res, {
    winner_index: index >= 0 ? index : 0,
    winning_segment: {
      id: winningSegment.id,
      label: winningSegment.label,
      type: winningSegment.type,
      value: winningSegment.value,
      coupon_code: finalCouponCode,
      color: winningSegment.color,
      text_color: winningSegment.text_color,
    },
  });
};


// Wraps spinInner in a transaction holding a per-user advisory lock so parallel requests
// cannot each pass the cooldown check and win several prizes.
const spin = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`spin:${req.user.id}`]);
    await spinInner(req, res, client);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  getConfig,
  getActiveReward,
  spin,
};
