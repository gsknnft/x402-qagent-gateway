
// src/preload/index.ts
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { AgentRuntimeStatus } from '../main/agentManager';
import type { PolicyDetail, PolicySummary } from '../main/policyManager';
import type { TelemetrySnapshot } from '../main/telemetryService';
export type Channels = 'ipc-example';


contextBridge.exposeInMainWorld('electron', {
  ping: () => ipcRenderer.invoke('ping'),
  platform: process.platform,
  ipcRenderer: {
        sendMessage: (channel: Channels,args: unknown[]) => ipcRenderer.send(channel, ...args),
        on: (channel: Channels, func: (...args: unknown[]) => void ) => {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) => func(...args);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    },
    once: (channel: Channels, func: (...args: unknown[]) => void) => ipcRenderer.once(channel, (_event, ...args) => func(...args)),
    ipc: {
      channel: 'ipc-example',
      event: {} as any,
      get: (...args: any[]) => ipcRenderer.invoke('ipc-example', ...args),
    },
  },
  getState: () => ipcRenderer.invoke('get-state'),
  getSeed: () => ipcRenderer.invoke('get-seed'),
  rehydrateElectron: () => ipcRenderer.invoke('rehydrate-electron'),
  agents: {
    list: () => ipcRenderer.invoke('agents:list') as Promise<AgentRuntimeStatus[]>,
    start: (id: string) => ipcRenderer.invoke('agents:start', id) as Promise<AgentRuntimeStatus>,
    stop: (id: string) => ipcRenderer.invoke('agents:stop', id) as Promise<AgentRuntimeStatus>,
    subscribe: (callback: (state: AgentRuntimeStatus[]) => void) => {
      const handler = (_event: IpcRendererEvent, state: AgentRuntimeStatus[]) => callback(state);
      ipcRenderer.on('agents:update', handler);
      ipcRenderer.send('agents:subscribe');
      return () => {
        ipcRenderer.removeListener('agents:update', handler);
      };
    },
  },
  policies: {
    list: () => ipcRenderer.invoke('policies:list') as Promise<PolicySummary[]>,
    load: (id: string) => ipcRenderer.invoke('policies:load', id) as Promise<PolicyDetail>,
    save: (id: string, content: string) => ipcRenderer.invoke('policies:save', id, content) as Promise<PolicyDetail>,
  },
  telemetry: {
    getSnapshot: (limit?: number) => ipcRenderer.invoke('telemetry:get-snapshot', limit) as Promise<TelemetrySnapshot>,
    subscribe: (callback: (snapshot: TelemetrySnapshot) => void) => {
      const handler = (_event: IpcRendererEvent, snapshot: TelemetrySnapshot) => callback(snapshot);
      ipcRenderer.on('telemetry:update', handler);
      ipcRenderer.send('telemetry:subscribe');
      return () => {
        ipcRenderer.send('telemetry:unsubscribe');
        ipcRenderer.removeListener('telemetry:update', handler);
      };
    },
    onError: (callback: (message: string) => void) => {
      const handler = (_event: IpcRendererEvent, payload: { message: string }) => callback(payload.message);
      ipcRenderer.on('telemetry:error', handler);
      return () => ipcRenderer.removeListener('telemetry:error', handler);
    },
  },
});










// File: types/global.d.ts (or a better name: electron-global.d.ts)

// import { IpcRendererEvent } from 'electron';

// export type Channels = 'ipc-example';

// declare global {
//   interface Window {
//     electron: {
//       platform: NodeJS.Platform;
//       ipcRenderer: {
//         sendMessage: (channel: Channels, ...args: unknown[]) => void;
//         on: (
//           channel: Channels,
//           func: (...args: unknown[]) => void
//         ) => () => void;
//         once: (channel: Channels, func: (...args: unknown[]) => void) => void;
//         ipc: { channel: Channels, event: IpcRendererEvent, get: (...args: any[]) => void };
//       };
//       getState: () => Promise<any>;
//       getSeed: () => Promise<any>;
//       rehydrateElectron: () => Promise<any>;
//     };
//   }
// }

// export {};
