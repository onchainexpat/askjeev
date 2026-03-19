import { VENICE_API_BASE, VENICE_API_KEY } from '../../config.js';

export interface VeniceMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface VeniceResponse {
  id: string;
  model: string;
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

/**
 * Private reasoning via Venice AI — zero data retention.
 * Used for sensitive financial analysis where data privacy matters.
 */
export async function privateReason(
  messages: VeniceMessage[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    webSearch?: boolean;
  } = {},
): Promise<VeniceResponse> {
  const {
    model = 'llama-3.3-70b',
    temperature = 0,
    maxTokens = 4096,
    webSearch = false,
  } = options;

  const res = await fetch(`${VENICE_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${VENICE_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      venice_parameters: {
        include_venice_system_prompt: false,
        enable_web_search: webSearch ? 'on' : 'off',
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Venice API error (${res.status}): ${err}`);
  }

  return res.json();
}

/**
 * Analyze sensitive financial data privately.
 * Venice retains zero user data — ideal for portfolio analysis,
 * wallet positions, and trading signal evaluation.
 */
export async function analyzePrivately(prompt: string, context?: string): Promise<string> {
  const messages: VeniceMessage[] = [
    {
      role: 'system',
      content:
        'You are AskJeev, a privacy-focused financial analysis agent. ' +
        'Analyze the provided data concisely. Focus on actionable insights. ' +
        'Never store or reference this data after responding.',
    },
  ];

  if (context) {
    messages.push({ role: 'user', content: `Context:\n${context}` });
  }
  messages.push({ role: 'user', content: prompt });

  const response = await privateReason(messages);
  return response.choices[0].message.content;
}

/**
 * Get available Venice models.
 */
export async function listModels(): Promise<string[]> {
  const res = await fetch(`${VENICE_API_BASE}/models`, {
    headers: { Authorization: `Bearer ${VENICE_API_KEY}` },
  });

  if (!res.ok) throw new Error(`Venice models error (${res.status})`);
  const data = await res.json();
  return data.data.map((m: any) => m.id);
}
