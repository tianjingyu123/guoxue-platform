import { LoggerService } from "@nestjs/common";
import pino, { Logger } from "pino";
import { RequestContext } from "./request-context";

/**
 * Pino 实现 NestJS LoggerService
 * 全局替换默认 Logger，所有 new Logger("X").log(...) 自动转为 JSON 结构化输出
 */
export class PinoLoggerService implements LoggerService {
  private static instance: PinoLoggerService;
  private readonly pino: Logger;

  static getInstance(): PinoLoggerService {
    if (!PinoLoggerService.instance) {
      PinoLoggerService.instance = new PinoLoggerService();
    }
    return PinoLoggerService.instance;
  }

  constructor() {
    const isProd = process.env.NODE_ENV === "production";

    this.pino = pino({
      level: process.env.LOG_LEVEL ?? (isProd ? "info" : "debug"),
      redact: {
        paths: [
          "password", "newPassword", "oldPassword",
          "token", "accessToken", "refreshToken",
          "authorization", "headers.authorization",
          "apiKey", "secretKey", "secret",
          "ENCRYPTION_KEY", "JWT_SECRET",
          "bankAccount", "idCard", "creditCard",
          "req.headers.authorization", "req.headers.cookie",
        ],
        censor: "[REDACTED]",
      },
      ...(isProd
        ? {}
        : {
            transport: {
              target: "pino-pretty",
              options: { colorize: true, translateTime: "yyyy-mm-dd HH:MM:ss.l", ignore: "pid,hostname,traceId" },
            },
          }),
      base: { pid: process.pid, service: "guoxue-server" },
      messageKey: "msg",
      formatters: {
        level(label) {
          return { level: label };
        },
        log(obj) {
          // 注入当前请求的 traceId
          const traceId = RequestContext.traceId();
          if (traceId) (obj as any).traceId = traceId;
          return obj;
        },
      },
    });
  }

  log(message: unknown, ...optionalParams: unknown[]) {
    const { msg, ctx } = this.extract(message, optionalParams);
    this.pino.info({ context: ctx }, msg);
  }

  error(message: unknown, ...optionalParams: unknown[]) {
    const { msg, ctx } = this.extract(message, optionalParams);
    // optionalParams 中可能包含 stack trace
    const stack = optionalParams.find((p) => typeof p === "string" && p.includes("\n"));
    this.pino.error({ context: ctx, stack }, msg);
  }

  warn(message: unknown, ...optionalParams: unknown[]) {
    const { msg, ctx } = this.extract(message, optionalParams);
    this.pino.warn({ context: ctx }, msg);
  }

  debug(message: unknown, ...optionalParams: unknown[]) {
    const { msg, ctx } = this.extract(message, optionalParams);
    this.pino.debug({ context: ctx }, msg);
  }

  verbose(message: unknown, ...optionalParams: unknown[]) {
    const { msg, ctx } = this.extract(message, optionalParams);
    this.pino.trace({ context: ctx }, msg);
  }

  /** 获取内部 pino 实例，供 filter/interceptor 直接使用 */
  raw(): Logger {
    return this.pino;
  }

  /** 解析 NestJS Logger 的 message + optionalParams → { msg, ctx } */
  private extract(message: unknown, params: unknown[]): { msg: string; ctx?: string } {
    const filtered = params.filter((p) => p !== undefined && p !== null);
    // NestJS Logger 将 context 作为最后一个参数传递
    const ctx = filtered.length > 0 ? String(filtered[filtered.length - 1]) : undefined;
    return { msg: typeof message === "string" ? message : JSON.stringify(message), ctx };
  }
}
