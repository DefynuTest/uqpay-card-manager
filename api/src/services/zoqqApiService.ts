import axios, { AxiosRequestConfig } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import type { PortalConfig, ZoqqCardListItem, ZoqqCardTransaction, ZoqqCardholder } from '@shared/types';

// ─── Auth Token Cache ───
let cachedAuthToken: { token: string; expiresAt: number } | null = null;
const AUTH_TOKEN_BUFFER_MS = 60 * 1000;

/**
 * Make an API call — routes through static IP proxy if configured,
 * otherwise calls directly.
 */
async function proxyRequest(
  method: string,
  url: string,
  headers: Record<string, string>,
  params?: Record<string, any>,
  data?: any,
  timeout: number = 15000
): Promise<any> {
  if (config.proxy.url && config.proxy.secret) {
    // Route through static IP proxy
    const fullUrl = params
      ? `${url}?${new URLSearchParams(params as Record<string, string>).toString()}`
      : url;

    const res = await axios.post(
      `${config.proxy.url}/proxy`,
      {
        url: fullUrl,
        method: method.toUpperCase(),
        headers,
        body: data || undefined,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-proxy-secret': config.proxy.secret,
        },
        timeout: timeout + 5000, // Extra buffer for proxy hop
      }
    );
    return res;
  }

  // Direct call (no proxy)
  const axiosConfig: AxiosRequestConfig = {
    method,
    url,
    headers,
    params,
    data,
    timeout,
  };
  return axios(axiosConfig);
}

async function getAuthToken(cfg: PortalConfig): Promise<string> {
  if (cachedAuthToken && Date.now() < cachedAuthToken.expiresAt - AUTH_TOKEN_BUFFER_MS) {
    return cachedAuthToken.token;
  }

  const url = `${cfg.base_url_api}/hashdt/api/v1/auth/token`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': cfg.x_api_key,
    'x-product-id': cfg.program_id,
    'x-company-id': cfg.client_id,
    'x-user-id': cfg.personid,
    'x-request-id': uuidv4(),
  };

  const res = await proxyRequest('POST', url, headers);
  const token = res.data?.data?.token || res.data?.token;
  const expiresIn = res.data?.data?.expires_in || res.data?.expires_in || 3600;

  if (!token) {
    throw new Error('No token in auth response');
  }

  cachedAuthToken = {
    token,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  console.log('[ZOQQ] Auth token fetched, expires in', expiresIn, 's');
  return token;
}

async function buildHeaders(cfg: PortalConfig): Promise<Record<string, string>> {
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
  const res = await proxyRequest(
    'GET',
    `${cfg.base_url_api}/hashdt/issuing/api/v1/card/cardholder`,
    headers,
    { email }
  );

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
  const res = await proxyRequest(
    'GET',
    `${cfg.base_url_api}/zoqq/api/v1/card`,
    headers,
    { cardholder_id: cardholderId }
  );

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
  const params: Record<string, any> = {
    card_hash_id: cardId,
    page: opts.page || 1,
    page_size: opts.pageSize || 100,
  };
  if (opts.fromDate) params.from_date = opts.fromDate;
  if (opts.toDate) params.to_date = opts.toDate;

  const res = await proxyRequest(
    'GET',
    `${cfg.base_url_api}/zoqq/api/v1/card/transactions`,
    headers,
    params,
    undefined,
    30000
  );

  const data = res.data?.data;
  const transactions = Array.isArray(data) ? data : (data?.transactions || []);

  return {
    transactions,
    totalCount: data?.total_count || transactions.length,
  };
}
