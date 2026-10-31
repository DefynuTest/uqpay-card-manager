import { config } from '../config';
import type { PortalConfig } from '@shared/types';

/**
 * Returns portal config from environment variables.
 * No API call — credentials are loaded at startup from env / secrets.
 */
export async function getPortalConfig(_domain?: string): Promise<PortalConfig> {
  if (!config.zoqq.baseUrlApi) {
    throw new Error('ZOQQ_BASE_URL_API is not configured');
  }

  return {
    domain_name: config.zoqq.domainName,
    base_url_api: config.zoqq.baseUrlApi,
    x_api_key: config.zoqq.xApiKey,
    program_id: config.zoqq.programId,
    businessId: config.zoqq.businessId,
    agent_code: config.zoqq.agentCode,
    subagent_code: config.zoqq.subagentCode,
    client_id: config.zoqq.clientId,
    personid: config.zoqq.personId,
  };
}
