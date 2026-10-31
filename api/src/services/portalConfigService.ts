import axios from 'axios';
import { config } from '../config';
import type { PortalConfig } from '@shared/types';

interface CacheEntry {
  data: PortalConfig;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 min

/**
 * Fetch portal config from ZOQQ config API.
 * Returns only the fields Card Manager needs.
 */
export async function getPortalConfig(domain: string): Promise<PortalConfig> {
  const now = Date.now();
  const cached = cache.get(domain);
  if (cached && now < cached.expiresAt) return cached.data;

  const res = await axios.post(
    config.zoqq.configBaseUrl,
    { domain_name: domain },
    {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.zoqq.configXApiKey,
      },
      timeout: 15000,
    }
  );

  const raw = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
  let full: any = null;

  if (raw?.domain_name) {
    full = raw;
  } else {
    const nested = raw?.data || raw?.result || raw?.body;
    if (Array.isArray(nested) && nested.length > 0) full = nested[0];
    else if (nested?.domain_name) full = nested;
  }

  if (!full?.domain_name) {
    throw new Error(`Invalid portal config for domain: ${domain}`);
  }

  const portalConfig: PortalConfig = {
    domain_name: full.domain_name,
    base_url_api: full.base_url_api,
    x_api_key: full.x_api_key,
    program_id: full.program_code || full.program_id,
    businessId: full.businessId,
    agent_code: full.agent_code || '',
    subagent_code: full.subagent_code || '',
    client_id: full.client_id || '',
    personid: full.personid || '',
  };

  cache.set(domain, { data: portalConfig, expiresAt: now + CACHE_TTL });
  return portalConfig;
}

export function clearCache(domain?: string) {
  if (domain) cache.delete(domain);
  else cache.clear();
}
