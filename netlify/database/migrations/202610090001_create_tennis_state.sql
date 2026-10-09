CREATE TABLE tennis_app_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data JSONB NOT NULL,
  revision BIGINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO tennis_app_state (id, data)
VALUES (
  1,
  '{"players":["James","Philip","Chris","Tony"],"bookings":[]}'::jsonb
);
