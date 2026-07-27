exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE referral_rewards
      DROP CONSTRAINT IF EXISTS referral_rewards_order_id_fkey,
      ALTER COLUMN order_id TYPE uuid USING NULL,
      ADD CONSTRAINT referral_rewards_order_id_fkey
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE referral_rewards
      DROP CONSTRAINT IF EXISTS referral_rewards_order_id_fkey,
      ALTER COLUMN order_id TYPE integer USING NULL
  `);
};
