import { context, trace, createTraceState } from "@opentelemetry/api";
import { BasicTracerProvider, SimpleSpanProcessor, ReadableSpan } from "@opentelemetry/sdk-trace-base";
import { ExportResult, ExportResultCode } from "@opentelemetry/core";
import { privateTraceSpan, PrivacySpanExporter } from "./privacy-span-exporter";

describe("追踪上下文自由内容隐私", () => {
  const fixture = async () => {
    let raw!: ReadableSpan;
    const provider = new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor({
      export: (spans, callback) => { raw = spans[0]; callback({ code: ExportResultCode.SUCCESS }); },
      shutdown: async () => {},
    })] });
    const parent = { traceId: "1".repeat(32), spanId: "2".repeat(16), traceFlags: 1, isRemote: true,
      traceState: createTraceState("rebu=synthetic-parent-secret") };
    const linked = { traceId: "3".repeat(32), spanId: "4".repeat(16), traceFlags: 1,
      traceState: createTraceState("rebu=synthetic-link-secret") };
    const span = provider.getTracer("synthetic-context-test").startSpan("GET /health", {
      links: [{ context: linked, attributes: { "http.method": "GET" } }],
    }, trace.setSpanContext(context.active(), parent));
    span.end(); await provider.forceFlush(); await provider.shutdown();
    return { raw, parent, linked };
  };

  it("真实SDK入站及链接tracestate只在导出副本删除，traceId父子标识和采样标志保留", async () => {
    const { raw, parent, linked } = await fixture();
    const clean = privateTraceSpan(raw);
    expect(clean.spanContext().traceState).toBeUndefined();
    expect(clean.parentSpanContext?.traceState).toBeUndefined();
    expect(clean.links[0].context.traceState).toBeUndefined();
    expect(clean.spanContext().traceId).toBe(parent.traceId);
    expect(clean.spanContext().spanId).toBe(raw.spanContext().spanId);
    expect(clean.spanContext().traceFlags).toBe(1);
    expect(clean.parentSpanContext).toMatchObject({ traceId: parent.traceId, spanId: parent.spanId, isRemote: true });
    expect(clean.links[0].context).toMatchObject({ traceId: linked.traceId, spanId: linked.spanId, traceFlags: 1 });
    expect(clean.links[0].attributes).toEqual({ "http.method": "GET" });
    expect(raw.spanContext().traceState?.serialize()).toBe("rebu=synthetic-parent-secret");
    expect(raw.parentSpanContext?.traceState?.serialize()).toBe("rebu=synthetic-parent-secret");
    expect(raw.links[0].context.traceState?.serialize()).toBe("rebu=synthetic-link-secret");
  });

  it("实际Exporter委托仅收到清理副本，原SDK上下文保持", async () => {
    const { raw } = await fixture();
    const delegate = { export: jest.fn((spans: ReadableSpan[], callback: (result: ExportResult) => void) => callback({ code: ExportResultCode.SUCCESS })), shutdown: async () => {} };
    const callback = jest.fn(); new PrivacySpanExporter(delegate).export([raw], callback);
    expect(callback).toHaveBeenCalledTimes(1);
    const clean = delegate.export.mock.calls[0][0][0];
    expect(clean.spanContext().traceState).toBeUndefined();
    expect(clean.parentSpanContext?.traceState).toBeUndefined();
    expect(clean.links[0].context.traceState).toBeUndefined();
    expect(raw.spanContext().traceState?.serialize()).toContain("synthetic-parent-secret");
  });
});
