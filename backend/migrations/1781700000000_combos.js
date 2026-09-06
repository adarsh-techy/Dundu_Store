exports.up = async (pgm) => {
  // ── Combos ────────────────────────────────────────────────────────────────
  pgm.createTable('combos', {
    id:          { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name:        { type: 'varchar(255)', notNull: true },
    description: { type: 'text' },
    price:       { type: 'numeric(10,2)', notNull: true },
    offer_price: { type: 'numeric(10,2)' },
    image_url:   { type: 'text' },
    stock:       { type: 'integer', default: 100 },
    is_active:   { type: 'boolean', default: true },
    sort_order:  { type: 'integer', default: 0 },
    created_at:  { type: 'timestamptz', default: pgm.func('now()') },
    updated_at:  { type: 'timestamptz', default: pgm.func('now()') },
  });

  // ── Combo Slots ────────────────────────────────────────────────────────────
  // Each combo has 1+ slots. A slot is a "position" in the combo bundle.
  // requires_selection = false → item is auto-included, no size/color choice needed (e.g. earrings)
  // requires_selection = true  → user must pick a variant (size/color)
  pgm.createTable('combo_slots', {
    id:                 { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    combo_id:           { type: 'uuid', notNull: true, references: 'combos', onDelete: 'CASCADE' },
    slot_label:         { type: 'varchar(100)', notNull: true },   // e.g. "Churidhar", "Earrings"
    requires_selection: { type: 'boolean', default: true },        // must pick size/color?
    sort_order:         { type: 'integer', default: 0 },
  });
  pgm.createIndex('combo_slots', 'combo_id');

  // ── Combo Slot Products ────────────────────────────────────────────────────
  // Each slot can have 1+ product choices (user picks one if multiple).
  pgm.createTable('combo_slot_products', {
    id:         { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    slot_id:    { type: 'uuid', notNull: true, references: 'combo_slots', onDelete: 'CASCADE' },
    product_id: { type: 'uuid', notNull: true, references: 'products', onDelete: 'CASCADE' },
    sort_order: { type: 'integer', default: 0 },
  });
  pgm.createIndex('combo_slot_products', 'slot_id');
  pgm.createIndex('combo_slot_products', 'product_id');
};

exports.down = async (pgm) => {
  pgm.dropTable('combo_slot_products', { ifExists: true });
  pgm.dropTable('combo_slots',         { ifExists: true });
  pgm.dropTable('combos',              { ifExists: true });
};
