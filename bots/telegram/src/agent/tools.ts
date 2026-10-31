import Anthropic from '@anthropic-ai/sdk';
import * as api from '../api';

/**
 * Tool definitions that Claude can call.
 * Each tool maps to a Card Manager API endpoint.
 */
export const toolDefinitions: Anthropic.Tool[] = [
  {
    name: 'get_card_health',
    description:
      'Get a health report for all of the user\'s cards. Returns card statuses, balances, and any active alerts (low balance, blocked cards, anomalies). Use this when the user asks about their cards, card status, balances, or wants a general overview.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_anomalies',
    description:
      'Detect unusual or suspicious transactions on a specific card over the last 30 days. Flags transactions that are 3x above average or over $500. Use when the user asks about suspicious activity, fraud, unusual charges, or anomalies on a specific card.',
    input_schema: {
      type: 'object' as const,
      properties: {
        card_id: {
          type: 'string',
          description: 'The card hash ID to check. If the user refers to a card by last 4 digits or nickname, use get_card_health first to find the correct card_id.',
        },
      },
      required: ['card_id'],
    },
  },
  {
    name: 'get_statement',
    description:
      'Get a monthly spending statement with transaction details for all cards. Returns total spent, per-card breakdowns, and individual transactions. Use when the user asks about spending, monthly summary, transactions, or statements.',
    input_schema: {
      type: 'object' as const,
      properties: {
        year: {
          type: 'number',
          description: 'The year (e.g., 2026). Defaults to current year if not specified.',
        },
        month: {
          type: 'number',
          description: 'The month (1-12). Defaults to current month if not specified.',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_subscription_status',
    description:
      'Check the user\'s Card Manager subscription status, including plan, pricing, and renewal date. Use when the user asks about their subscription, billing, plan, or payment.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_user_context',
    description:
      'Retrieve the user\'s stored context profile including known cards, preferences, spending patterns, and linked platforms. Use this to personalize responses or when you need to recall user-specific information.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'update_preferences',
    description:
      'Update the user\'s preferences for alerts, digests, language, or communication style. Use when the user wants to change how they receive information or set alert thresholds.',
    input_schema: {
      type: 'object' as const,
      properties: {
        alert_threshold: {
          type: 'number',
          description: 'Dollar amount threshold for transaction alerts (e.g., 100 means alert on transactions over $100).',
        },
        digest_frequency: {
          type: 'string',
          enum: ['daily', 'weekly', 'none'],
          description: 'How often to send spending digest summaries.',
        },
        language: {
          type: 'string',
          description: 'Preferred language code (e.g., "en", "es", "zh").',
        },
        style: {
          type: 'string',
          enum: ['brief', 'detailed'],
          description: 'Communication style preference. "brief" for short answers, "detailed" for comprehensive explanations.',
        },
      },
      required: [],
    },
  },
];

/**
 * Execute a tool call and return the result.
 */
export async function executeTool(
  toolName: string,
  toolInput: Record<string, any>,
  email: string,
  domain: string
): Promise<string> {
  try {
    switch (toolName) {
      case 'get_card_health': {
        const data = await api.getCardHealth(email, domain);
        return JSON.stringify(data, null, 2);
      }

      case 'get_anomalies': {
        const data = await api.getAnomalies(email, domain, toolInput.card_id);
        return JSON.stringify(data, null, 2);
      }

      case 'get_statement': {
        const now = new Date();
        const year = toolInput.year || now.getFullYear();
        const month = toolInput.month || now.getMonth() + 1;
        const data = await api.getStatement(email, domain, year, month);
        return JSON.stringify(data, null, 2);
      }

      case 'get_subscription_status': {
        const data = await api.getSubscription(email, domain);
        return JSON.stringify(data, null, 2);
      }

      case 'get_user_context': {
        const data = await api.getContext(email, domain);
        return JSON.stringify(data, null, 2);
      }

      case 'update_preferences': {
        const { alert_threshold, digest_frequency, language, style } = toolInput;
        const prefs: Record<string, any> = {};
        if (alert_threshold !== undefined) prefs.alert_threshold = alert_threshold;
        if (digest_frequency !== undefined) prefs.digest_frequency = digest_frequency;
        if (language !== undefined) prefs.language = language;
        if (style !== undefined) prefs.style = style;

        const client = (await import('axios')).default.create({
          baseURL: (await import('../config')).config.cmApiUrl,
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
            'x-cm-email': email,
            'x-cm-domain': domain,
          },
        });
        const res = await client.patch('/api/v1/context/preferences', prefs);
        return JSON.stringify(res.data?.data || { success: true }, null, 2);
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (err: any) {
    const msg = err?.response?.data?.error?.message || err?.message || 'Unknown error';
    const code = err?.response?.data?.error?.code || 'TOOL_ERROR';
    return JSON.stringify({ error: code, message: msg });
  }
}
