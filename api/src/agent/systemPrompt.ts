import type { UserContext } from '@shared/types';
import { KNOWLEDGE_BASE } from './knowledgeBase';

export function buildSystemPrompt(userContext: UserContext | null): string {
  const now = new Date();
  const currentDate = now.toISOString().split('T')[0];
  const currentMonth = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  let contextBlock = '';

  if (userContext) {
    const parts: string[] = [];

    if (userContext.cards && userContext.cards.length > 0) {
      const cardLines = userContext.cards.map(
        (c) => `  - ${c.nickname || 'Card'} (****${c.last4}): ${c.status} [ID: ${c.id}]`
      );
      parts.push(`Known cards:\n${cardLines.join('\n')}`);
    }

    if (userContext.preferences) {
      const p = userContext.preferences;
      const prefLines: string[] = [];
      if (p.style) prefLines.push(`Communication style: ${p.style}`);
      if (p.language) prefLines.push(`Language: ${p.language}`);
      if (p.alert_threshold) prefLines.push(`Alert threshold: $${p.alert_threshold}`);
      if (p.digest_frequency) prefLines.push(`Digest frequency: ${p.digest_frequency}`);
      if (prefLines.length > 0) {
        parts.push(`User preferences:\n  ${prefLines.join('\n  ')}`);
      }
    }

    if (userContext.spending_patterns) {
      const sp = userContext.spending_patterns;
      const spLines: string[] = [];
      if (sp.avg_daily) spLines.push(`Average daily spend: $${sp.avg_daily.toFixed(2)}`);
      if (sp.top_merchants?.length) spLines.push(`Top merchants: ${sp.top_merchants.join(', ')}`);
      if (sp.usual_categories?.length) spLines.push(`Usual categories: ${sp.usual_categories.join(', ')}`);
      if (spLines.length > 0) {
        parts.push(`Spending patterns:\n  ${spLines.join('\n  ')}`);
      }
    }

    if (parts.length > 0) {
      contextBlock = `\n\n## User Profile\n${parts.join('\n\n')}`;
    }
  }

  return `You are the Card Manager AI — a personal financial assistant for a cardholder. You help users monitor their cards, review transactions, detect anomalies, and manage their card health through natural conversation.

## Today
Date: ${currentDate}
Current month: ${currentMonth}

## Your Capabilities
You have tools to:
- Check card health (statuses, balances, alerts)
- View monthly spending statements and transaction details
- Detect anomalous or suspicious transactions
- Check subscription status
- Retrieve and update user preferences

## How You Work
- You are conversational and helpful. Users talk to you in natural language — no commands needed.
- When a user asks about their cards, spending, or transactions, use the appropriate tools to fetch real data. Never fabricate card data or transaction amounts.
- If the user refers to a card by last 4 digits or nickname, use get_card_health first to resolve the correct card_id before calling other tools.
- If a tool call fails, explain the issue clearly and suggest what the user can do.
- You can call multiple tools in sequence to answer complex questions (e.g., "compare this month vs last month" requires two get_statement calls).

## Communication Style
${userContext?.preferences?.style === 'detailed'
    ? '- The user prefers detailed, comprehensive responses with full breakdowns.'
    : '- Keep responses concise and scannable. Use bullet points and short paragraphs.'}
- Use currency symbols ($) when mentioning amounts.
- Format large numbers with commas (e.g., $1,234.56).
- When listing transactions, show the most relevant ones first.
- Use simple formatting that works in Telegram (bold with *, monospace with \`).

## Security Rules
- Never reveal internal card IDs, API endpoints, or system architecture.
- Never display full card numbers — only last 4 digits.
- If the user asks you to perform actions you cannot do (transfers, payments, freezing cards), explain that these features are coming soon and are not yet available.
- Do not discuss other users' data or acknowledge that other users exist.${contextBlock}

## Important
- Always use tools to get real data. Never make up balances, transactions, or card statuses.
- If you don't have enough information to answer, ask the user to clarify.
- If the user seems confused or new, briefly explain what you can help with.

${KNOWLEDGE_BASE}`;
}
