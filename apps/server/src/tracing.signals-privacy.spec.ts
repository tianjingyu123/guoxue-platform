import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";

describe("实际启动模块的追踪出口边界", () => {
  it.each(["default", "otlp", "console", "debug"])("%s 配置不打开未经清理的指标、日志或诊断出口", async (mode) => {
    // 子进程仅继承运行时环境，本机Collector不参与自动埋点。
    const allowed = new Set(["PATH", "PATHEXT", "SYSTEMROOT", "WINDIR", "COMSPEC", "USERPROFILE", "APPDATA", "LOCALAPPDATA", "TEMP", "TMP"]);
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => allowed.has(key.toUpperCase())));
    const { stdout } = await promisify(execFile)(process.execPath, [
      resolve("test/tracing-signal-boundary.cjs"), resolve("src/tracing.ts"), mode,
    ], { cwd: process.cwd(), env, timeout: 25000, maxBuffer: 1048576 });
    expect(JSON.parse(stdout)).toMatchObject({
      mode, traceIdPreserved: true, tracePrivateContextAbsent: true,
      metrics: 0, metricPrivateContextDetected: false,
      logs: 0, logPrivateContextDetected: false, consolePrivateContextDetected: false,
      originalLogLevelPreserved: true, collectorClosed: true, sdkStopped: true,
      noProductionEndpointUsed: true,
    });
    expect(JSON.parse(stdout).traces).toBeGreaterThan(0);
  }, 30000);
});
