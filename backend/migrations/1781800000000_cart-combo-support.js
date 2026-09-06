exports.up = async (pgm) => {
  // Add combo support columns to cart table
  pgm.addColumns('cart', {
    combo_id: {
      type: 'uuid',
      references: 'combos',
      onDelete: 'CASCADE',
      // nullable — regular product items have no combo_id
    },
    combo_selections: {
      type: 'jsonb',
      // stores array of { slot_id, slot_label, product_id, variant_id, color, size }
    },
  });
  // Make product_id nullable so a combo-only cart item doesn't need it
  pgm.alterColumn('cart', 'product_id', { type: 'uuid', notNull: false });
};

exports.down = async (pgm) => {
  pgm.dropColumns('cart', ['combo_id', 'combo_selections'], { ifExists: true });
  pgm.alterColumn('cart', 'product_id', { type: 'uuid', notNull: true });
};
