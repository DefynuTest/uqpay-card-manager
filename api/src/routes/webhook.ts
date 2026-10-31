import { Router, Request, Response } from 'express';
import { Telegraf } from 'telegraf';
import { config } from '../config';
import * as sessions from '../telegram/sessions';
import { runAgent, clearHistory } from '../agent';

const router = Router();

// Lazy-initialize the bot (reused across invocations in Vercel)
let bot: Telegraf | null = null;

function getBot(): Telegraf {
  if (bot) return bot;
  bot = new Telegraf(config.telegramBotToken);
  setupHandlers(bot);
  return bot;
}

async function sendMessage(bot: Telegraf, chatId: number, text: string): Promise<void> {
  const maxLen = 4000;

  if (text.length <= maxLen) {
    try {
      await bot.telegram.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch {
      await bot.telegram.sendMessage(chatId, text);
    }
    return;
  }

  // Split long messages at paragraph boundaries
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }
    let splitAt = remaining.lastIndexOf('\n\n', maxLen);
    if (splitAt < maxLen / 2) splitAt = remaining.lastIndexOf('\n', maxLen);
    if (splitAt < maxLen / 2) splitAt = maxLen;
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }

  for (const chunk of chunks) {
    try {
      await bot.telegram.sendMessage(chatId, chunk, { parse_mode: 'Markdown' });
    } catch {
      await bot.telegram.sendMessage(chatId, chunk);
    }
  }
}

function setupHandlers(bot: Telegraf): void {
  // /start
  bot.start(async (ctx) => {
    const chatId = ctx.chat.id;
    const session = await sessions.getSession(chatId);

    if (session) {
      await sendMessage(bot, chatId,
        `Welcome back! You're linked as *${session.email}*.\n\nJust tell me what you need — I can check your cards, review spending, detect anomalies, and more.\n\nType /reset to start a fresh conversation.`
      );
    } else {
      await sendMessage(bot, chatId,
        `*Welcome to Card Manager*\n\n` +
        `I'm your personal AI card assistant. I can help you:\n` +
        `- Check card health and balances\n` +
        `- Review monthly spending\n` +
        `- Detect suspicious transactions\n` +
        `- Answer questions about your cards\n\n` +
        `To get started, link your account:\n` +
        `/link your@email.com\n\n` +
        `After linking, just talk to me naturally — no commands needed.`
      );
    }
  });

  // /link <email> [domain]
  bot.command('link', async (ctx) => {
    const args = ctx.message.text.split(/\s+/).slice(1);
    const email = args[0];
    const domain = args[1] || config.zoqq.domainName;

    if (!email || !email.includes('@')) {
      await sendMessage(bot, ctx.chat.id, 'Usage: /link your@email.com [domain]');
      return;
    }

    if (!domain) {
      await sendMessage(bot, ctx.chat.id, 'No domain configured. Use: /link your@email.com yourdomain.com');
      return;
    }

    await sessions.setSession(ctx.chat.id, email, domain);
    await clearHistory(ctx.chat.id);
    await sendMessage(bot, ctx.chat.id,
      `Account linked to *${email}*.\n\nI'm ready to help! Try asking:\n- "How are my cards?"\n- "Show me this month's spending"\n- "Any suspicious activity?"`
    );
  });

  // /unlink
  bot.command('unlink', async (ctx) => {
    await sessions.removeSession(ctx.chat.id);
    await clearHistory(ctx.chat.id);
    await sendMessage(bot, ctx.chat.id, 'Account unlinked and conversation cleared. Use /link to connect again.');
  });

  // /reset
  bot.command('reset', async (ctx) => {
    await clearHistory(ctx.chat.id);
    await sendMessage(bot, ctx.chat.id, 'Conversation history cleared. I still remember your account — just start a new conversation.');
  });

  // All text messages → AI Agent
  bot.on('message', async (ctx) => {
    if (!('text' in ctx.message)) return;
    const chatId = ctx.chat.id;
    const text = ctx.message.text;

    if (text.startsWith('/')) {
      await sendMessage(bot, chatId, "I don't recognize that command. Just talk to me naturally, or use /start for help.");
      return;
    }

    const session = await sessions.getSession(chatId);
    if (!session) {
      await sendMessage(bot, chatId, 'You need to link your account first.\n\nUse: /link your@email.com');
      return;
    }

    await sessions.updateActivity(chatId);

    try {
      const result = await runAgent(chatId, text, session.email, session.domain);

      if (result.toolsUsed.length > 0) {
        console.log(`[Webhook] Chat ${chatId}: "${text.slice(0, 50)}" -> tools: [${result.toolsUsed.join(', ')}]`);
      }

      await sendMessage(bot, chatId, result.text);
    } catch (err: any) {
      console.error(`[Webhook] Agent error for chat ${chatId}:`, err.message);

      if (err.status === 429) {
        await sendMessage(bot, chatId, "I'm getting too many requests right now. Please try again in a moment.");
      } else {
        await sendMessage(bot, chatId, "Sorry, I ran into an issue processing your request. Please try again.");
      }
    }
  });
}

/**
 * POST /webhook/telegram — receives Telegram updates.
 */
router.post('/telegram', async (req: Request, res: Response) => {
  try {
    const telegrafBot = getBot();
    await telegrafBot.handleUpdate(req.body);
    res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('[Webhook] Error handling update:', err.message);
    res.status(200).json({ ok: true }); // Always 200 so Telegram doesn't retry
  }
});

/**
 * GET /webhook/setup — one-time call to register the webhook URL with Telegram.
 */
router.get('/setup', async (_req: Request, res: Response) => {
  if (!config.webhookBaseUrl) {
    return res.status(400).json({ error: 'WEBHOOK_BASE_URL not configured' });
  }

  const webhookUrl = `${config.webhookBaseUrl}/webhook/telegram`;

  try {
    const telegrafBot = getBot();
    await telegrafBot.telegram.setWebhook(webhookUrl);
    res.json({ success: true, webhook_url: webhookUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
