import { z } from 'zod';
import { chat, listModels, getUsage, healthCheck } from './client.js';
import { log } from '../identity/logger.js';

export const bankrTools = {
  askjeev_think: {
    description:
      'Route a general reasoning task through Bankr LLM Gateway (20+ models). ' +
      'Inference is paid with USDC — part of AskJeev\'s self-sustaining economic loop. ' +
      'Use private_analyze for sensitive financial data instead.',
    schema: z.object({
      prompt: z.string().describe('The task or question to reason about'),
      model: z.string().optional().describe('Model to use (default: gemini-2.5-flash). Options: claude-sonnet-4.6, gpt-5-mini, gemini-2.5-pro, etc.'),
      systemPrompt: z.string().optional().describe('System prompt override'),
    }),
    handler: async ({ prompt, model, systemPrompt }: {
      prompt: string;
      model?: string;
      systemPrompt?: string;
    }) => {
      const messages = [
        {
          role: 'system' as const,
          content: systemPrompt || 'You are AskJeev, an autonomous agent butler. Be concise and actionable.',
        },
        { role: 'user' as const, content: prompt },
      ];

      const response = await chat(messages, { model });

      await log('llm_reasoning', 'askjeev_think', {
        model: model || 'gemini-2.5-flash',
        promptLength: prompt.length,
      }, {
        tokensUsed: response.usage.total_tokens,
        finishReason: response.choices[0].finish_reason,
      });

      return {
        content: response.choices[0].message.content,
        model: response.model,
        usage: response.usage,
        funding: 'bankr-usdc',
      };
    },
  },

  check_llm_credits: {
    description: 'Check Bankr LLM credit usage and remaining balance.',
    schema: z.object({
      days: z.number().optional().describe('Number of days to check (default: 30)'),
    }),
    handler: async ({ days }: { days?: number }) => {
      const usage = await getUsage(days);
      await log('credits_checked', 'check_llm_credits', { days: days || 30 }, usage);
      return usage;
    },
  },

  list_llm_models: {
    description: 'List all available LLM models on Bankr Gateway (20+ models from Anthropic, OpenAI, Google, etc.).',
    schema: z.object({}),
    handler: async () => {
      const models = await listModels();
      return { models, count: models.length };
    },
  },
};
