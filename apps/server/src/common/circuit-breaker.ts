export enum CircuitState {
  CLOSED = "CLOSED",
  OPEN = "OPEN",
  HALF_OPEN = "HALF_OPEN",
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeoutMs?: number;
  halfOpenSuccessThreshold?: number;
}

interface CircuitInfo {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number;
}

export class CircuitBreaker {
  private readonly circuits = new Map<string, CircuitInfo>();
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly halfOpenSuccessThreshold: number;

  constructor(opts?: CircuitBreakerOptions) {
    this.failureThreshold = opts?.failureThreshold ?? 5;
    this.resetTimeoutMs = opts?.resetTimeoutMs ?? 30_000;
    this.halfOpenSuccessThreshold = opts?.halfOpenSuccessThreshold ?? 2;
  }

  private getCircuit(name: string): CircuitInfo {
    if (!this.circuits.has(name)) {
      this.circuits.set(name, { state: CircuitState.CLOSED, failures: 0, successes: 0, lastFailureTime: 0 });
    }
    return this.circuits.get(name)!;
  }

  isAllowed(name: string): boolean {
    const circuit = this.getCircuit(name);
    if (circuit.state === CircuitState.CLOSED) return true;
    if (circuit.state === CircuitState.OPEN) {
      if (Date.now() - circuit.lastFailureTime >= this.resetTimeoutMs) {
        circuit.state = CircuitState.HALF_OPEN;
        circuit.successes = 0;
        return true;
      }
      return false;
    }
    // HALF_OPEN: 允许少量请求通过测试
    return true;
  }

  recordSuccess(name: string): void {
    const circuit = this.getCircuit(name);
    if (circuit.state === CircuitState.HALF_OPEN) {
      circuit.successes++;
      if (circuit.successes >= this.halfOpenSuccessThreshold) {
        circuit.state = CircuitState.CLOSED;
        circuit.failures = 0;
      }
    } else {
      circuit.failures = 0;
    }
  }

  recordFailure(name: string): void {
    const circuit = this.getCircuit(name);
    circuit.failures++;
    circuit.lastFailureTime = Date.now();
    if (circuit.state === CircuitState.HALF_OPEN) {
      circuit.state = CircuitState.OPEN;
    } else if (circuit.failures >= this.failureThreshold) {
      circuit.state = CircuitState.OPEN;
    }
  }

  getState(name: string): CircuitState {
    return this.getCircuit(name).state;
  }

  reset(name: string): void {
    this.circuits.delete(name);
  }
}
