const passport = require('passport');
const db = require('./db');

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  const GoogleStrategy = require('passport-google-oauth20').Strategy;
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const primaryEmail = profile.emails?.[0];
          const email = primaryEmail?.value;
          // Only link a Google identity to an existing account by email when Google
          // reports that email as verified; otherwise an attacker could claim someone
          // else's address at Google and log into their store account.
          const emailVerified = primaryEmail?.verified === true || primaryEmail?.verified === 'true';

          const { rows } = await db.query(
            emailVerified
              ? 'SELECT * FROM users WHERE google_id = $1 OR email = $2'
              : 'SELECT * FROM users WHERE google_id = $1',
            emailVerified ? [profile.id, email] : [profile.id]
          );

          if (rows.length > 0) {
            const user = rows[0];
            if (user.is_blocked) return done(null, false);
            if (!user.google_id) {
              await db.query('UPDATE users SET google_id = $1 WHERE id = $2', [profile.id, user.id]);
            }
            return done(null, user);
          }

          const REFERRAL_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
          let referralCode;
          for (let attempts = 0; attempts < 10; attempts++) {
            let code = 'VLR';
            for (let i = 0; i < 6; i++) code += REFERRAL_CHARS[Math.floor(Math.random() * REFERRAL_CHARS.length)];
            const { rows: taken } = await db.query('SELECT id FROM users WHERE referral_code=$1', [code]);
            if (!taken.length) { referralCode = code; break; }
          }
          const { rows: newRows } = await db.query(
            `INSERT INTO users (name, email, google_id, avatar_url, referral_code)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [profile.displayName, email, profile.id, profile.photos?.[0]?.value, referralCode || null]
          );
          return done(null, newRows[0]);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
}

module.exports = passport;
