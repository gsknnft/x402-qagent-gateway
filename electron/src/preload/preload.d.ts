// File: types/global.d.ts (or a better name: electron-global.d.ts)

import { IpcRendererEvent } from 'electron';
import type { AgentRuntimeStatus } from '../main/agentManager';
import type { PolicyDetail, PolicySummary } from '../main/policyManager';
import type { TelemetrySnapshot } from '../main/telemetryService';

export type Channels = 'ipc-example';

declare global {
  interface Window {
    electron: {
      platform: NodeJS.Platform;
      ipcRenderer: {
        sendMessage: (channel: Channels, ...args: unknown[]) => void;
        on: (
          channel: Channels,
          func: (...args: unknown[]) => void
        ) => () => void;
        once: (channel: Channels, func: (...args: unknown[]) => void) => void;
        ipc: { channel: Channels, event: IpcRendererEvent, get: (...args: any[]) => void };
      };
      getState: () => Promise<any>;
      getSeed: () => Promise<any>;
      rehydrateElectron: () => Promise<any>;
      agents: {
        list: () => Promise<AgentRuntimeStatus[]>;
        start: (id: string) => Promise<AgentRuntimeStatus>;
        stop: (id: string) => Promise<AgentRuntimeStatus>;
        subscribe: (callback: (state: AgentRuntimeStatus[]) => void) => () => void;
      };
      policies: {
        list: () => Promise<PolicySummary[]>;
        load: (id: string) => Promise<PolicyDetail>;
        save: (id: string, content: string) => Promise<PolicyDetail>;
      };
      telemetry: {
        getSnapshot: (limit?: number) => Promise<TelemetrySnapshot>;
        subscribe: (callback: (snapshot: TelemetrySnapshot) => void) => () => void;
        onError: (callback: (message: string) => void) => () => void;
      };
    };
  }
}

export {};
