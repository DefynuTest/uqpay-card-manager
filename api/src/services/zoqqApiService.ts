import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import type { PortalConfig, ZoqqCardListItem, ZoqqCardTransaction, ZoqqCardholder } from '@shared/types';

function buildHeaders(cfg: PortalConfig) {
  return {
    'Content-Type': 'application/json',
    'x-api-key': cfg.x_api_key,
    'x-product-id': cfg.program_id,
    'x-user-id': cfg.businessId,
    'x-request-id': uuidv4(),
    'Authorization': 'Bearer internal',
  };
}

/**
 * Fetch cardholder info by email.
 */
export async function getCardholderByEmail(cfg: PortalConfig, email: string): Promise<ZoqqCardholder> {
  const res = await axios.get(`${cfg.base_url_api}/zoqq/api/v1/internal/card/cardholder`, {
    headers: buildHeaders(cfg),
    params: { email_id: email },
    timeout: 15000,
  });

  const data = res.data?.data?.[0];
  if (!data) throw new Error(`Cardholder not found for email: ${email}`);

  return {
    cardholderId: data.cardholder_id || data.cardholderId,
    firstName: data.first_name || data.firstName || '',
    lastName: data.last_name || data.lastName || '',
    email: data.email_id || data.email || email,
  };
}

/**
 * List all cards for a cardholder.
 */
export async function listCards(cfg: PortalConfig, cardholderId: string): Promise<ZoqqCardListItem[]> {
  const res = await axios.get(`${cfg.base_url_api}/zoqq/api/v1/card`, {
    headers: buildHeaders(cfg),
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
  const page = opts.page || 1;
  const pageSize = opts.pageSize || 100;

  const res = await axios.get(`${cfg.base_url_api}/zoqq/api/v1/card/transactions`, {
    headers: buildHeaders(cfg),
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
