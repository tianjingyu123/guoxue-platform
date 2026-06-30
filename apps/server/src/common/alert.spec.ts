import { setAlertHandler, sendAlert, __resetAlertThrottle } from "./alert";

describe("alert 统一告警通道", () => {
  beforeEach(() => __resetAlertThrottle());
  afterEach(() => setAlertHandler(null));

  it("同 key 节流：窗口内只发一条，防风暴", () => {
    const calls: string[] = [];
    setAlertHandler((t) => calls.push(t));
    sendAlert("5xx:500", "T", "d1");
    sendAlert("5xx:500", "T", "d2");
    sendAlert("5xx:500", "T", "d3");
    expect(calls.length).toBe(1);
  });

  it("不同 key 各自发送，互不节流", () => {
    const details: string[] = [];
    setAlertHandler((_t, d) => details.push(d));
    sendAlert("5xx:500", "T", "da");
    sendAlert("slow:critical", "T", "db");
    sendAlert("queue:health", "T", "dc");
    expect(details).toEqual(["da", "db", "dc"]);
  });

  it("无 handler 时降级 stderr 不抛错", () => {
    setAlertHandler(null);
    expect(() => sendAlert("k", "T", "d")).not.toThrow();
  });

  it("handler 抛错不影响调用方", () => {
    setAlertHandler(() => { throw new Error("webhook down"); });
    expect(() => sendAlert("k2", "T", "d")).not.toThrow();
  });
});
