// 独立子进程测试实际启动模块，Collector在父进程以免被自动埋点形成循环。
const assert = require("node:assert/strict");
const { createServer } = require("node:http");
const { createRequire } = require("node:module");
const { resolve } = require("node:path");
const { promisify } = require("node:util");
const { execFile } = require("node:child_process");
const marker = "synthetic-unreviewed-signal-private-marker";
const serverRequire = createRequire(resolve(process.cwd(), "package.json"));

async function child(modulePath, baseUrl, mode) {
  const originalStdout = process.stdout.write.bind(process.stdout);
  let output = "";
  const capture = (chunk, encoding, callback) => {
    output += chunk.toString();
    if (typeof encoding === "function") encoding(); else callback?.();
    return true;
  };
  process.stdout.write = capture;
  process.stderr.write = capture;
  for (const name of Object.keys(process.env)) if (name.startsWith("OTEL_")) delete process.env[name];
  Object.assign(process.env, {
    OTEL_SDK_DISABLED: "false", OTEL_SERVICE_NAME: "synthetic-signals-service",
    OTEL_RESOURCE_ATTRIBUTES: `api.secret=${marker}`,
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: baseUrl + "/v1/traces",
    OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: baseUrl + "/v1/metrics",
    OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: baseUrl + "/v1/logs",
    OTEL_EXPORTER_OTLP_METRICS_PROTOCOL: "http/json", OTEL_EXPORTER_OTLP_LOGS_PROTOCOL: "http/json",
    OTEL_EXPORTER_OTLP_TIMEOUT: "3000", OTEL_METRIC_EXPORT_INTERVAL: "5000", OTEL_METRIC_EXPORT_TIMEOUT: "3000",
  });
  if (mode === "otlp") Object.assign(process.env, { OTEL_METRICS_EXPORTER: "otlp", OTEL_LOGS_EXPORTER: "otlp" });
  if (mode === "console") Object.assign(process.env, { OTEL_METRICS_EXPORTER: "console", OTEL_LOGS_EXPORTER: "console" });
  if (mode === "debug") process.env.OTEL_LOG_LEVEL = "DEBUG";
  const expectedLogLevel = process.env.OTEL_LOG_LEVEL;
  serverRequire("ts-node/register");
  const bootstrap = serverRequire(modulePath);
  assert.equal(process.env.OTEL_LOG_LEVEL, expectedLogLevel);
  const api = serverRequire("@opentelemetry/api");
  const sdkRequire = createRequire(serverRequire.resolve("@opentelemetry/sdk-node"));
  const { logs } = sdkRequire("@opentelemetry/api-logs");
  await bootstrap.startTracing();
  const span = api.trace.getTracer("synthetic-signals-tracer").startSpan("synthetic-trace");
  const traceId = span.spanContext().traceId;
  span.end();
  api.metrics.getMeter("synthetic-signals-meter").createCounter("synthetic_probe_count").add(1, { "api.secret": marker });
  logs.getLogger("synthetic-signals-logger").emit({ body: marker, attributes: { "user.id": marker } });
  await bootstrap.stopTracing();
  originalStdout(JSON.stringify({ traceId, consoleContainsSyntheticPrivateContext: output.includes(marker), originalLogLevelPreserved: process.env.OTEL_LOG_LEVEL === expectedLogLevel, sdkStopped: true }));
}

async function parent(modulePath, mode) {
  assert.ok(["default", "otlp", "console", "debug"].includes(mode));
  const packets = [];
  const collector = createServer((req, res) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => {
      const body = Buffer.concat(chunks);
      let traceIds = [];
      if (req.url === "/v1/traces") {
        traceIds = JSON.parse(body).resourceSpans.flatMap(resource => resource.scopeSpans.flatMap(scope => scope.spans.map(span => span.traceId)));
      }
      packets.push({ path: req.url, bytes: body.length, containsSyntheticPrivateContext: body.includes(Buffer.from(marker)), traceIds });
      res.writeHead(200, { "content-type": "application/json" }); res.end("{}");
    });
  });
  try {
    await new Promise(resolve => collector.listen(0, "127.0.0.1", resolve));
    const { stdout } = await promisify(execFile)(process.execPath, [__filename, "--child", modulePath, `http://127.0.0.1:${collector.address().port}`, mode], { cwd: process.cwd(), env: process.env, timeout: 20000, maxBuffer: 1048576 });
    const producer = JSON.parse(stdout);
    const traces = packets.filter(packet => packet.path === "/v1/traces");
    assert.ok(traces.length > 0 && traces.some(packet => packet.traceIds.includes(producer.traceId)));
    assert.ok(traces.every(packet => !packet.containsSyntheticPrivateContext));
    await new Promise(resolve => collector.close(resolve));
    const metrics = packets.filter(packet => packet.path === "/v1/metrics");
    const logs = packets.filter(packet => packet.path === "/v1/logs");
    process.stdout.write(JSON.stringify({ mode, traces: traces.length, traceIdPreserved: true, tracePrivateContextAbsent: true, metrics: metrics.length, metricPrivateContextDetected: metrics.some(packet => packet.containsSyntheticPrivateContext), logs: logs.length, logPrivateContextDetected: logs.some(packet => packet.containsSyntheticPrivateContext), consolePrivateContextDetected: producer.consoleContainsSyntheticPrivateContext, originalLogLevelPreserved: producer.originalLogLevelPreserved, collectorClosed: !collector.listening, sdkStopped: producer.sdkStopped, noProductionEndpointUsed: true }));
  } finally {
    if (collector.listening) await new Promise(resolve => collector.close(resolve));
  }
}

(process.argv[2] === "--child" ? child(process.argv[3], process.argv[4], process.argv[5]) : parent(process.argv[2], process.argv[3]))
  .catch(() => { process.stderr.write("本机OTel信号隔离探针失败\n"); process.exitCode = 1; });
