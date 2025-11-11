import { spawn, type ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import {
  AGENT_RUNNER_DIR,
  SELLER_SERVICE_DIR,
} from './projectPaths';

const MAX_LOG_LINES = 200;
const SHELL_MODE = process.platform === 'win32';

type AgentState =
  | 'idle'
  | 'starting'
  | 'running'
  | 'stopping'
  | 'stopped'
  | 'error';

interface AgentDefinition {
  id: string;
  label: string;
  description: string;
  cwd: string;
  command: string;
  args: string[];
}

interface AgentLogEntry {
  timestamp: string;
  level: 'stdout' | 'stderr' | 'info' | 'error';
  message: string;
}

export interface AgentRuntimeStatus {
  id: string;
  label: string;
  description: string;
  state: AgentState;
  pid?: number;
  lastStartedAt?: string;
  lastExitedAt?: string;
  exitCode?: number | null;
  lastSignal?: NodeJS.Signals | null;
  lastError?: string | null;
  logs: AgentLogEntry[];
}

interface AgentRuntime {
  definition: AgentDefinition;
  status: AgentRuntimeStatus;
  process?: ChildProcess;
}

type AgentEvent = 'state-changed';

type StateListener = (state: AgentRuntimeStatus[]) => void;

class AgentManager extends EventEmitter {
  private readonly runtimes = new Map<string, AgentRuntime>();

  constructor(definitions: AgentDefinition[]) {
    super();
    for (const definition of definitions) {
      this.runtimes.set(definition.id, {
        definition,
        status: {
          id: definition.id,
          label: definition.label,
          description: definition.description,
          state: 'idle',
          logs: [],
        },
      });
    }
  }

  listAgents(): AgentRuntimeStatus[] {
    return Array.from(this.runtimes.values()).map(runtime => ({
      ...runtime.status,
      logs: [...runtime.status.logs],
    }));
  }

  on(event: AgentEvent, listener: StateListener): this {
    return super.on(event, listener);
  }

  off(event: AgentEvent, listener: StateListener): this {
    return super.off(event, listener);
  }

  async startAgent(id: string): Promise<AgentRuntimeStatus> {
    const runtime = this.runtimes.get(id);
    if (!runtime) {
      throw new Error(`Unknown agent: ${id}`);
    }

    if (runtime.process) {
      return runtime.status;
    }

    const startTimestamp = new Date().toISOString();

    runtime.status = {
      ...runtime.status,
      state: 'starting',
      lastStartedAt: startTimestamp,
      lastError: null,
      exitCode: undefined,
      lastSignal: null,
    };
    this.appendLog(runtime, 'info', `Starting process: ${runtime.definition.command} ${runtime.definition.args.join(' ')}`);
    this.emitState();

    const child = spawn(runtime.definition.command, runtime.definition.args, {
      cwd: runtime.definition.cwd,
      env: { ...process.env },
      shell: SHELL_MODE,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    runtime.process = child;

    child.once('spawn', () => {
      runtime.status = {
        ...runtime.status,
        state: 'running',
        pid: child.pid ?? undefined,
      };
      this.appendLog(runtime, 'info', 'Process spawned successfully');
      this.emitState();
    });

    child.stdout?.on('data', chunk => {
      const message = chunk.toString();
      this.appendLog(runtime, 'stdout', message);
      this.emitState();
    });

    child.stderr?.on('data', chunk => {
      const message = chunk.toString();
      this.appendLog(runtime, 'stderr', message);
      this.emitState();
    });

    child.on('error', error => {
      runtime.status = {
        ...runtime.status,
        state: 'error',
        lastError: error.message,
      };
      this.appendLog(runtime, 'error', error.stack ?? error.message);
      runtime.process = undefined;
      this.emitState();
    });

    const handleExit = (code: number | null, signal: NodeJS.Signals | null) => {
      runtime.status = {
        ...runtime.status,
        state: 'stopped',
        exitCode: code,
        lastSignal: signal,
        lastExitedAt: new Date().toISOString(),
        pid: undefined,
      };
      this.appendLog(runtime, 'info', `Process exited (code=${code ?? 'null'} signal=${signal ?? 'null'})`);
      runtime.process = undefined;
      this.emitState();
    };

    child.once('exit', handleExit);
    child.once('close', handleExit);

    return runtime.status;
  }

  async stopAgent(id: string): Promise<AgentRuntimeStatus> {
    const runtime = this.runtimes.get(id);
    if (!runtime) {
      throw new Error(`Unknown agent: ${id}`);
    }

    if (!runtime.process) {
      return runtime.status;
    }

    runtime.status = {
      ...runtime.status,
      state: 'stopping',
    };
    this.appendLog(runtime, 'info', 'Sending termination signal');
    this.emitState();

    const killed = runtime.process.kill();
    if (!killed) {
      runtime.status = {
        ...runtime.status,
        state: 'error',
        lastError: 'Unable to stop process via kill()',
      };
      this.emitState();
    }

    return runtime.status;
  }

  private emitState() {
    this.emit('state-changed', this.listAgents());
  }

  private appendLog(runtime: AgentRuntime, level: AgentLogEntry['level'], message: string) {
    const lines = message.split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      runtime.status.logs.push({
        timestamp: new Date().toISOString(),
        level,
        message: line,
      });
    }

    if (runtime.status.logs.length > MAX_LOG_LINES) {
      runtime.status.logs = runtime.status.logs.slice(-MAX_LOG_LINES);
    }
  }
}

const pnpmCommand = 'pnpm';

const manager = new AgentManager([
  {
    id: 'seller-service',
    label: 'Seller Service',
    description: 'HTTP vendor providing text transformations gated by X402 payments.',
    cwd: SELLER_SERVICE_DIR,
    command: pnpmCommand,
    args: ['start'],
  },
  {
    id: 'buyer-agent',
    label: 'Buyer Agent',
    description: 'Autonomous agent that purchases services using the X402 middleware.',
    cwd: AGENT_RUNNER_DIR,
    command: pnpmCommand,
    args: ['start'],
  },
]);

export default manager;
