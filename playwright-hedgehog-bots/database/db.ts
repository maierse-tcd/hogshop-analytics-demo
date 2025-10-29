import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'hedgehog_bots.db');

export const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

export interface User {
  id?: number;
  email: string;
  name: string;
  persona: string;
  created_at?: string;
  first_login_at?: string;
  last_login_at?: string;
  last_activity_at?: string;
  status?: string;
  churned_at?: string;
  reactivation_utm_campaign?: string;
  reactivation_utm_source?: string;
  reactivation_utm_medium?: string;
  reactivated_at?: string;
  total_purchases?: number;
  total_spent?: number;
  newsletter_subscribed?: number;
  cart_abandoned_count?: number;
  session_count?: number;
  posthog_distinct_id?: string;
}

export interface Session {
  id?: number;
  user_id: number;
  started_at?: string;
  ended_at?: string;
  duration_seconds?: number;
  pages_viewed?: number;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  events_tracked?: string;
  purchase_completed?: number;
  cart_abandoned?: number;
  newsletter_signed_up?: number;
}

export interface Purchase {
  id?: number;
  user_id: number;
  session_id: number;
  purchase_date?: string;
  amount: number;
  currency: string;
  products?: string;
  stripe_session_id?: string;
  utm_campaign?: string;
}

export interface UTMCampaign {
  id?: number;
  name: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content?: string;
  utm_term?: string;
  target_persona?: string;
  expected_lift_percent?: number;
  active?: number;
  cohort_size?: number;
  total_revenue?: number;
}

// User operations
export const createUser = (user: User): number => {
  const stmt = db.prepare(`
    INSERT INTO users (email, name, persona, created_at, status)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP, 'active')
  `);
  const result = stmt.run(user.email, user.name, user.persona);
  return result.lastInsertRowid as number;
};

export const getUserById = (id: number): User | undefined => {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  return stmt.get(id) as User | undefined;
};

export const getUserByEmail = (email: string): User | undefined => {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  return stmt.get(email) as User | undefined;
};

export const updateUser = (id: number, updates: Partial<User>): void => {
  const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = Object.values(updates);
  const stmt = db.prepare(`UPDATE users SET ${fields} WHERE id = ?`);
  stmt.run(...values, id);
};

export const getRandomUser = (persona?: string): User | undefined => {
  if (persona) {
    const stmt = db.prepare('SELECT * FROM users WHERE persona = ? AND status = "active" ORDER BY RANDOM() LIMIT 1');
    return stmt.get(persona) as User | undefined;
  }
  const stmt = db.prepare('SELECT * FROM users WHERE status = "active" ORDER BY RANDOM() LIMIT 1');
  return stmt.get() as User | undefined;
};

// Session operations
export const createSession = (session: Session): number => {
  const stmt = db.prepare(`
    INSERT INTO sessions (user_id, started_at, utm_source, utm_medium, utm_campaign, utm_content, utm_term)
    VALUES (?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    session.user_id,
    session.utm_source,
    session.utm_medium,
    session.utm_campaign,
    session.utm_content,
    session.utm_term
  );
  return result.lastInsertRowid as number;
};

export const updateSession = (id: number, updates: Partial<Session>): void => {
  const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = Object.values(updates);
  const stmt = db.prepare(`UPDATE sessions SET ${fields} WHERE id = ?`);
  stmt.run(...values, id);
};

// Purchase operations
export const createPurchase = (purchase: Purchase): number => {
  const stmt = db.prepare(`
    INSERT INTO purchases (user_id, session_id, amount, currency, products, stripe_session_id, utm_campaign, purchase_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
  const result = stmt.run(
    purchase.user_id,
    purchase.session_id,
    purchase.amount,
    purchase.currency,
    purchase.products,
    purchase.stripe_session_id,
    purchase.utm_campaign
  );
  return result.lastInsertRowid as number;
};

// UTM Campaign operations
export const getUTMCampaign = (name: string): UTMCampaign | undefined => {
  const stmt = db.prepare('SELECT * FROM utm_campaigns WHERE name = ?');
  return stmt.get(name) as UTMCampaign | undefined;
};

export const updateUTMCampaign = (name: string, updates: Partial<UTMCampaign>): void => {
  const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = Object.values(updates);
  const stmt = db.prepare(`UPDATE utm_campaigns SET ${fields} WHERE name = ?`);
  stmt.run(...values, name);
};

// Churn operations
export const getChurnedUsers = (): User[] => {
  const stmt = db.prepare(`
    SELECT * FROM users 
    WHERE status = 'active' 
    AND total_purchases > 0 
    AND last_activity_at < datetime('now', '-30 days')
  `);
  return stmt.all() as User[];
};

export const getReactivationCandidates = (): User[] => {
  const stmt = db.prepare(`
    SELECT * FROM users 
    WHERE status = 'churned' 
    AND churned_at BETWEEN datetime('now', '-14 days') AND datetime('now', '-7 days')
    AND reactivation_utm_campaign IS NOT NULL
  `);
  return stmt.all() as User[];
};

export default db;
