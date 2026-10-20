import type { PortalConfig, HealthReport, Alert, CardHealthItem } from '@shared/types';
import * as zoqq from './zoqqApiService';

export async function getHealthReport(cfg: PortalConfig, email: string): Promise<HealthReport> {
  const cardholder = await zoqq.getCardholderByEmail(cfg, email);
  const cards = await zoqq.listCards(cfg, cardholder.cardholderId);

  const alerts: Alert[] = [];
  const cardHealthItems: CardHealthItem[] = [];

  for (const card of cards) {
    const item: CardHealthItem = {
      card_id: card.card_hash_id,
      last4: card.masked_card_number?.slice(-4) || '****',
      nickname: card.name_on_card || 'Card',
      status: card.card_status,
      balance: 0,
      alerts: [],
    };

    if (item.status?.toLowerCase() === 'blocked' || item.status?.toLowerCase() === 'inactive') {
      const alert: Alert = {
        type: 'card_blocked',
        severity: 'info',
        message: 'Card is currently blocked/inactive',
        card_id: item.card_id,
      };
      item.alerts.push(alert);
      alerts.push(alert);
    }

    cardHealthItems.push(item);
  }

  return {
    total_cards: cards.length,
    total_alerts: alerts.length,
    cards: cardHealthItems,
    alerts,
    generated_at: new Date().toISOString(),
  };
}
