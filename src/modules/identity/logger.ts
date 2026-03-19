import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Use /tmp on Vercel (read-only filesystem), cwd locally
const LOG_DIR = process.env.VERCEL ? tmpdir() : process.cwd();
const LOG_PATH = join(LOG_DIR, 'agent_log.json');

export interface LogEntry {
  timestamp: string;
  action: string;
  tool: string;
  input: Record<string, any>;
  output: Record<string, any>;
  success: boolean;
  decision?: string;
}

/**
 * Append a structured execution log entry.
 * These logs are required by the ERC-8004 / Protocol Labs tracks
 * and demonstrate autonomous decision-making.
 */
export async function log(
  action: string,
  tool: string,
  input: Record<string, any>,
  output: Record<string, any>,
  options: { success?: boolean; decision?: string } = {},
): Promise<void> {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    action,
    tool,
    input,
    output,
    success: options.success ?? true,
    ...(options.decision && { decision: options.decision }),
  };

  try {
    let entries: LogEntry[] = [];
    if (existsSync(LOG_PATH)) {
      try {
        const raw = await readFile(LOG_PATH, 'utf-8');
        entries = JSON.parse(raw);
      } catch {
        entries = [];
      }
    }

    entries.push(entry);
    await writeFile(LOG_PATH, JSON.stringify(entries, null, 2));
  } catch {
    // Silently fail on read-only filesystems (Vercel)
  }
}

/**
 * Read all execution logs.
 */
export async function readLogs(): Promise<LogEntry[]> {
  if (!existsSync(LOG_PATH)) return [];
  const raw = await readFile(LOG_PATH, 'utf-8');
  return JSON.parse(raw);
}

/**
 * Get a summary of agent activity.
 */
export async function getLogSummary(): Promise<{
  totalActions: number;
  byTool: Record<string, number>;
  successRate: number;
  firstAction: string | null;
  lastAction: string | null;
}> {
  const entries = await readLogs();
  if (entries.length === 0) {
    return { totalActions: 0, byTool: {}, successRate: 0, firstAction: null, lastAction: null };
  }

  const byTool: Record<string, number> = {};
  let successes = 0;
  for (const entry of entries) {
    byTool[entry.tool] = (byTool[entry.tool] || 0) + 1;
    if (entry.success) successes++;
  }

  return {
    totalActions: entries.length,
    byTool,
    successRate: successes / entries.length,
    firstAction: entries[0].timestamp,
    lastAction: entries[entries.length - 1].timestamp,
  };
}
