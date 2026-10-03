import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { Attributes, SpanStatusCode } from "@opentelemetry/api";
import { ExportResultCode } from "@opentelemetry/core";
import { BasicTracerProvider, SimpleSpanProcessor, ReadableSpan } from "@opentelemetry/sdk-trace-base";
import { detectResources, Resource, resourceFromAttributes } from "@opentelemetry/resources";
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

  const fixture = async (extra: Attributes = {}, resource?: Resource) => {
    let captured!: ReadableSpan;
    const delegate = { export: (spans: ReadableSpan[], callback: (result: { code: ExportResultCode }) => void) => {
      captured = spans[0]; callback({ code: ExportResultCode.SUCCESS });
    }, shutdown: async () => {} };
    const provider = new BasicTracerProvider({ resource, spanProcessors: [new SimpleSpanProcessor(delegate)] });
    const span = provider.getTracer("privacy-test").startSpan("POST /api/v1/im/callback", {
      attributes: { "http.url": `https://u:${marker}@console.tim.qq.com/v4/im?usersig=${marker}`,
        "http.target": `/api/v1/im/callback?signature=${marker}`, "url.query": marker,
        "http.request.header.authorization": marker, "http.request.header.cookie": marker,
        "http.response.header.set-cookie": marker, "user.id": marker,
        "http.request.body": marker, "http.response.body": marker, "http.response.status_code": 502, ...extra },
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

  it.each(["db.statement", "db.query.text", "db.statement.parameters.0", "db.query.parameter.user",
    "db.query.parameters", "db.redis.args", "db.redis.keys", "db.redis.key", "db.connection_string", "db.user",
    "DB.QUERY.TEXT", "db.postgresql.values"])("导出删除数据库正文属性 %s，原始SDK属性及诊断字段保留", async key => {
    const raw = await fixture({ [key]: marker, "db.operation.name": "SELECT", "db.system.name": "postgresql", "db.response.returned_rows": 1 });
    const clean = privateTraceSpan(raw);
    expect(clean.attributes[key]).toBeUndefined();
    expect(JSON.stringify(clean)).not.toContain(marker);
    expect(raw.attributes[key]).toBe(marker);
    expect(clean.attributes["db.operation.name"]).toBe("SELECT");
    expect(clean.attributes["db.system.name"]).toBe("postgresql");
    expect(clean.attributes["db.response.returned_rows"]).toBe(1);
  });

  it.each(["process.command_args", "process.command_line", "api.secret", "credential.authorization", "db.user", "db.statement", "user.id"])("资源属性 %s 清理后仍保留服务/schema元数据和原始资源", async key => {
    const value = key === "process.command_args" ? ["node", marker] : marker;
    const resource = resourceFromAttributes({ [key]: value, "service.name": "synthetic-service", "service.version": "1.0" }, { schemaUrl: "https://example.test/schema" });
    const raw = await fixture({}, resource);
    const clean = privateTraceSpan(raw);
    expect(JSON.stringify(clean)).not.toContain(marker);
    expect(clean.resource.attributes[key]).toBeUndefined();
    expect(clean.resource.attributes["service.name"]).toBe("synthetic-service");
    expect(clean.resource.attributes["service.version"]).toBe("1.0");
    expect(clean.resource.schemaUrl).toBe("https://example.test/schema");
    expect(raw.resource.attributes[key]).toEqual(value);
    expect(clean.resource).not.toBe(raw.resource);
  });

  it.each(["process.command_args", "process.command_line"])("Span进程参数 %s 不进入导出", async key => {
    const raw = await fixture({ [key]: [marker] });
    expect(JSON.stringify(privateTraceSpan(raw))).not.toContain(marker);
    expect(raw.attributes[key]).toEqual([marker]);
  });

  it("官方异步资源检测完成后清理秘密并保留服务诊断", async () => {
    const resource = detectResources({ detectors: [{ detect: () => ({ attributes: { "api.secret": Promise.resolve(marker), "service.name": "synthetic-async-service" } }) }] });
    const raw = await fixture({}, resource);
    const clean = privateTraceSpan(raw);
    expect(clean.resource.attributes["service.name"]).toBe("synthetic-async-service");
    expect(JSON.stringify(clean)).not.toContain(marker);
    expect(raw.resource.attributes["api.secret"]).toBe(marker);
  });

  it("直接导出会等待官方异步资源解析，再调用一次委托及回调", async () => {
    let resolveValue!: (value: string) => void;
    const value = new Promise<string>(resolve => { resolveValue = resolve; });
    const resource = detectResources({ detectors: [{ detect: () => ({ attributes: { "api.secret": value, "service.name": "synthetic-direct-async" } }) }] });
    const input = { ...privateTraceSpan(await fixture()), resource };
    let output!: ReadableSpan;
    const delegate = { export: jest.fn((spans: ReadableSpan[], callback: (result: { code: ExportResultCode }) => void) => {
      output = spans[0]; callback({ code: ExportResultCode.SUCCESS });
    }), shutdown: jest.fn(async () => {}), forceFlush: jest.fn(async () => {}) };
    const callback = jest.fn();
    const exporter = new PrivacySpanExporter(delegate);
    const completed = new Promise<void>(resolve => {
      exporter.export([input], result => { callback(result); resolve(); });
    });
    const flushed = exporter.forceFlush();
    const stopped = exporter.shutdown();
    try {
      expect(delegate.export).not.toHaveBeenCalled();
      expect(delegate.forceFlush).not.toHaveBeenCalled();
      expect(delegate.shutdown).not.toHaveBeenCalled();
    } finally {
      resolveValue(marker);
    }
    await Promise.all([completed, flushed, stopped]);
    expect(delegate.export).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(delegate.forceFlush).toHaveBeenCalledTimes(1);
    expect(delegate.shutdown).toHaveBeenCalledTimes(1);
    expect(output.resource.attributes["service.name"]).toBe("synthetic-direct-async");
    expect(JSON.stringify(output)).not.toContain(marker);
    expect(resource.attributes["api.secret"]).toBe(marker);
  });

  it("官方 OTLP HTTP 导出器实际发往本机 Collector 的 JSON 不含合成秘密", async () => {
    // 官方导出器使用动态 import，独立 Node 进程验证实际 SDK 与 TCP，避免 Jest VM 限制。
    const allowed = new Set(["PATH", "PATHEXT", "SYSTEMROOT", "WINDIR", "COMSPEC", "TEMP", "TMP", "APPDATA", "LOCALAPPDATA", "USERPROFILE"]);
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => allowed.has(key.toUpperCase())));
    const { stdout } = await promisify(execFile)(process.execPath, [resolve("test/tracing-otlp-privacy.cjs")], { env, timeout: 15000 });
    expect(JSON.parse(stdout)).toEqual({ secretsAbsent: true, status: 502, events: 1, traceIdPreserved: true, collectorClosed: true });
  });
});
