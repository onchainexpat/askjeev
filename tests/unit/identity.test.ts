import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

vi.mock('../../src/config.js', () => ({
  getAccount: () => ({
    address: '0x1234567890123456789012345678901234567890',
  }),
}));

describe('Identity Module', () => {
  const logPath = join(process.cwd(), 'agent_log.json');

  beforeEach(async () => {
    // Clean up test log file before each test
    if (existsSync(logPath)) {
      await unlink(logPath);
    }
  });

  afterEach(async () => {
    if (existsSync(logPath)) {
      await unlink(logPath);
    }
  });

  describe('logger', () => {
    it('creates log file with first entry', async () => {
      const { log, readLogs } = await import('../../src/modules/identity/logger.js');

      await log('test_action', 'test_tool', { key: 'value' }, { result: 'ok' });

      const entries = await readLogs();
      expect(entries).toHaveLength(1);
      expect(entries[0].action).toBe('test_action');
      expect(entries[0].tool).toBe('test_tool');
      expect(entries[0].input.key).toBe('value');
      expect(entries[0].output.result).toBe('ok');
      expect(entries[0].success).toBe(true);
      expect(entries[0].timestamp).toBeDefined();
    });

    it('appends multiple entries', async () => {
      const { log, readLogs } = await import('../../src/modules/identity/logger.js');

      await log('action_1', 'tool_1', {}, {});
      await log('action_2', 'tool_2', {}, {});
      await log('action_3', 'tool_3', {}, {});

      const entries = await readLogs();
      expect(entries).toHaveLength(3);
    });

    it('supports decision field', async () => {
      const { log, readLogs } = await import('../../src/modules/identity/logger.js');

      await log('swap', 'execute_swap', {}, {}, {
        decision: 'Needed USDC to fund Bankr credits',
      });

      const entries = await readLogs();
      expect(entries[0].decision).toBe('Needed USDC to fund Bankr credits');
    });

    it('supports failure logging', async () => {
      const { log, readLogs } = await import('../../src/modules/identity/logger.js');

      await log('failed_swap', 'execute_swap', {}, { error: 'insufficient balance' }, {
        success: false,
      });

      const entries = await readLogs();
      expect(entries[0].success).toBe(false);
    });
  });

  describe('getLogSummary', () => {
    it('returns empty summary for no logs', async () => {
      const { getLogSummary } = await import('../../src/modules/identity/logger.js');
      const summary = await getLogSummary();

      expect(summary.totalActions).toBe(0);
      expect(summary.successRate).toBe(0);
    });

    it('computes correct summary', async () => {
      const { log, getLogSummary } = await import('../../src/modules/identity/logger.js');

      await log('swap', 'execute_swap', {}, {});
      await log('quote', 'get_swap_quote', {}, {});
      await log('fail', 'execute_swap', {}, {}, { success: false });

      const summary = await getLogSummary();
      expect(summary.totalActions).toBe(3);
      expect(summary.byTool['execute_swap']).toBe(2);
      expect(summary.byTool['get_swap_quote']).toBe(1);
      expect(summary.successRate).toBeCloseTo(0.667, 2);
    });
  });

  describe('generateAgentJson', () => {
    it('generates valid ERC-8004 manifest', async () => {
      const { generateAgentJson } = await import('../../src/modules/identity/agent-json.js');

      const manifest = generateAgentJson({ deployedUrl: 'https://askjeev.example.com' });

      expect(manifest.type).toBe('https://eips.ethereum.org/EIPS/eip-8004#registration-v1');
      expect(manifest.name).toBe('AskJeev');
      expect(manifest.x402Support).toBe(true);
      expect(manifest.active).toBe(true);
      expect(manifest.services).toContainEqual(
        expect.objectContaining({ name: 'x402' }),
      );
      expect(manifest.capabilities.llm.private).toBe('venice-ai');
      expect(manifest.capabilities.llm.general).toBe('bankr-gateway');
    });

    it('includes registrations when provided', async () => {
      const { generateAgentJson } = await import('../../src/modules/identity/agent-json.js');

      const manifest = generateAgentJson({
        agentId: '42',
        agentRegistry: 'eip155:8453:0xregistry',
      });

      expect(manifest.registrations).toHaveLength(1);
      expect(manifest.registrations[0].agentId).toBe(42);
    });
  });
});
