// electron-bridge.ts (called from Electron main process)
import express from 'express';

export function startElectronBridge() {
  const app = express();
  app.use(express.json());

  app.post('/api/bridge', async (req, res) => {
    const { message, state } = req.body;

    console.log('[API] Bridge message received:', message);
    // Handle the message & state
    res.json({ response: 'api received your message ✅' });
  });

  app.listen(7070, () => {
    console.log('[API] Electron bridge listening on http://localhost:7070/api/bridge');
  });
}
