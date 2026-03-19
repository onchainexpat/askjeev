import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config.js', () => ({
  VENICE_API_BASE: 'https://api.venice.ai/api/v1',
  VENICE_API_KEY: 'test-venice-key',
}));

describe('Venice Module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('privateReason', () => {
    it('sends chat completion with venice_parameters', async () => {
      const mockResponse = {
        id: 'ven-123',
        model: 'llama-3.3-70b',
        choices: [{ message: { role: 'assistant', content: 'Analysis result' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      }) as any;

      const { privateReason } = await import('../../src/modules/venice/client.js');
      const result = await privateReason([{ role: 'user', content: 'Analyze this' }]);

      expect(result.choices[0].message.content).toBe('Analysis result');

      const fetchCall = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.venice_parameters.include_venice_system_prompt).toBe(false);
      expect(body.venice_parameters.enable_web_search).toBe('off');
    });

    it('enables web search when requested', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'result' } }],
          usage: {},
        }),
      }) as any;

      const { privateReason } = await import('../../src/modules/venice/client.js');
      await privateReason([{ role: 'user', content: 'search' }], { webSearch: true });

      const body = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(body.venice_parameters.enable_web_search).toBe('on');
    });

    it('throws on API error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      }) as any;

      const { privateReason } = await import('../../src/modules/venice/client.js');
      await expect(
        privateReason([{ role: 'user', content: 'test' }]),
      ).rejects.toThrow('Venice API error (401)');
    });
  });

  describe('analyzePrivately', () => {
    it('adds system prompt for financial analysis', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { role: 'assistant', content: 'Private analysis' } }],
          usage: { total_tokens: 50 },
        }),
      }) as any;

      const { analyzePrivately } = await import('../../src/modules/venice/client.js');
      const result = await analyzePrivately('Check risk', 'Balance: 100 USDC');

      expect(result).toBe('Private analysis');

      const body = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(body.messages).toHaveLength(3); // system + context + prompt
      expect(body.messages[0].role).toBe('system');
      expect(body.messages[0].content).toContain('privacy-focused');
    });
  });
});
