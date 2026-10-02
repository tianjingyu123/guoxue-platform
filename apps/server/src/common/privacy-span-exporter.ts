import type { Attributes } from "@opentelemetry/api";
import type { ExportResult } from "@opentelemetry/core";
import type { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";
import { requestLogPath } from "./request-log-path";

const URL_KEYS = new Set(["http.url", "http.target", "url.full", "url.original", "http.request.url"]);
const PRIVATE_KEY = /(?:^|[._-])(?:authorization|cookie|set-cookie|usersig|signature|token|password|secret)(?:$|[._-])/i;
const PRIVATE_FIELDS = new Set(["url.query", "url.fragment", "exception.message", "exception.stacktrace",
  "http.request.body", "http.response.body", "user.id", "enduser.id"]);

/** 导出前移除 URL 凭据、查询及片段，原请求和验签保持原样。 */
export function traceLogUrl(value: string): string {
  try {
    const url = new URL(value);
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return requestLogPath(value);
  }
}

function attributes(input: Attributes): Attributes {
  const output: Attributes = {};
  for (const [key, value] of Object.entries(input)) {
    if (PRIVATE_FIELDS.has(key) || PRIVATE_KEY.test(key)) continue;
    if (URL_KEYS.has(key)) {
      if (typeof value === "string") output[key] = traceLogUrl(value);
    } else {
      output[key] = value;
    }
  }
  return output;
}

/** 显式复制公开字段，不修改 SDK Span，也不把其内部原始字段交给下一层。 */
export function privateTraceSpan(span: ReadableSpan): ReadableSpan {
  return {
    name: span.name,
    kind: span.kind,
    spanContext: () => span.spanContext(),
    parentSpanContext: span.parentSpanContext,
    startTime: span.startTime,
    endTime: span.endTime,
    status: { code: span.status.code },
    attributes: attributes(span.attributes),
    links: span.links.map(link => ({ ...link, attributes: link.attributes ? attributes(link.attributes) : undefined })),
    events: span.events.map(event => ({ ...event, attributes: event.attributes ? attributes(event.attributes) : undefined })),
    duration: span.duration,
    ended: span.ended,
    resource: span.resource,
    instrumentationScope: span.instrumentationScope,
    droppedAttributesCount: span.droppedAttributesCount,
    droppedEventsCount: span.droppedEventsCount,
    droppedLinksCount: span.droppedLinksCount,
  };
}

export class PrivacySpanExporter implements SpanExporter {
  constructor(private readonly delegate: SpanExporter) {}

  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    this.delegate.export(spans.map(privateTraceSpan), resultCallback);
  }

  shutdown(): Promise<void> { return this.delegate.shutdown(); }
  forceFlush(): Promise<void> { return this.delegate.forceFlush?.() ?? Promise.resolve(); }
}
