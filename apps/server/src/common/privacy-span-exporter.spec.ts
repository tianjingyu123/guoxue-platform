import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { SpanStatusCode } from "@opentelemetry/api";
import { ExportResultCode } from "@opentelemetry/core";
import { BasicTracerProvider, SimpleSpanProcessor, ReadableSpan } from "@opentelemetry/sdk-trace-base";
import { PrivacySpanExporter, privateTraceSpan, traceLogUrl } from "./privacy-span-exporter";

describe("追踪导出隐私", () => {
  const marker = "synthetic-private-signature";
  it.each([
    ["/api/v1/im/callback?usersig=secret#fragment", "/api/v1/im/callback"],
    ["https://user:pass@console.tim.qq.com/v4/im?usersig=secret#fragment", "https://console.tim.qq.com/v4/im"],
    ["/a%2Fb?x=secret", "/a%2Fb"],
    ["/?x=secret", "/"],
    ["/api/v1/health", "/api/v1/health"],
  ])("URL %s 只保留可诊断路径", (input, expected) => expect(traceLogUrl(input)).toBe(expected));

  const fixture = async () => {
    let captured!: ReadableSpan;
    const delegate = { export: (spans: ReadableSpan[], callback: (result: { code: ExportResultCode }) => void) => {
      captured = spans[0]; callback({ code: ExportResultCode.SUCCESS });
    }, shutdown: async () => {} };
    const provider = new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(delegate)] });
    const span = provider.getTracer("privacy-test").startSpan("POST /api/v1/im/callback", {
      attributes: { "http.url": `https://u:${marker}@console.tim.qq.com/v4/im?usersig=${marker}`,
        "http.target": `/api/v1/im/callback?signature=${marker}`, "url.query": marker,
        "http.request.header.authorization": marker, "http.request.header.cookie": marker,
        "http.response.header.set-cookie": marker, "user.id": marker,
        "http.request.body": marker, "http.response.body": marker, "http.response.status_code": 502 },
      links: [{ context: { traceId: "1".repeat(32), spanId: "2".repeat(16), traceFlags: 1 }, attributes: { token: marker, method: "POST" } }],
    });
    span.setStatus({ code: SpanStatusCode.ERROR, message: marker });
    span.recordException(new Error(marker));
    span.end();
    await provider.forceFlush();
    await provider.shutdown();
    return captured;
  };

  it("真实 SDK Span 清理异常事件、状态、签名、正文和链接，保留诊断字段", async () => {
    const raw = await fixture();
    const clean = privateTraceSpan(raw);
    expect(JSON.stringify(clean)).not.toContain(marker);
    expect(clean.status).toEqual({ code: SpanStatusCode.ERROR });
    expect(clean.attributes["http.response.status_code"]).toBe(502);
    expect(clean.attributes["http.url"]).toBe("https://console.tim.qq.com/v4/im");
    expect(clean.links[0].attributes).toEqual({ method: "POST" });
    expect(clean.spanContext()).toEqual(raw.spanContext());
    expect(clean.duration).toEqual(raw.duration);
    expect(clean.events[0].attributes?.["exception.type"]).toBe("Error");
    expect(raw.attributes["url.query"]).toBe(marker);
    expect(raw.status.message).toBe(marker);
    expect(raw.events[0].attributes?.["exception.message"]).toBe(marker);
  });

  it("代理保留导出失败回调、刷新和关闭行为", async () => {
    const result = { code: ExportResultCode.FAILED, error: new Error("synthetic transport error") };
    const delegate = { export: jest.fn((_spans, callback) => callback(result)),
      shutdown: jest.fn(async () => {}), forceFlush: jest.fn(async () => {}) };
    const callback = jest.fn();
    const exporter = new PrivacySpanExporter(delegate);
    exporter.export([], callback);
    expect(callback).toHaveBeenCalledWith(result);
    await exporter.forceFlush(); await exporter.shutdown();
    expect(delegate.forceFlush).toHaveBeenCalledTimes(1);
    expect(delegate.shutdown).toHaveBeenCalledTimes(1);
    await expect(new PrivacySpanExporter({ export: delegate.export, shutdown: delegate.shutdown }).forceFlush()).resolves.toBeUndefined();
  });

  it("官方 OTLP HTTP 导出器实际发往本机 Collector 的 JSON 不含合成秘密", async () => {
    // 官方导出器使用动态 import，独立 Node 进程验证实际 SDK 与 TCP，避免 Jest VM 限制。
    const allowed = new Set(["PATH", "PATHEXT", "SYSTEMROOT", "WINDIR", "COMSPEC", "TEMP", "TMP", "APPDATA", "LOCALAPPDATA", "USERPROFILE"]);
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => allowed.has(key.toUpperCase())));
    const { stdout } = await promisify(execFile)(process.execPath, [resolve("test/tracing-otlp-privacy.cjs")], { env, timeout: 15000 });
    expect(JSON.parse(stdout)).toEqual({ secretsAbsent: true, status: 502, events: 1, traceIdPreserved: true, collectorClosed: true });
  });
});
