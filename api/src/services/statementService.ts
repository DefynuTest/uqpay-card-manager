import type { PortalConfig, Statement } from '@shared/types';
import * as zoqq from './zoqqApiService';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export async function getStatement(
  cfg: PortalConfig,
  email: string,
  year: number,
  month: number
): Promise<Statement> {
  if (month < 1 || month > 12) throw new Error('Invalid month');

  const fromDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const toDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

  const cardholder = await zoqq.getCardholderByEmail(cfg, email);
  const cards = await zoqq.listCards(cfg, cardholder.cardholderId);
  const statementCards: Statement['cards'] = [];
  let totalSpent = 0;
  let totalTransactions = 0;

  for (const card of cards) {
    try {
      const { transactions } = await zoqq.getCardTransactions(cfg, card.card_hash_id, {
        fromDate,
        toDate,
        pageSize: 100,
      });

      const cardTotal = transactions.reduce((sum, t) => sum + Math.abs(t.billing_amount || 0), 0);
      totalSpent += cardTotal;
      totalTransactions += transactions.length;

      statementCards.push({
        card_id: card.card_hash_id,
        last4: card.masked_card_number?.slice(-4) || '****',
        nickname: card.name_on_card || 'Card',
        transaction_count: transactions.length,
        total_amount: cardTotal,
        transactions: transactions.map((t) => ({
          date: t.transaction_date,
          merchant: t.merchant?.name || 'Unknown',
          amount: t.billing_amount || 0,
          currency: t.billing_currency || 'USD',
          status: t.status || 'completed',
        })),
      });
    } catch {
      // Skip cards that fail
    }
  }

  return {
    period: `${MONTH_NAMES[month - 1]} ${year}`,
    month,
    year,
    total_cards: cards.length,
    total_transactions: totalTransactions,
    total_spent: totalSpent,
    cards: statementCards,
    generated_at: new Date().toISOString(),
  };
}
