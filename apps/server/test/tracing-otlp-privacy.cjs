// 仅本机合成 Collector；不读取正式端点或身份配置。
require("ts-node/register");
const assert = require("node:assert/strict");
const { createServer } = require("node:http");
const { BasicTracerProvider, SimpleSpanProcessor } = require("@opentelemetry/sdk-trace-base");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http");
const { SpanStatusCode, context, trace, createTraceState } = require("@opentelemetry/api");
const { resourceFromAttributes } = require("@opentelemetry/resources");
const { PrivacySpanExporter } = require(process.argv[2] || "../src/common/privacy-span-exporter");
let failureStage = "setup";

(async () => {
  const marker = "synthetic-private-signature";
  let payload = "";
  let provider;
  const server = createServer((req, res) => {
    req.on("data", chunk => { payload += chunk.toString(); });
    req.on("end", () => { res.writeHead(200, { "content-type": "application/json" }); res.end("{}"); });
  });
  try {
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    const exporter = new PrivacySpanExporter(new OTLPTraceExporter({ url: `http://127.0.0.1:${server.address().port}/v1/traces`, timeoutMillis: 3000 }));
    provider = new BasicTracerProvider({ resource: resourceFromAttributes({ "service.name": "synthetic-resource-service", "api.secret": marker, "process.command_args": ["node", marker], "process.command_line": `node --token=${marker}` }), spanProcessors: [new SimpleSpanProcessor(exporter)] });
    // 合成入站W3C上下文及链接自由内容不得绕过属性清理进入OTLP。
    const parent = { traceId: "3".repeat(32), spanId: "4".repeat(16), traceFlags: 1, isRemote: true, traceState: createTraceState("rebu=" + marker) };
    const span = provider.getTracer("privacy-wire-test").startSpan("POST /api/v1/im/callback", { attributes: {
      "http.url": `https://user:${marker}@console.tim.qq.com/v4/im?usersig=${marker}`,
      "http.target": `/api/v1/im/callback?signature=${marker}`, "url.full": `https://example.test/?token=${marker}`,
      "url.query": marker, "http.request.header.authorization": marker, "http.request.header.cookie": marker,
      "http.response.header.set-cookie": marker, "user.id": marker, "http.request.body": marker,
      "http.response.body": marker, "http.response.status_code": 502,
      "db.statement": `SELECT '${marker}'`, "db.query.text": `GET ${marker}`,
      "db.query.parameter.user": marker, "db.redis.args": [marker],
    }, links: [{ context: { traceId: "1".repeat(32), spanId: "2".repeat(16), traceFlags: 1, traceState: createTraceState("rebu=" + marker) }, attributes: { token: marker } }] }, trace.setSpanContext(context.active(), parent));
    const traceId = span.spanContext().traceId;
    span.setStatus({ code: SpanStatusCode.ERROR, message: marker });
    span.recordException(new Error(marker));
    span.end();
    await provider.forceFlush();
    assert.ok(payload.length > 0, "Collector 没有收到数据");
    failureStage = "private-context";
    assert.ok(!payload.includes(marker), "OTLP 线缆数据含合成秘密");
    failureStage = "diagnostics";
    const wire = JSON.parse(payload).resourceSpans[0].scopeSpans[0].spans[0];
    assert.equal(wire.traceId, traceId);
    assert.equal(traceId, parent.traceId);
    assert.equal(wire.parentSpanId, parent.spanId);
    assert.equal(wire.traceState || "", "");
    assert.equal(wire.links[0].traceState || "", "");
    assert.equal(wire.links[0].traceId, "1".repeat(32));
    assert.equal(span.spanContext().traceState.serialize(), "rebu=" + marker);
    assert.equal(wire.name, "POST /api/v1/im/callback");
    const status = wire.attributes.find(row => row.key === "http.response.status_code").value.intValue;
    assert.equal(Number(status), 502);
    assert.equal(wire.events.length, 1);
    await provider.shutdown(); provider = undefined;
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    process.stdout.write(JSON.stringify({ secretsAbsent: true, status: 502, events: 1, traceIdPreserved: true, collectorClosed: !server.listening }));
  } finally {
    await provider?.shutdown();
    if (server.listening) await new Promise(resolve => server.close(resolve));
  }
})().catch(() => { process.stderr.write(JSON.stringify({ error: "synthetic-otlp-privacy-check-failed", stage: failureStage }) + "\n"); process.exitCode = 1; });
