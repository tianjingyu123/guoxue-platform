// 本机合成PostgreSQL与RESP替身，不读取正式连接配置或端点。
require("ts-node/register");
const assert = require("node:assert/strict");
const { createServer } = require("node:http");
const net = require("node:net");
const { NodeTracerProvider, SimpleSpanProcessor } = require("@opentelemetry/sdk-trace-node");
const { PgInstrumentation } = require("@opentelemetry/instrumentation-pg");
const { IORedisInstrumentation } = require("@opentelemetry/instrumentation-ioredis");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http");
const { PrivacySpanExporter } = require(process.argv[2] || "../src/common/privacy-span-exporter");
let failureStage = "setup";

(async () => {
  const port = Number(process.env.SYNTHETIC_PG_PORT);
  assert.equal(port, 55476);
  assert.ok(["database", "database/dup", ""].includes(process.env.OTEL_SEMCONV_STABILITY_OPT_IN || ""));
  const marker = "synthetic-database-private-marker";
  const payloads = [];
  const raw = [];
  const sockets = new Set();
  const collector = createServer((req, res) => {
    let body = "";
    req.on("data", chunk => { body += chunk.toString(); });
    req.on("end", () => { payloads.push(body); res.writeHead(200, { "content-type": "application/json" }); res.end("{}"); });
  });
  // 仅模拟本测试GET命令的RESP应答；不是实际Redis服务器验收。
  const resp = net.createServer(socket => {
    let buffer = "";
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.on("data", data => {
      buffer += data.toString();
      if (buffer.endsWith(marker + "\r\n")) {
        assert.match(buffer, /^\*2\r\n\$3\r\nget\r\n/i);
        socket.write("$-1\r\n"); buffer = "";
      }
    });
  });
  let provider, client, redis;
  const pgInstrumentation = new PgInstrumentation({ enhancedDatabaseReporting: true });
  const redisInstrumentation = new IORedisInstrumentation({ requireParentSpan: false });
  try {
    await new Promise(resolve => collector.listen(0, "127.0.0.1", resolve));
    await new Promise(resolve => resp.listen(0, "127.0.0.1", resolve));
    const privacy = new PrivacySpanExporter(new OTLPTraceExporter({ url: `http://127.0.0.1:${collector.address().port}/v1/traces`, timeoutMillis: 3000 }));
    const spy = { export: (spans, callback) => { raw.push(...spans); privacy.export(spans, callback); }, shutdown: () => privacy.shutdown(), forceFlush: () => privacy.forceFlush() };
    provider = new NodeTracerProvider({ spanProcessors: [new SimpleSpanProcessor(spy)] });
    provider.register();
    pgInstrumentation.setTracerProvider(provider);
    redisInstrumentation.setTracerProvider(provider);
    pgInstrumentation.enable();
    redisInstrumentation.enable();
    // 必须在自动埋点启用后才加载两个实际客户端。
    const pgModule = process.env.SYNTHETIC_PG_CLIENT_MODULE;
    assert.equal(pgModule, "E:/CodexBuild/phase87-pg-client/node_modules/pg");
    const { Client } = require(pgModule);
    const Redis = require("ioredis");
    client = new Client({ host: "127.0.0.1", port, user: "qa_voice", database: "phase87_trace_privacy", connectionTimeoutMillis: 3000 });
    await client.connect();
    const literal = await client.query(`SELECT '${marker}'::text AS value`);
    const parameter = await client.query("SELECT $1::text AS value", [marker]);
    assert.equal(literal.rows[0].value, marker);
    assert.equal(parameter.rows[0].value, marker);
    redis = new Redis({ host: "127.0.0.1", port: resp.address().port, disableClientInfo: true, enableReadyCheck: false, lazyConnect: true, enableOfflineQueue: false, commandTimeout: 3000, maxRetriesPerRequest: 0, retryStrategy: () => null });
    await redis.connect();
    assert.equal(await redis.get(marker), null);
    redis.disconnect(); redis = undefined;
    await client.end(); client = undefined;
    await provider.forceFlush();
    const rawContent = JSON.stringify(raw.map(span => span.attributes));
    assert.ok(rawContent.includes(marker), "未复现原始自动埋点正文");
    assert.ok(payloads.length > 0, "没有实际OTLP请求");
    failureStage = "wire-private-content";
    assert.ok(!payloads.join("").includes(marker));
    failureStage = "diagnostics";
    const spans = payloads.flatMap(payload => JSON.parse(payload).resourceSpans.flatMap(resource => resource.scopeSpans.flatMap(scope => scope.spans)));
    const pgSpans = spans.filter(span => span.name.startsWith("pg.query:"));
    const redisSpans = spans.filter(span => span.name === "get");
    assert.equal(pgSpans.length, 2);
    assert.equal(redisSpans.length, 1);
    for (const span of [...pgSpans, ...redisSpans]) {
      assert.ok(span.traceId && span.spanId && span.startTimeUnixNano && span.endTimeUnixNano);
      assert.ok(span.attributes.some(row => row.key === "db.system" || row.key === "db.system.name"));
      assert.ok(!span.attributes.some(row => ["db.statement", "db.query.text", "db.postgresql.values", "db.connection_string", "db.user"].includes(row.key)));
    }
    await provider.shutdown(); provider = undefined;
    for (const socket of sockets) socket.destroy();
    await Promise.all([new Promise(resolve => resp.close(resolve)), new Promise(resolve => collector.close(resolve))]);
    process.stdout.write(JSON.stringify({ semconv: process.env.OTEL_SEMCONV_STABILITY_OPT_IN || "legacy", rawAutoInstrumentationHasSyntheticPrivateContent: true, rawDatabaseAttributeKeys: [...new Set(raw.flatMap(span => Object.keys(span.attributes).filter(key => key.startsWith("db."))))].sort(), exportedPrivateContentAbsent: true, actualPostgresQueries: 2, actualIORedisGetAgainstRespDouble: 1, realRedisServerUsed: false, queryResultsUnchanged: true, traceDiagnosticsPreserved: true, collectorClosed: !collector.listening, respDoubleClosed: !resp.listening }));
  } finally {
    redis?.disconnect();
    await client?.end();
    await provider?.shutdown();
    pgInstrumentation.disable(); redisInstrumentation.disable();
    for (const socket of sockets) socket.destroy();
    if (resp.listening) await new Promise(resolve => resp.close(resolve));
    if (collector.listening) await new Promise(resolve => collector.close(resolve));
  }
})().catch(() => { process.stderr.write(JSON.stringify({ error: "synthetic-database-privacy-check-failed", stage: failureStage }) + "\n"); process.exitCode = 1; });
