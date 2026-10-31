import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import type { PortalConfig, ZoqqCardListItem, ZoqqCardTransaction, ZoqqCardholder } from '@shared/types';

// ─── Auth Token Cache ───
let cachedAuthToken: { token: string; expiresAt: number } | null = null;
const AUTH_TOKEN_BUFFER_MS = 60 * 1000; // Refresh 1 min before expiry

async function getAuthToken(cfg: PortalConfig): Promise<string> {
  if (cachedAuthToken && Date.now() < cachedAuthToken.expiresAt - AUTH_TOKEN_BUFFER_MS) {
    return cachedAuthToken.token;
  }

  const url = `${cfg.base_url_api}/hashdt/api/v1/auth/token`;
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': cfg.x_api_key,
    'x-product-id': cfg.program_id,
    'x-company-id': cfg.client_id,
    'x-user-id': cfg.personid,
    'x-request-id': uuidv4(),
  };

  const res = await axios.post(url, {}, { headers, timeout: 15000 });
  const token = res.data?.data?.token || res.data?.token;
  const expiresIn = res.data?.data?.expires_in || res.data?.expires_in || 3600;

  if (!token) {
    throw new Error('No token in auth response');
  }

  cachedAuthToken = {
    token,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  return token;
}

async function buildHeaders(cfg: PortalConfig) {
  const authToken = await getAuthToken(cfg);
  return {
    'Content-Type': 'application/json',
    'x-api-key': cfg.x_api_key,
    'x-product-id': cfg.program_id,
    'x-user-id': cfg.personid,
    'x-request-id': uuidv4(),
    'agent-code': cfg.agent_code,
    'subagent-code': cfg.subagent_code,
    'Authorization': `Bearer ${authToken}`,
  };
}

/**
 * Fetch cardholder info by email.
 */
export async function getCardholderByEmail(cfg: PortalConfig, email: string): Promise<ZoqqCardholder> {
  const headers = await buildHeaders(cfg);
  const res = await axios.get(`${cfg.base_url_api}/hashdt/issuing/api/v1/card/cardholder`, {
    headers,
    params: { email },
    timeout: 15000,
  });

  const responseData = res.data?.data;
  const raw = Array.isArray(responseData) ? responseData[0] : responseData;
  if (!raw || !raw.id) throw new Error(`Cardholder not found for email: ${email}`);

  const individual = raw.individual || {};
  const name = individual.name || {};

  return {
    cardholderId: raw.id,
    firstName: name.first_name || raw.first_name || '',
    lastName: name.last_name || raw.last_name || '',
    email: raw.email || email,
  };
}

/**
 * List all cards for a cardholder.
 */
export async function listCards(cfg: PortalConfig, cardholderId: string): Promise<ZoqqCardListItem[]> {
  const headers = await buildHeaders(cfg);
  const res = await axios.get(`${cfg.base_url_api}/zoqq/api/v1/card`, {
    headers,
    params: { cardholder_id: cardholderId },
    timeout: 15000,
  });

  const cards = res.data?.data;
  if (!cards || !Array.isArray(cards)) return [];
  return cards;
}

/**
 * Get transactions for a specific card.
 */
export async function getCardTransactions(
  cfg: PortalConfig,
  cardId: string,
  opts: { fromDate?: string; toDate?: string; page?: number; pageSize?: number } = {}
): Promise<{ transactions: ZoqqCardTransaction[]; totalCount?: number }> {
  const headers = await buildHeaders(cfg);
  const page = opts.page || 1;
  const pageSize = opts.pageSize || 100;

  const res = await axios.get(`${cfg.base_url_api}/zoqq/api/v1/card/transactions`, {
    headers,
    params: {
      card_hash_id: cardId,
      from_date: opts.fromDate,
      to_date: opts.toDate,
      page,
      page_size: pageSize,
    },
    timeout: 30000,
  });

  const data = res.data?.data;
  const transactions = Array.isArray(data) ? data : (data?.transactions || []);

  return {
    transactions,
    totalCount: data?.total_count || transactions.length,
  };
}
