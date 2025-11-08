
// src/preload/index.ts
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
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
