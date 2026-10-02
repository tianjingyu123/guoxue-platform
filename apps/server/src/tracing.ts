import { NodeSDK } from "@opentelemetry/sdk-node";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import { CompositePropagator } from "@opentelemetry/core";
import {
  W3CTraceContextPropagator,
  W3CBaggagePropagator,
} from "@opentelemetry/core";
import { B3Propagator } from "@opentelemetry/propagator-b3";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express";
import { PgInstrumentation } from "@opentelemetry/instrumentation-pg";
import { IORedisInstrumentation } from "@opentelemetry/instrumentation-ioredis";
import { PrivacySpanExporter } from "./common/privacy-span-exporter";

const tracingLog = (msg: string) => process.stderr.write(`[OpenTelemetry] ${msg}\n`);

const otlpEndpoint =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
  process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ||
  "http://localhost:4318/v1/traces";

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || "guoxue-platform",
    [ATTR_SERVICE_VERSION]: "0.0.1",
  }),
  spanProcessors: [new BatchSpanProcessor(new PrivacySpanExporter(new OTLPTraceExporter({ url: otlpEndpoint })))],
  textMapPropagator: new CompositePropagator({
    propagators: [
      new W3CTraceContextPropagator(),
      new W3CBaggagePropagator(),
      new B3Propagator(),
    ],
  }),
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
    new PgInstrumentation(),
    new IORedisInstrumentation(),
  ],
});

export async function startTracing() {
  try {
    await sdk.start();
    tracingLog("链路追踪已启动");
  } catch {
    tracingLog("链路追踪启动失败，继续运行");
  }
}

export async function stopTracing() {
  try {
    await sdk.shutdown();
    tracingLog("链路追踪已关闭");
  } catch {
    tracingLog("链路追踪关闭失败");
  }
}
