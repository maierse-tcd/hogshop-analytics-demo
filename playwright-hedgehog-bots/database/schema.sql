-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  persona TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  first_login_at DATETIME,
  last_login_at DATETIME,
  last_activity_at DATETIME,
  status TEXT DEFAULT 'active',
  churned_at DATETIME,
  reactivation_utm_campaign TEXT,
  reactivation_utm_source TEXT,
  reactivation_utm_medium TEXT,
  reactivated_at DATETIME,
  total_purchases INTEGER DEFAULT 0,
  total_spent REAL DEFAULT 0,
  newsletter_subscribed INTEGER DEFAULT 0,
  cart_abandoned_count INTEGER DEFAULT 0,
  session_count INTEGER DEFAULT 0,
  posthog_distinct_id TEXT
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME,
  duration_seconds INTEGER,
  pages_viewed INTEGER DEFAULT 0,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  events_tracked TEXT,
  purchase_completed INTEGER DEFAULT 0,
  cart_abandoned INTEGER DEFAULT 0,
  newsletter_signed_up INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Purchases table
CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  session_id INTEGER NOT NULL,
  purchase_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  amount REAL NOT NULL,
  currency TEXT NOT NULL,
  products TEXT,
  stripe_session_id TEXT,
  utm_campaign TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- UTM Campaigns table
CREATE TABLE IF NOT EXISTS utm_campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  utm_source TEXT NOT NULL,
  utm_medium TEXT NOT NULL,
  utm_campaign TEXT NOT NULL,
  utm_content TEXT,
  utm_term TEXT,
  target_persona TEXT,
  expected_lift_percent REAL,
  active INTEGER DEFAULT 1,
  cohort_size INTEGER DEFAULT 0,
  total_revenue REAL DEFAULT 0
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_last_activity ON users(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_users_persona ON users(persona);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_utm ON sessions(utm_campaign);
CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_campaign ON purchases(utm_campaign);
