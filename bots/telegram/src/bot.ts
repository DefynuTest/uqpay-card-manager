import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { config } from './config';
import * as sessions from './sessions';
import { runAgent, initConversationRedis, clearHistory } from './agent';

const bot = new Telegraf(config.botToken);

// Telegram MarkdownV2 requires escaping special characters
function escapeMarkdown(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

/**
 * Send a long message, splitting if necessary (Telegram 4096 char limit).
 */
async function sendMessage(chatId: number, text: string): Promise<void> {
  // Try sending as Markdown first, fall back to plain text
  const maxLen = 4000;

  if (text.length <= maxLen) {
    try {
      await bot.telegram.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch {
      // Markdown parsing failed — send as plain text
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
    // Find a good split point
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

// ─── /start ───
bot.start(async (ctx) => {
  const chatId = ctx.chat.id;
  const session = await sessions.getSession(chatId);

  if (session) {
    await sendMessage(chatId,
      `Welcome back! You're linked as *${session.email}*.\n\nJust tell me what you need — I can check your cards, review spending, detect anomalies, and more.\n\nType /reset to start a fresh conversation.`
    );
  } else {
    await sendMessage(chatId,
      `*Welcome to Card Manager* \n\n` +
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

// ─── /link <email> [domain] ───
bot.command('link', async (ctx) => {
  const args = ctx.message.text.split(/\s+/).slice(1);
  const email = args[0];
  const domain = args[1] || config.defaultDomain;

  if (!email || !email.includes('@')) {
    await sendMessage(ctx.chat.id, 'Usage: /link your@email.com [domain]');
    return;
  }

  if (!domain) {
    await sendMessage(ctx.chat.id, 'No domain configured. Use: /link your@email.com yourdomain.com');
    return;
  }

  await sessions.setSession(ctx.chat.id, email, domain);
  await clearHistory(ctx.chat.id);
  await sendMessage(ctx.chat.id,
    `Account linked to *${email}*.\n\nI'm ready to help! Try asking:\n- "How are my cards?"\n- "Show me this month's spending"\n- "Any suspicious activity?"`
  );
});

// ─── /unlink ───
bot.command('unlink', async (ctx) => {
  await sessions.removeSession(ctx.chat.id);
  await clearHistory(ctx.chat.id);
  await sendMessage(ctx.chat.id, 'Account unlinked and conversation cleared. Use /link to connect again.');
});

// ─── /reset — clear conversation history, keep session ───
bot.command('reset', async (ctx) => {
  await clearHistory(ctx.chat.id);
  await sendMessage(ctx.chat.id, 'Conversation history cleared. I still remember your account — just start a new conversation.');
});

// ─── All text messages → AI Agent ───
bot.on(message('text'), async (ctx) => {
  const chatId = ctx.chat.id;
  const text = ctx.message.text;

  // Ignore if it starts with / (unrecognized command)
  if (text.startsWith('/')) {
    await sendMessage(chatId, "I don't recognize that command. Just talk to me naturally, or use /start for help.");
    return;
  }

  // Check session
  const session = await sessions.getSession(chatId);
  if (!session) {
    await sendMessage(chatId,
      'You need to link your account first.\n\nUse: /link your@email.com'
    );
    return;
  }

  await sessions.updateActivity(chatId);

  // Show typing indicator
  await ctx.sendChatAction('typing');

  // Keep typing indicator alive during processing
  const typingInterval = setInterval(() => {
    ctx.sendChatAction('typing').catch(() => {});
  }, 4000);

  try {
    const result = await runAgent(chatId, text, session.email, session.domain);

    clearInterval(typingInterval);

    if (result.toolsUsed.length > 0) {
      console.log(`[Bot] Chat ${chatId}: "${text.slice(0, 50)}" → tools: [${result.toolsUsed.join(', ')}]`);
    }

    await sendMessage(chatId, result.text);
  } catch (err: any) {
    clearInterval(typingInterval);
    console.error(`[Bot] Agent error for chat ${chatId}:`, err.message);

    if (err.status === 429) {
      await sendMessage(chatId, "I'm getting too many requests right now. Please try again in a moment.");
    } else {
      await sendMessage(chatId, "Sorry, I ran into an issue processing your request. Please try again.");
    }
  }
});

// ─── Launch ───
async function start() {
  await sessions.initSessionRedis();
  await initConversationRedis();
  console.log('[Bot] Redis stores initialized');

  await bot.launch();
  console.log('[Bot] Card Manager AI bot is running');
  console.log(`[Bot] API endpoint: ${config.cmApiUrl}`);
  console.log(`[Bot] Claude model: ${config.claudeModel}`);
}

start().catch((err) => {
  console.error('[Bot] Failed to start:', err);
  process.exit(1);
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
