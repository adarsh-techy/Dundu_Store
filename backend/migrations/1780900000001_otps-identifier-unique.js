/**
 * otp.service.js#save has always used `ON CONFLICT (identifier) DO UPDATE`,
 * but the `identifier` column only ever had a plain (non-unique) index —
 * so every OTP save (login OTP, and now delivery OTP) throws
 * "there is no unique or exclusion constraint matching the ON CONFLICT
 * specification". This adds the missing uniqueness the upsert relies on.
 */
exports.up = async (pgm) => {
  pgm.dropIndex('otps', 'identifier', { name: 'otps_identifier_index', ifExists: true });
  pgm.addConstraint('otps', 'otps_identifier_unique', 'UNIQUE(identifier)');
};

exports.down = async (pgm) => {
  pgm.dropConstraint('otps', 'otps_identifier_unique', { ifExists: true });
  pgm.createIndex('otps', 'identifier');
};
