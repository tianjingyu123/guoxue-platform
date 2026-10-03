import type { Attributes } from "@opentelemetry/api";
import { ExportResult, ExportResultCode } from "@opentelemetry/core";
import type { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { requestLogPath } from "./request-log-path";

const URL_KEYS = new Set(["http.url", "http.target", "url.full", "url.original", "http.request.url"]);
const PRIVATE_KEY = /(?:^|[._-])(?:authorization|cookie|set-cookie|usersig|signature|token|password|secret)(?:$|[._-])/i;
const PRIVATE_FIELDS = new Set(["url.query", "url.fragment", "exception.message", "exception.stacktrace",
  "http.request.body", "http.response.body", "user.id", "enduser.id", "db.connection_string", "db.user", "db.postgresql.values",
  "process.command_args", "process.command_line"]);
// SQL正文、参数及Redis键/参数可能包含业务身份，导出保留操作/系统/耗时而不保留内容。
const DATABASE_CONTENT_KEY = /^db\.(?:statement(?:$|[._-])|query[._-](?:text|parameters?)(?:$|[._-])|redis[._-](?:args|keys?)(?:$|[._-]))/i;

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
    const normalizedKey = key.toLowerCase();
    if (PRIVATE_FIELDS.has(normalizedKey) || PRIVATE_KEY.test(key) || DATABASE_CONTENT_KEY.test(key)) continue;
    if (URL_KEYS.has(normalizedKey)) {
      if (typeof value === "string") output[key] = traceLogUrl(value);
    } else {
      output[key] = value;
    }
  }
  return output;
}

/** 显式复制公开字段，不修改 SDK Span，也不把其内部原始字段交给下一层。 */
export function privateTraceSpan(span: ReadableSpan): ReadableSpan {
  if (span.resource.asyncAttributesPending) throw new Error("异步追踪资源尚未解析");
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
    resource: resourceFromAttributes(attributes(span.resource.attributes), { schemaUrl: span.resource.schemaUrl }),
    instrumentationScope: span.instrumentationScope,
    droppedAttributesCount: span.droppedAttributesCount,
    droppedEventsCount: span.droppedEventsCount,
    droppedLinksCount: span.droppedLinksCount,
  };
}

export class PrivacySpanExporter implements SpanExporter {
  private readonly pendingResources = new Set<Promise<void>>();
  constructor(private readonly delegate: SpanExporter) {}

  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    const pending = [...new Set(spans.filter(span => span.resource.asyncAttributesPending).map(span => span.resource))];
    if (pending.length === 0) {
      this.delegate.export(spans.map(privateTraceSpan), resultCallback);
      return;
    }
    // 标准SpanProcessor通常已经等待资源；直接调用Exporter也须等待，避免漏掉异步诊断字段。
    let completed = false;
    const finish = (result: ExportResult) => {
      if (completed) return;
      completed = true;
      resultCallback(result);
    };
    const task = Promise.all(pending.map(resource => resource.waitForAsyncAttributes?.()))
      .then(() => this.delegate.export(spans.map(privateTraceSpan), finish))
      .catch(() => finish({ code: ExportResultCode.FAILED, error: new Error("追踪资源解析或导出失败") }));
    this.pendingResources.add(task);
    void task.then(() => this.pendingResources.delete(task), () => this.pendingResources.delete(task));
  }

  async shutdown(): Promise<void> {
    await Promise.all([...this.pendingResources]);
    return this.delegate.shutdown();
  }
  async forceFlush(): Promise<void> {
    await Promise.all([...this.pendingResources]);
    await this.delegate.forceFlush?.();
  }
}
