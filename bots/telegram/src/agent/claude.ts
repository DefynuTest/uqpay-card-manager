import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import { toolDefinitions, executeTool } from './tools';
import { buildSystemPrompt } from './systemPrompt';
import { getHistory, appendTurn } from './conversationStore';
import * as api from '../api';
import type { UserContext } from '../../../../shared/types';

const client = new Anthropic({ apiKey: config.anthropicApiKey });

interface AgentResponse {
  text: string;
  toolsUsed: string[];
}

/**
 * Run the AI agent for a user message.
 * Implements the agentic loop: send message → handle tool calls → continue until text response.
 */
export async function runAgent(
  chatId: number,
  userText: string,
  email: string,
  domain: string
): Promise<AgentResponse> {
  // Load user context for personalized system prompt
  let userContext: UserContext | null = null;
  try {
    userContext = await api.getContext(email, domain);
  } catch {
    // Context not available — proceed without personalization
  }

  const systemPrompt = buildSystemPrompt(userContext);

  // Load conversation history
  const history = await getHistory(chatId);

  // Build messages: history + new user message
  const userMessage: Anthropic.MessageParam = {
    role: 'user',
    content: userText,
  };

  const messages: Anthropic.MessageParam[] = [...history, userMessage];

  const toolsUsed: string[] = [];
  let roundtrips = 0;

  // Agentic loop
  let currentMessages = messages;

  while (roundtrips < config.maxToolRoundtrips) {
    const response = await client.messages.create({
      model: config.claudeModel,
      max_tokens: 2048,
      system: systemPrompt,
      tools: toolDefinitions,
      messages: currentMessages,
    });

    // Check if the response contains tool use
    const hasToolUse = response.content.some((block) => block.type === 'tool_use');

    if (!hasToolUse || response.stop_reason === 'end_turn') {
      // Extract text response
      const textBlocks = response.content.filter(
        (block): block is Anthropic.TextBlock => block.type === 'text'
      );
      const text = textBlocks.map((b) => b.text).join('\n') || "I couldn't generate a response. Please try again.";

      // Save conversation turn (user message + final assistant message)
      const assistantMessage: Anthropic.MessageParam = {
        role: 'assistant',
        content: text,
      };
      await appendTurn(chatId, userMessage, assistantMessage);

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

    // Continue the conversation with tool results
    currentMessages = [
      ...currentMessages,
      { role: 'assistant', content: response.content },
      { role: 'user', content: toolResults },
    ];

    roundtrips++;
  }

  // Safety: if we hit max roundtrips
  const fallbackText = "I've gathered the information but hit a processing limit. Let me summarize what I found — please ask your question again and I'll respond directly.";

  await appendTurn(chatId, userMessage, { role: 'assistant', content: fallbackText });

  return { text: fallbackText, toolsUsed };
}
