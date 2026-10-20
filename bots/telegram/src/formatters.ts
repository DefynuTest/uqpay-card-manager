/**
 * Telegram message formatters.
 * All output uses MarkdownV2 escaping for Telegram.
 */

// Characters that must be escaped in MarkdownV2
function esc(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

export function welcomeMessage(): string {
  return [
    `*Card Manager Bot* 🏦`,
    ``,
    `Your personal card management assistant\\.`,
    ``,
    `*Commands:*`,
    `/link \\<email\\> \\- Link your account`,
    `/status \\- Subscription status`,
    `/health \\- Card health report`,
    `/cards \\- List your cards`,
    `/anomalies \\<card\\_id\\> \\- Check anomalies`,
    `/statement \\<YYYY\\> \\<MM\\> \\- Monthly statement`,
    `/subscribe \\- Activate subscription`,
    `/unsubscribe \\- Cancel subscription`,
    `/unlink \\- Disconnect account`,
    `/help \\- Show this message`,
  ].join('\n');
}

export function linkedMessage(email: string): string {
  return `✅ Account linked to *${esc(email)}*\\.\n\nType /health to check your cards\\.`;
}

export function unlinkedMessage(): string {
  return `🔓 Account unlinked\\. Use /link to connect again\\.`;
}

export function notLinkedMessage(): string {
  return `⚠️ No account linked\\.\n\nUse /link \\<your\\-email\\> to connect your cardholder account\\.`;
}

export function formatSubscription(data: any): string {
  if (!data) return `❌ Could not fetch subscription info\\.`;

  const status = data.status === 'active' ? '✅ Active' : data.status === 'cancelled' ? '❌ Cancelled' : '⏳ None';
  const lines = [
    `*Subscription Status*`,
    ``,
    `Status: *${esc(status)}*`,
  ];

  if (data.subscribed_at) {
    lines.push(`Since: ${esc(new Date(data.subscribed_at).toLocaleDateString())}`);
  }
  if (data.current_period_end) {
    lines.push(`Renews: ${esc(new Date(data.current_period_end).toLocaleDateString())}`);
  }
  if (data.price) {
    lines.push(`Price: \\$${esc(String(data.price))}/mo`);
  }

  return lines.join('\n');
}

export function formatHealth(data: any): string {
  if (!data) return `❌ Could not fetch health report\\.`;

  const lines = [
    `*Card Health Report* 🏥`,
    ``,
    `Total Cards: *${data.total_cards}*`,
    `Active Alerts: *${data.total_alerts}*`,
    ``,
  ];

  if (data.cards && data.cards.length > 0) {
    for (const card of data.cards) {
      const statusIcon = card.status?.toLowerCase() === 'active' ? '🟢' : '🔴';
      lines.push(`${statusIcon} *${esc(card.nickname)}* \\(\\*\\*\\*\\*${esc(card.last4)}\\)`);
      lines.push(`   Status: ${esc(card.status)}`);

      if (card.alerts && card.alerts.length > 0) {
        for (const alert of card.alerts) {
          lines.push(`   ⚠️ ${esc(alert.message)}`);
        }
      }
      lines.push(``);
    }
  } else {
    lines.push(`No cards found\\.`);
  }

  return lines.join('\n');
}

export function formatCards(data: any): string {
  if (!data || !data.cards || data.cards.length === 0) {
    return `No cards found\\.`;
  }

  const lines = [`*Your Cards* 💳`, ``];

  for (let i = 0; i < data.cards.length; i++) {
    const card = data.cards[i];
    const statusIcon = card.status?.toLowerCase() === 'active' ? '🟢' : '🔴';
    lines.push(`${i + 1}\\. ${statusIcon} *${esc(card.nickname)}* \\(\\*\\*\\*\\*${esc(card.last4)}\\)`);
    lines.push(`   ID: \`${esc(card.card_id)}\``);
    lines.push(`   Status: ${esc(card.status)}`);
    lines.push(``);
  }

  lines.push(`_Use /anomalies \\<card\\_id\\> to check a card_`);
  return lines.join('\n');
}

export function formatAnomalies(data: any): string {
  if (!data) return `❌ Could not fetch anomaly report\\.`;

  const lines = [
    `*Anomaly Report* 🔍`,
    ``,
    `Card: \`${esc(data.card_id)}\``,
    `Period: Last ${data.period_days} days`,
    `Transactions scanned: *${data.total_transactions}*`,
    `Anomalies found: *${data.anomalies?.length || 0}*`,
    ``,
  ];

  if (data.anomalies && data.anomalies.length > 0) {
    for (const a of data.anomalies) {
      const icon = a.severity === 'high' ? '🔴' : '🟡';
      lines.push(`${icon} *${esc(a.type)}*`);
      lines.push(`   ${esc(a.message)}`);
      lines.push(`   Merchant: ${esc(a.merchant)} \\| Date: ${esc(a.date)}`);
      lines.push(``);
    }
  } else {
    lines.push(`✅ No anomalies detected\\. Your card activity looks normal\\.`);
  }

  return lines.join('\n');
}

export function formatStatement(data: any): string {
  if (!data) return `❌ Could not fetch statement\\.`;

  const lines = [
    `*Monthly Statement* 📄`,
    ``,
    `Period: *${esc(data.period)}*`,
    `Total Cards: ${data.total_cards}`,
    `Total Transactions: *${data.total_transactions}*`,
    `Total Spent: *\\$${esc(data.total_spent?.toFixed(2) || '0.00')}*`,
    ``,
  ];

  if (data.cards && data.cards.length > 0) {
    for (const card of data.cards) {
      lines.push(`💳 *${esc(card.nickname)}* \\(\\*\\*\\*\\*${esc(card.last4)}\\)`);
      lines.push(`   Transactions: ${card.transaction_count} \\| Total: \\$${esc(card.total_amount?.toFixed(2) || '0.00')}`);

      if (card.transactions && card.transactions.length > 0) {
        const shown = card.transactions.slice(0, 5);
        for (const tx of shown) {
          const sign = tx.amount < 0 ? '\\-' : '';
          lines.push(`   • ${esc(tx.date?.split('T')[0] || '')} \\| ${esc(tx.merchant)} \\| ${sign}\\$${esc(Math.abs(tx.amount).toFixed(2))}`);
        }
        if (card.transactions.length > 5) {
          lines.push(`   _\\.\\.\\.and ${card.transactions.length - 5} more_`);
        }
      }
      lines.push(``);
    }
  }

  return lines.join('\n');
}

export function errorMessage(err: any): string {
  const msg = err?.response?.data?.error?.message || err?.message || 'Unknown error';
  const code = err?.response?.data?.error?.code || 'ERROR';
  return `❌ *${esc(code)}*\n${esc(msg)}`;
}
