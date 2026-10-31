import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import { toolDefinitions, executeTool } from './tools';
import { buildSystemPrompt } from './systemPrompt';
import { getHistory, appendTurn } from './conversationStore';
import * as memoryStore from '../context/memoryStore';
import type { UserContext } from '@shared/types';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: config.anthropicApiKey });
  }
  return client;
}

interface AgentResponse {
  text: string;
  toolsUsed: string[];
}

export async function runAgent(
  chatId: number,
  userText: string,
  email: string,
  domain: string
): Promise<AgentResponse> {
  const anthropic = getClient();

  // Load user context for personalized system prompt
  let userContext: UserContext | null = null;
  try {
    userContext = await memoryStore.getContext(email);
  } catch {
    // Proceed without personalization
  }

  const systemPrompt = buildSystemPrompt(userContext);
  const history = await getHistory(chatId);

  const userMessage: Anthropic.MessageParam = {
    role: 'user',
    content: userText,
  };

  let currentMessages: Anthropic.MessageParam[] = [...history, userMessage];
  const toolsUsed: string[] = [];
  let roundtrips = 0;

  while (roundtrips < config.maxToolRoundtrips) {
    const response = await anthropic.messages.create({
      model: config.claudeModel,
      max_tokens: 2048,
      system: systemPrompt,
      tools: toolDefinitions,
      messages: currentMessages,
    });

    const hasToolUse = response.content.some((block) => block.type === 'tool_use');

    if (!hasToolUse || response.stop_reason === 'end_turn') {
      const textBlocks = response.content.filter(
        (block): block is Anthropic.TextBlock => block.type === 'text'
      );
      const text = textBlocks.map((b) => b.text).join('\n') || "I couldn't generate a response. Please try again.";

      await appendTurn(chatId, userMessage, { role: 'assistant', content: text });
      return { text, toolsUsed };
    }

    // Process tool calls
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type === 'tool_use') {
        console.log(`[Agent] Tool call: ${block.name}`, JSON.stringify(block.input));
        toolsUsed.push(block.name);

        const result = await executeTool(block.name, block.input as Record<string, any>, email, domain);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result,
        });
      }
    }

    currentMessages = [
      ...currentMessages,
      { role: 'assistant', content: response.content },
      { role: 'user', content: toolResults },
    ];

    roundtrips++;
  }

  const fallbackText = "I've gathered the information but hit a processing limit. Please ask your question again.";
  await appendTurn(chatId, userMessage, { role: 'assistant', content: fallbackText });
  return { text: fallbackText, toolsUsed };
}
