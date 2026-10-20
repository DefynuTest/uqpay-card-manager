// ─── Subscription ───
export interface Subscription {
  status: 'none' | 'active' | 'cancelled';
  email: string;
  subscribed_at?: string;
  current_period_end?: string;
  cancelled_at?: string;
}

// ─── Card Health ───
export interface CardHealthItem {
  card_id: string;
  last4: string;
  nickname: string;
  status: string;
  balance: number;
  alerts: Alert[];
}

export interface Alert {
  type: 'low_balance' | 'card_blocked' | 'anomaly';
  severity: 'info' | 'warning' | 'high';
  message: string;
  card_id: string;
}

export interface HealthReport {
  total_cards: number;
  total_alerts: number;
  cards: CardHealthItem[];
  alerts: Alert[];
  generated_at: string;
}

// ─── Anomaly ───
export interface Anomaly {
  transaction_id: string;
  type: 'high_amount' | 'large_transaction';
  severity: 'medium' | 'high';
  message: string;
  amount: number;
  merchant: string;
  date: string;
}

export interface AnomalyReport {
  card_id: string;
  period_days: number;
  total_transactions: number;
  anomalies: Anomaly[];
  generated_at: string;
}

// ─── Statement ───
export interface StatementTransaction {
  date: string;
  merchant: string;
  amount: number;
  currency: string;
  status: string;
}

export interface StatementCard {
  card_id: string;
  last4: string;
  nickname: string;
  transaction_count: number;
  total_amount: number;
  transactions: StatementTransaction[];
}

export interface Statement {
  period: string;
  month: number;
  year: number;
  total_cards: number;
  total_transactions: number;
  total_spent: number;
  cards: StatementCard[];
  generated_at: string;
}

// ─── ZOQQ API types (from card service) ───
export interface ZoqqCardListItem {
  card_hash_id: string;
  card_status: string;
  masked_card_number: string;
  cardholder_id: string;
  created_at: string;
  name_on_card: string;
  card_type: string;
  currency: string;
}

export interface ZoqqCardTransaction {
  card_id: string;
  masked_card_number: string;
  transaction_id: string;
  transaction_type: string;
  transaction_amount: number;
  transaction_currency: string;
  transaction_date: string;
  auth_code: string;
  billing_amount: number;
  billing_currency: string;
  status: string;
  card_available_balance: number;
  merchant: {
    name: string;
    category_code: string;
    city: string;
    country: string;
  };
  fee_details: any[];
}

export interface ZoqqCardholder {
  cardholderId: string;
  firstName: string;
  lastName: string;
  email: string;
}

// ─── Portal Config (fields needed by Card Manager) ───
export interface PortalConfig {
  domain_name: string;
  base_url_api: string;
  x_api_key: string;
  program_id: string;
  businessId: string;
  agent_code: string;
  subagent_code: string;
}

// ─── Context Memory ───
export interface UserContext {
  email: string;
  cards: Array<{ id: string; last4: string; nickname: string; status: string }>;
  preferences: {
    alert_threshold?: number;
    digest_frequency?: 'daily' | 'weekly' | 'none';
    language?: string;
    style?: 'brief' | 'detailed';
  };
  spending_patterns: {
    avg_daily?: number;
    top_merchants?: string[];
    usual_categories?: string[];
  };
  linked_platforms: {
    telegram?: { chat_id: string; linked_at: string };
    whatsapp?: { phone: string; linked_at: string };
  };
  last_interaction?: string;
  created_at: string;
  updated_at: string;
}
