import fs from 'node:fs/promises';
import path from 'node:path';
import { POLICIES_DIR } from './projectPaths';

export interface PolicySummary {
  id: string;
  fileName: string;
  strategy?: string;
  description?: string;
  updatedAt?: string;
}

export interface PolicyDetail extends PolicySummary {
  content: string;
  schema?: unknown;
}

function buildFilePath(id: string) {
  return path.join(POLICIES_DIR, `${id}.json`);
}

async function statTimestamp(filePath: string): Promise<string | undefined> {
  try {
    const stats = await fs.stat(filePath);
    return stats.mtime.toISOString();
  } catch {
    return undefined;
  }
}

export async function listPolicies(): Promise<PolicySummary[]> {
  let entries: string[] = [];
  try {
    entries = await fs.readdir(POLICIES_DIR);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  const summaries: PolicySummary[] = [];

  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue;
    const id = entry.replace(/\.json$/i, '');
    const filePath = path.join(POLICIES_DIR, entry);
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      summaries.push({
        id,
        fileName: entry,
        strategy: typeof parsed.strategy === 'string' ? parsed.strategy : undefined,
        description: typeof parsed.description === 'string' ? parsed.description : undefined,
        updatedAt: await statTimestamp(filePath),
      });
    } catch (error) {
      summaries.push({
        id,
        fileName: entry,
        description: `Unable to parse policy: ${(error as Error).message}`,
      });
    }
  }

  return summaries.sort((a, b) => a.id.localeCompare(b.id));
}

export async function loadPolicy(id: string): Promise<PolicyDetail> {
  const filePath = buildFilePath(id);
  const raw = await fs.readFile(filePath, 'utf-8');
  const parsed = JSON.parse(raw) as Record<string, unknown>;

  return {
    id,
    fileName: path.basename(filePath),
    strategy: typeof parsed.strategy === 'string' ? parsed.strategy : undefined,
    description: typeof parsed.description === 'string' ? parsed.description : undefined,
    content: JSON.stringify(parsed, null, 2),
    updatedAt: await statTimestamp(filePath),
  };
}

export async function savePolicy(id: string, content: string): Promise<PolicyDetail> {
  const filePath = buildFilePath(id);
  const parsed = JSON.parse(content) as Record<string, unknown>;
  const sanitised = JSON.stringify(parsed, null, 2);
  await fs.writeFile(filePath, `${sanitised}\n`, 'utf-8');

  return {
    id,
    fileName: path.basename(filePath),
    strategy: typeof parsed.strategy === 'string' ? parsed.strategy : undefined,
    description: typeof parsed.description === 'string' ? parsed.description : undefined,
    content: sanitised,
    updatedAt: await statTimestamp(filePath),
  };
}
