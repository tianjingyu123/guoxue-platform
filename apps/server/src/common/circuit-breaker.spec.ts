import { CircuitBreaker, CircuitState } from "./circuit-breaker";

describe("CircuitBreaker", () => {
  let cb: CircuitBreaker;

  beforeEach(() => {
    cb = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 100, halfOpenSuccessThreshold: 2 });
  });

  it("初始状态为 CLOSED", () => {
    expect(cb.getState("test")).toBe(CircuitState.CLOSED);
    expect(cb.isAllowed("test")).toBe(true);
  });

  it("连续失败达到阈值后转 OPEN", () => {
    cb.recordFailure("svc");
    cb.recordFailure("svc");
    expect(cb.getState("svc")).toBe(CircuitState.CLOSED);
    cb.recordFailure("svc");
    expect(cb.getState("svc")).toBe(CircuitState.OPEN);
    expect(cb.isAllowed("svc")).toBe(false);
  });

  it("成功会重置失败计数", () => {
    cb.recordFailure("svc");
    cb.recordFailure("svc");
    cb.recordSuccess("svc");
    cb.recordFailure("svc");
    cb.recordFailure("svc");
    expect(cb.getState("svc")).toBe(CircuitState.CLOSED);
  });

  it("OPEN 状态超时后转 HALF_OPEN", async () => {
    cb.recordFailure("svc");
    cb.recordFailure("svc");
    cb.recordFailure("svc");
    expect(cb.isAllowed("svc")).toBe(false);
    await new Promise((r) => setTimeout(r, 120));
    expect(cb.isAllowed("svc")).toBe(true);
    expect(cb.getState("svc")).toBe(CircuitState.HALF_OPEN);
  });

  it("HALF_OPEN 状态成功达标后恢复 CLOSED", async () => {
    cb.recordFailure("svc");
    cb.recordFailure("svc");
    cb.recordFailure("svc");
    await new Promise((r) => setTimeout(r, 120));
    cb.isAllowed("svc"); // triggers transition to HALF_OPEN
    cb.recordSuccess("svc");
    expect(cb.getState("svc")).toBe(CircuitState.HALF_OPEN);
    cb.recordSuccess("svc");
    expect(cb.getState("svc")).toBe(CircuitState.CLOSED);
  });

  it("HALF_OPEN 状态再次失败回到 OPEN", async () => {
    cb.recordFailure("svc");
    cb.recordFailure("svc");
    cb.recordFailure("svc");
    await new Promise((r) => setTimeout(r, 120));
    cb.isAllowed("svc");
    cb.recordFailure("svc");
    expect(cb.getState("svc")).toBe(CircuitState.OPEN);
  });

  it("不同 service 互不影响", () => {
    cb.recordFailure("a");
    cb.recordFailure("a");
    cb.recordFailure("a");
    expect(cb.getState("a")).toBe(CircuitState.OPEN);
    expect(cb.getState("b")).toBe(CircuitState.CLOSED);
    expect(cb.isAllowed("b")).toBe(true);
  });

  it("reset 恢复到初始", () => {
    cb.recordFailure("svc");
    cb.recordFailure("svc");
    cb.recordFailure("svc");
    cb.reset("svc");
    expect(cb.getState("svc")).toBe(CircuitState.CLOSED);
  });
});
