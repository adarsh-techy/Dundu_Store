exports.up = (pgm) => {
  pgm.addColumns('return_requests', {
    // 'wallet' | 'original' | 'bank_transfer' — how the approved return was actually refunded.
    // Null until the return is approved.
    refund_method: { type: 'varchar(20)' },
    // Razorpay refund id (for 'original'), or the bank UTR/transaction reference the admin
    // entered (for 'bank_transfer'). Null for 'wallet' (the wallet_transactions row is the record).
    refund_reference: { type: 'varchar(255)' },
    // Amount actually refunded (order total minus courier return charge), persisted at
    // approval time for an audit trail independent of later order/settings changes.
    refund_amount: { type: 'numeric(10,2)' },
    refunded_at: { type: 'timestamptz' },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('return_requests', ['refund_method', 'refund_reference', 'refund_amount', 'refunded_at']);
};
