import { Injectable } from "@nestjs/common";
import { collectDefaultMetrics, Counter, Histogram, Gauge, Registry } from "prom-client";

@Injectable()
export class MetricsService {
  private readonly register: Registry;

  readonly httpRequestsTotal: Counter<string>;
  readonly httpRequestDuration: Histogram<string>;
  readonly httpRequestsInFlight: Gauge<string>;

  constructor() {
    this.register = new Registry();
    collectDefaultMetrics({ register: this.register, prefix: "guoxue_" });

    this.httpRequestsTotal = new Counter({
      name: "guoxue_http_requests_total",
      help: "HTTP 请求总数",
      labelNames: ["method", "path", "status"],
      registers: [this.register],
    });

    this.httpRequestDuration = new Histogram({
      name: "guoxue_http_request_duration_seconds",
      help: "HTTP 请求延迟 (秒)",
      labelNames: ["method", "path"],
      buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5, 10],
      registers: [this.register],
    });

    this.httpRequestsInFlight = new Gauge({
      name: "guoxue_http_requests_in_flight",
      help: "当前正在处理的请求数",
      registers: [this.register],
    });
  }

  async metrics(): Promise<string> {
    return this.register.metrics();
  }

  contentType(): string {
    return this.register.contentType;
  }
}
