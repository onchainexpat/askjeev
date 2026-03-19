import { z } from 'zod';
import { analyzePrivately, privateReason, listModels } from './client.js';
import { log } from '../identity/logger.js';

export const veniceTools = {
  private_analyze: {
    description:
      'Analyze sensitive financial data using Venice AI (zero data retention). ' +
      'Use this for portfolio analysis, wallet positions, trading signals, or any ' +
      'task involving private financial information.',
    schema: z.object({
      prompt: z.string().describe('What to analyze'),
      context: z.string().optional().describe('Sensitive data context (wallet balances, positions, etc.)'),
    }),
    handler: async ({ prompt, context }: { prompt: string; context?: string }) => {
      const result = await analyzePrivately(prompt, context);

      await log('private_analysis', 'private_analyze', {
        prompt: prompt.slice(0, 100) + '...',
        hasContext: !!context,
        // Note: we deliberately do NOT log the context — that's the point of privacy
      }, { responseLength: result.length });

      return { analysis: result, privacy: 'venice-zero-retention' };
    },
  },

  private_reason: {
    description:
      'Send a raw chat completion to Venice AI with full control over model and parameters. ' +
      'No data is retained by Venice after the response.',
    schema: z.object({
      messages: z.array(z.object({
        role: z.enum(['system', 'user', 'assistant']),
        content: z.string(),
      })).describe('Chat messages'),
      model: z.string().optional().describe('Venice model (default: llama-3.3-70b)'),
      webSearch: z.boolean().optional().describe('Enable web search'),
    }),
    handler: async ({ messages, model, webSearch }: {
      messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
      model?: string;
      webSearch?: boolean;
    }) => {
      const response = await privateReason(messages, { model, webSearch });

      await log('private_reasoning', 'private_reason', {
        model: model || 'llama-3.3-70b',
        messageCount: messages.length,
        webSearch: !!webSearch,
      }, {
        tokensUsed: response.usage.total_tokens,
      });

      return {
        content: response.choices[0].message.content,
        model: response.model,
        usage: response.usage,
        privacy: 'venice-zero-retention',
      };
    },
  },

  list_venice_models: {
    description: 'List available Venice AI models for private reasoning.',
    schema: z.object({}),
    handler: async () => {
      const models = await listModels();
      return { models, count: models.length };
    },
  },
};
