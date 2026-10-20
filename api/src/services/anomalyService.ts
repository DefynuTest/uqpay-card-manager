import type { PortalConfig, Anomaly, AnomalyReport } from '@shared/types';
import * as zoqq from './zoqqApiService';

export async function getAnomalyReport(cfg: PortalConfig, cardId: string): Promise<AnomalyReport> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { transactions } = await zoqq.getCardTransactions(cfg, cardId, {
    fromDate: thirtyDaysAgo.toISOString().split('T')[0],
    toDate: now.toISOString().split('T')[0],
    pageSize: 100,
  });

  const anomalies: Anomaly[] = [];

  if (transactions.length > 0) {
    const amounts = transactions.map((t) => Math.abs(t.billing_amount || 0));
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;

    for (const tx of transactions) {
      const amount = Math.abs(tx.billing_amount || 0);
      const merchantName = tx.merchant?.name || 'Unknown';

      if (avg > 0 && amount > avg * 3) {
        anomalies.push({
          transaction_id: tx.transaction_id,
          type: 'high_amount',
          severity: 'high',
          message: `Unusually high transaction: $${amount.toFixed(2)} (avg: $${avg.toFixed(2)})`,
          amount,
          merchant: merchantName,
          date: tx.transaction_date,
        });
      }

      if (amount > 500) {
        anomalies.push({
          transaction_id: tx.transaction_id,
          type: 'large_transaction',
          severity: 'medium',
          message: `Large transaction: $${amount.toFixed(2)}`,
          amount,
          merchant: merchantName,
          date: tx.transaction_date,
        });
      }
    }
  }

  return {
    card_id: cardId,
    period_days: 30,
    total_transactions: transactions.length,
    anomalies,
    generated_at: new Date().toISOString(),
  };
}
