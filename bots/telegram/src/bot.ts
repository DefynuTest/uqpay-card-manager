import { Telegraf, Context } from 'telegraf';
import { config } from './config';
import * as api from './api';
import * as sessions from './sessions';
import * as fmt from './formatters';

const bot = new Telegraf(config.botToken);

// Helper: get linked session or reply with error
function requireLink(ctx: Context): { email: string; domain: string } | null {
  const chatId = ctx.chat?.id;
  if (!chatId) return null;

  const session = sessions.getSession(chatId);
  if (!session) {
    ctx.replyWithMarkdownV2(fmt.notLinkedMessage());
    return null;
  }

  sessions.updateActivity(chatId);
  return session;
}

// /start
bot.start((ctx) => {
  ctx.replyWithMarkdownV2(fmt.welcomeMessage());
});

// /help
bot.help((ctx) => {
  ctx.replyWithMarkdownV2(fmt.welcomeMessage());
});

// /link <email> [domain]
bot.command('link', (ctx) => {
  const args = ctx.message.text.split(/\s+/).slice(1);
  const email = args[0];
  const domain = args[1] || config.defaultDomain;

  if (!email || !email.includes('@')) {
    ctx.replyWithMarkdownV2('⚠️ Usage: /link your\\@email\\.com \\[domain\\]');
    return;
  }

  if (!domain) {
    ctx.replyWithMarkdownV2('⚠️ No domain configured\\. Use: /link your\\@email\\.com yourdomain\\.com');
    return;
  }

  sessions.setSession(ctx.chat.id, email, domain);
  ctx.replyWithMarkdownV2(fmt.linkedMessage(email));
});

// /unlink
bot.command('unlink', (ctx) => {
  sessions.removeSession(ctx.chat.id);
  ctx.replyWithMarkdownV2(fmt.unlinkedMessage());
});

// /status — subscription status
bot.command('status', async (ctx) => {
  const session = requireLink(ctx);
  if (!session) return;

  try {
    const data = await api.getSubscription(session.email, session.domain);
    ctx.replyWithMarkdownV2(fmt.formatSubscription(data));
  } catch (err) {
    ctx.replyWithMarkdownV2(fmt.errorMessage(err));
  }
});

// /subscribe
bot.command('subscribe', async (ctx) => {
  const session = requireLink(ctx);
  if (!session) return;

  try {
    const data = await api.subscribe(session.email, session.domain);
    ctx.replyWithMarkdownV2(`✅ *Subscribed\\!*\n\nYou now have access to Card Manager\\.\nType /health to check your cards\\.`);
  } catch (err) {
    ctx.replyWithMarkdownV2(fmt.errorMessage(err));
  }
});

// /unsubscribe
bot.command('unsubscribe', async (ctx) => {
  const session = requireLink(ctx);
  if (!session) return;

  try {
    await api.unsubscribe(session.email, session.domain);
    ctx.replyWithMarkdownV2(`🔓 Subscription cancelled\\.\nYou can re\\-subscribe anytime with /subscribe`);
  } catch (err) {
    ctx.replyWithMarkdownV2(fmt.errorMessage(err));
  }
});

// /health — card health report
bot.command('health', async (ctx) => {
  const session = requireLink(ctx);
  if (!session) return;

  try {
    ctx.replyWithMarkdownV2('🔄 Checking your cards\\.\\.\\.');
    const data = await api.getCardHealth(session.email, session.domain);
    ctx.replyWithMarkdownV2(fmt.formatHealth(data));
  } catch (err) {
    ctx.replyWithMarkdownV2(fmt.errorMessage(err));
  }
});

// /cards — list cards (uses health endpoint, shows card IDs)
bot.command('cards', async (ctx) => {
  const session = requireLink(ctx);
  if (!session) return;

  try {
    const data = await api.getCardHealth(session.email, session.domain);
    ctx.replyWithMarkdownV2(fmt.formatCards(data));
  } catch (err) {
    ctx.replyWithMarkdownV2(fmt.errorMessage(err));
  }
});

// /anomalies <cardId>
bot.command('anomalies', async (ctx) => {
  const session = requireLink(ctx);
  if (!session) return;

  const args = ctx.message.text.split(/\s+/).slice(1);
  const cardId = args[0];

  if (!cardId) {
    ctx.replyWithMarkdownV2('⚠️ Usage: /anomalies \\<card\\_id\\>\n\nUse /cards to see your card IDs\\.');
    return;
  }

  try {
    ctx.replyWithMarkdownV2('🔄 Scanning transactions\\.\\.\\.');
    const data = await api.getAnomalies(session.email, session.domain, cardId);
    ctx.replyWithMarkdownV2(fmt.formatAnomalies(data));
  } catch (err) {
    ctx.replyWithMarkdownV2(fmt.errorMessage(err));
  }
});

// /statement <year> <month>
bot.command('statement', async (ctx) => {
  const session = requireLink(ctx);
  if (!session) return;

  const args = ctx.message.text.split(/\s+/).slice(1);
  let year: number;
  let month: number;

  if (args.length >= 2) {
    year = parseInt(args[0]);
    month = parseInt(args[1]);
  } else if (args.length === 1 && args[0].includes('-')) {
    // Support YYYY-MM format
    const parts = args[0].split('-');
    year = parseInt(parts[0]);
    month = parseInt(parts[1]);
  } else {
    // Default to current month
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth() + 1;
  }

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    ctx.replyWithMarkdownV2('⚠️ Usage: /statement 2026 10 or /statement 2026\\-10');
    return;
  }

  try {
    ctx.replyWithMarkdownV2('🔄 Generating statement\\.\\.\\.');
    const data = await api.getStatement(session.email, session.domain, year, month);
    ctx.replyWithMarkdownV2(fmt.formatStatement(data));
  } catch (err) {
    ctx.replyWithMarkdownV2(fmt.errorMessage(err));
  }
});

// Catch-all for plain text messages — simple conversational handler
bot.on('text', async (ctx) => {
  const text = ctx.message.text.toLowerCase().trim();
  const session = sessions.getSession(ctx.chat.id);

  if (!session) {
    ctx.replyWithMarkdownV2(fmt.notLinkedMessage());
    return;
  }

  sessions.updateActivity(ctx.chat.id);

  // Simple keyword matching for natural language
  if (text.includes('health') || text.includes('how are my cards') || text.includes('card status')) {
    try {
      const data = await api.getCardHealth(session.email, session.domain);
      ctx.replyWithMarkdownV2(fmt.formatHealth(data));
    } catch (err) {
      ctx.replyWithMarkdownV2(fmt.errorMessage(err));
    }
    return;
  }

  if (text.includes('statement') || text.includes('spending') || text.includes('this month')) {
    try {
      const now = new Date();
      const data = await api.getStatement(session.email, session.domain, now.getFullYear(), now.getMonth() + 1);
      ctx.replyWithMarkdownV2(fmt.formatStatement(data));
    } catch (err) {
      ctx.replyWithMarkdownV2(fmt.errorMessage(err));
    }
    return;
  }

  if (text.includes('anomal') || text.includes('suspicious') || text.includes('fraud')) {
    ctx.replyWithMarkdownV2('ℹ️ To check anomalies, I need a card ID\\.\n\nUse /cards to see your cards, then /anomalies \\<card\\_id\\>');
    return;
  }

  if (text.includes('subscri') || text.includes('plan') || text.includes('billing')) {
    try {
      const data = await api.getSubscription(session.email, session.domain);
      ctx.replyWithMarkdownV2(fmt.formatSubscription(data));
    } catch (err) {
      ctx.replyWithMarkdownV2(fmt.errorMessage(err));
    }
    return;
  }

  if (text.includes('help') || text === 'hi' || text === 'hello' || text === 'hey') {
    ctx.replyWithMarkdownV2(fmt.welcomeMessage());
    return;
  }

  // Default response
  ctx.replyWithMarkdownV2(
    `I can help you with your cards\\! Try:\n\n` +
    `• "how are my cards" \\- health check\n` +
    `• "this month spending" \\- statement\n` +
    `• "subscription" \\- billing info\n` +
    `• /help \\- all commands`
  );
});

// Launch
bot.launch().then(() => {
  console.log('[TelegramBot] Card Manager bot is running');
  console.log(`[TelegramBot] API endpoint: ${config.cmApiUrl}`);
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
