import fs from 'node:fs';
import path from 'node:path';

function findWorkspaceRoot(): string {
  let current = process.cwd();
  const { root } = path.parse(current);

  while (true) {
    const workspaceMarker = path.join(current, 'pnpm-workspace.yaml');
    if (fs.existsSync(workspaceMarker)) {
      return current;
    }

    if (current === root) {
      break;
    }

    current = path.dirname(current);
  }

  return process.cwd();
}

export const WORKSPACE_ROOT = findWorkspaceRoot();
export const TELEMETRY_LOG_DIR = path.join(
  WORKSPACE_ROOT,
  'apps',
  'agent-runner',
  'logs',
);

export const POLICIES_DIR = path.join(
  WORKSPACE_ROOT,
  'examples',
  'agent-to-agent-demo',
  'policies',
);

export const AGENT_RUNNER_DIR = path.join(WORKSPACE_ROOT, 'apps', 'agent-runner');
export const SELLER_SERVICE_DIR = path.join(WORKSPACE_ROOT, 'apps', 'seller-service');
