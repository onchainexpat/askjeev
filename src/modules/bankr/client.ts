import { BANKR_LLM_BASE, BANKR_API_KEY } from '../../config.js';

export interface BankrMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface BankrResponse {
  id: string;
  model: string;
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

/**
 * Chat completion via Bankr LLM Gateway.
 * Supports 20+ models (Claude, GPT, Gemini, etc.) via a single endpoint.
 * Inference is paid with USDC — enabling self-sustaining agent economics.
 */
export async function chat(
  messages: BankrMessage[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
  } = {},
): Promise<BankrResponse> {
  const {
    model = 'gemini-2.5-flash',
    temperature = 0,
    maxTokens = 4096,
    stream = false,
  } = options;

  const res = await fetch(`${BANKR_LLM_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': BANKR_API_KEY,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Bankr LLM error (${res.status}): ${err}`);
  }

  return res.json();
}

/**
 * List available models on Bankr LLM Gateway.
 */
export async function listModels(): Promise<Array<{ id: string; provider: string }>> {
  const res = await fetch(`${BANKR_LLM_BASE}/v1/models`, {
    headers: { 'X-API-Key': BANKR_API_KEY },
  });

  if (!res.ok) throw new Error(`Bankr models error (${res.status})`);
  const data = await res.json();
  return data.data.map((m: any) => ({ id: m.id, provider: m.owned_by || 'unknown' }));
}

/**
 * Check LLM credit usage over the last N days.
 */
export async function getUsage(days: number = 30): Promise<Record<string, any>> {
  const res = await fetch(`${BANKR_LLM_BASE}/v1/usage?days=${days}`, {
    headers: { 'X-API-Key': BANKR_API_KEY },
  });

  if (!res.ok) throw new Error(`Bankr usage error (${res.status})`);
  return res.json();
}

/**
 * Check Bankr LLM Gateway health status.
 */
export async function healthCheck(): Promise<{ status: string }> {
  const res = await fetch(`${BANKR_LLM_BASE}/health`);
  if (!res.ok) throw new Error(`Bankr health error (${res.status})`);
  return res.json();
}
