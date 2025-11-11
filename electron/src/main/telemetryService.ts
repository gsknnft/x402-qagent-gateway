import fs from 'node:fs';
import path from 'node:path';
import type { WebContents } from 'electron';
import {
  WORKSPACE_ROOT,
  TELEMETRY_LOG_DIR,
} from './projectPaths';
import {
  getTelemetrySummary,
  loadTelemetryEvents,
} from '../../../lib/telemetry';
import type {
  TelemetrySummary,
} from '../../../lib/telemetry';
import type { TelemetryEvent } from '../../../packages/telemetry-core/src/types';

process.env.QAGENT_TELEMETRY_ROOT = WORKSPACE_ROOT;

export interface TelemetrySnapshot {
  summary: TelemetrySummary;
  events: TelemetryEvent[];
}

const subscribers = new Set<WebContents>();
let watcher: fs.FSWatcher | undefined;
let debounceTimer: NodeJS.Timeout | undefined;

function emitToSubscribers(snapshot: TelemetrySnapshot) {
  for (const contents of [...subscribers]) {
    if (contents.isDestroyed()) {
      subscribers.delete(contents);
      continue;
    }

    contents.send('telemetry:update', snapshot);
  }
}

async function buildSnapshot(limit = 200): Promise<TelemetrySnapshot> {
  const [summary, events] = await Promise.all([
    getTelemetrySummary(limit),
    loadTelemetryEvents(limit),
  ]);

  return { summary, events };
}

async function refreshAndBroadcast(limit = 200) {
  try {
    const snapshot = await buildSnapshot(limit);
    emitToSubscribers(snapshot);
  } catch (error) {
    // Broadcast structured error to renderer for display without crashing main process
    for (const contents of [...subscribers]) {
      if (contents.isDestroyed()) {
        subscribers.delete(contents);
        continue;
      }
      contents.send('telemetry:error', {
        message: (error as Error).message,
      });
    }
  }
}

function scheduleRefresh(limit = 200) {
  if (debounceTimer) return;
  debounceTimer = setTimeout(() => {
    debounceTimer = undefined;
    void refreshAndBroadcast(limit);
  }, 250);
}

export async function getTelemetrySnapshot(limit = 200): Promise<TelemetrySnapshot> {
  return buildSnapshot(limit);
}

export function subscribeToTelemetry(contents: WebContents) {
  subscribers.add(contents);
  if (contents.isDestroyed()) {
    subscribers.delete(contents);
    return;
  }

  contents.once('destroyed', () => {
    subscribers.delete(contents);
  });
}

export function unsubscribeFromTelemetry(contents: WebContents) {
  subscribers.delete(contents);
}

function ensureLogDirectory() {
  try {
    fs.mkdirSync(TELEMETRY_LOG_DIR, { recursive: true });
  } catch {
    // Ignore errors creating directory; watcher will fail gracefully if missing
  }
}

export function initialiseTelemetryWatcher(limit = 200) {
  ensureLogDirectory();

  const logFile = path.join(TELEMETRY_LOG_DIR, 'agent-telemetry.jsonl');
  watcher?.close();

  try {
    watcher = fs.watch(TELEMETRY_LOG_DIR, (eventType, filename) => {
      if (!filename) return;
      if (filename !== path.basename(logFile)) return;
      if (eventType !== 'rename' && eventType !== 'change') return;

      scheduleRefresh(limit);
    });
  } catch {
    watcher = undefined;
  }

  void refreshAndBroadcast(limit);
}
