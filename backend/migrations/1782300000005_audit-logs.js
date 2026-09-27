/* eslint-disable camelcase */
// Immutable record of admin actions (who did what, to which record, when, from where).
exports.shorthands = undefined;
exports.up = (pgm) => {
  pgm.sql(`CREATE TABLE IF NOT EXISTS audit_logs (
    id           BIGSERIAL PRIMARY KEY,
    actor_id     UUID,
    actor_name   VARCHAR(120),
    actor_email  VARCHAR(255),
    actor_role   VARCHAR(30),
    action       VARCHAR(40)  NOT NULL,          -- create | update | delete | login | other
    entity_type  VARCHAR(60)  NOT NULL,          -- products, orders, settings, auth …
    entity_id    VARCHAR(80),
    summary      VARCHAR(255) NOT NULL,          -- human sentence
    method       VARCHAR(10),
    path         VARCHAR(255),
    status_code  INT,
    details      JSONB,                           -- sanitized request payload / extra info
    ip           VARCHAR(64),
    user_agent   VARCHAR(255),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  pgm.sql('CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs (created_at DESC)');
  pgm.sql('CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON audit_logs (actor_id)');
  pgm.sql('CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs (entity_type, entity_id)');
};
exports.down = (pgm) => { pgm.sql('DROP TABLE IF EXISTS audit_logs'); };
