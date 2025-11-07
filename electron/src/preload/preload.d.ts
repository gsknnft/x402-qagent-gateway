// File: types/global.d.ts (or a better name: electron-global.d.ts)

import { IpcRendererEvent } from 'electron';

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
    };
  }
}

export {};
