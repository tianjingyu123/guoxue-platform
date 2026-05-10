import {
  Injectable,
  Optional,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { Request } from "express";
import { SKIP_FORMAT_KEY } from "./skip-format.decorator";

/** 统一成功响应格式 */
export interface ApiResponse<T = any> {
  code: number;
  data: T;
  message: string;
}

/**
 * 全局响应拦截器
 *
 * 将 controller 返回的原始数据包装为统一格式：
 *   { code: 200, data: <原始数据>, message: "ok" }
 *
 * 跳过包装的情况：
 *   - 已包含 code + data 字段的响应（防止双重包装）
 *   - 非 JSON 响应（文件流、Buffer 等）
 *   - /api-docs 路径（Swagger 文档）
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  /** 跳过包装的路径前缀 */
  private readonly skipPaths = ["/api-docs", "/health/metrics"];

  constructor(@Optional() private reflector?: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();

    // @SkipFormat() 装饰器标记的端点跳过包装
    const skipFormat = this.reflector?.get<boolean>(SKIP_FORMAT_KEY, context.getHandler());
    if (skipFormat) {
      return next.handle();
    }

    // 跳过非 JSON 路径
    if (this.shouldSkip(request.path)) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        // 已经是统一格式则不重复包装
        if (this.isAlreadyWrapped(data)) {
          return data;
        }
        return {
          code: 200,
          data,
          message: "ok",
        };
      }),
    );
  }

  private shouldSkip(path: string): boolean {
    return this.skipPaths.some((p) => path.startsWith(p));
  }

  private isAlreadyWrapped(data: unknown): boolean {
    if (data === null || data === undefined) return false;
    if (typeof data !== "object") return false;
    // Buffer / Stream / 文件响应跳过
    if (Buffer.isBuffer(data) || (data as any).pipe) return false;
    // 已包含 code + data 字段视为已包装
    return "code" in data && "data" in data;
  }
}
