import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config.js', () => ({
  BANKR_LLM_BASE: 'https://llm.bankr.bot',
  BANKR_API_KEY: 'bk_test_key',
}));

describe('Bankr Module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('chat', () => {
    it('sends OpenAI-compatible request to Bankr', async () => {
      const mockResponse = {
        id: 'bankr-123',
        model: 'gemini-2.5-flash',
        choices: [{ message: { role: 'assistant', content: 'Hello!' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      }) as any;

      const { chat } = await import('../../src/modules/bankr/client.js');
      const result = await chat([{ role: 'user', content: 'Hi' }]);

      expect(result.choices[0].message.content).toBe('Hello!');

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toBe('https://llm.bankr.bot/v1/chat/completions');
      expect(fetchCall[1].headers['X-API-Key']).toBe('bk_test_key');

      const body = JSON.parse(fetchCall[1].body);
      expect(body.model).toBe('gemini-2.5-flash'); // default model
    });

    it('accepts custom model', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'done' } }],
          usage: {},
        }),
      }) as any;

      const { chat } = await import('../../src/modules/bankr/client.js');
      await chat([{ role: 'user', content: 'test' }], { model: 'claude-sonnet-4.6' });

      const body = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(body.model).toBe('claude-sonnet-4.6');
    });
  });

  describe('listModels', () => {
    it('returns formatted model list', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: [
            { id: 'gemini-2.5-flash', owned_by: 'google' },
            { id: 'claude-sonnet-4.6', owned_by: 'anthropic' },
          ],
        }),
      }) as any;

      const { listModels } = await import('../../src/modules/bankr/client.js');
      const models = await listModels();

      expect(models).toHaveLength(2);
      expect(models[0]).toEqual({ id: 'gemini-2.5-flash', provider: 'google' });
    });
  });

  describe('healthCheck', () => {
    it('returns health status', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'ok' }),
      }) as any;

      const { healthCheck } = await import('../../src/modules/bankr/client.js');
      const result = await healthCheck();
      expect(result.status).toBe('ok');
    });
  });
});
