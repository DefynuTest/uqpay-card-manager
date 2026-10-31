import Anthropic from '@anthropic-ai/sdk';
import { getPortalConfig } from '../services/portalConfigService';
import * as healthService from '../services/healthService';
import * as anomalyService from '../services/anomalyService';
import * as statementService from '../services/statementService';
import * as subscriptionService from '../services/subscriptionService';
import * as memoryStore from '../context/memoryStore';

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
          description: 'Dollar amount threshold for transaction alerts.',
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
          description: 'Communication style preference.',
        },
      },
      required: [],
    },
  },
];

/**
 * Execute a tool by calling the service layer directly (no HTTP round-trip).
 */
export async function executeTool(
  toolName: string,
  toolInput: Record<string, any>,
  email: string,
  domain: string
): Promise<string> {
  try {
    const cfg = await getPortalConfig(domain);

    switch (toolName) {
      case 'get_card_health': {
        const report = await healthService.getHealthReport(cfg, email);
        return JSON.stringify(report);
      }

      case 'get_anomalies': {
        const report = await anomalyService.getAnomalyReport(cfg, toolInput.card_id);
        return JSON.stringify(report);
      }

      case 'get_statement': {
        const now = new Date();
        const year = toolInput.year || now.getFullYear();
        const month = toolInput.month || now.getMonth() + 1;
        const statement = await statementService.getStatement(cfg, email, year, month);
        return JSON.stringify(statement);
      }

      case 'get_subscription_status': {
        const sub = await subscriptionService.getSubscription(email);
        const price = subscriptionService.getPrice();
        return JSON.stringify({ ...sub, price: price.amount, currency: price.currency });
      }

      case 'get_user_context': {
        const ctx = await memoryStore.getOrCreateContext(email);
        return JSON.stringify(ctx);
      }

      case 'update_preferences': {
        const { alert_threshold, digest_frequency, language, style } = toolInput;
        const prefs: Record<string, any> = {};
        if (alert_threshold !== undefined) prefs.alert_threshold = alert_threshold;
        if (digest_frequency !== undefined) prefs.digest_frequency = digest_frequency;
        if (language !== undefined) prefs.language = language;
        if (style !== undefined) prefs.style = style;
        const ctx = await memoryStore.updatePreferences(email, prefs);
        return JSON.stringify(ctx.preferences);
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (err: any) {
    return JSON.stringify({ error: err.message || 'Tool execution failed' });
  }
}
