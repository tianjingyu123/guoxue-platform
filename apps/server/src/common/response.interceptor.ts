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
import { Readable } from "stream";
import { SKIP_FORMAT_KEY } from "./skip-format.decorator";

/** 统一成功响应格式 */
export interface ApiResponse<T = unknown> {
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
  private readonly skipPaths = ["/api-docs", "/health/metrics", "/graphql"];

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
        // 分页响应：提取数据数组到 data，分页信息到顶层 pagination
        if (this.isPaginatedResult(data)) {
          const d = data as Record<string, unknown>;
          const rowKey = this.getPaginatedRowKey(d);
          return {
            code: 200,
            data: d[rowKey],
            pagination: { total: d.total, page: d.page, pageSize: d.pageSize },
            message: "ok",
          };
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
    if (Buffer.isBuffer(data) || data instanceof Readable) return false;
    // 已包含 code + data 字段视为已包装
    return "code" in data && "data" in data;
  }

  /** 分页数据字段候选名（按优先级排序） */
  private static readonly PAGINATED_ROW_KEYS = ["rows", "items", "list", "data", "courses", "products", "members", "withdrawals", "circles", "users", "backups", "entries"];

  /** 检测是否为分页响应（标准 _paginated 标记 或 自动识别 { rows/items/..., total, page, pageSize } 模式） */
  private isPaginatedResult(data: unknown): boolean {
    if (data === null || data === undefined) return false;
    if (typeof data !== "object") return false;
    // 标准 paginated() 标记
    if ("_paginated" in data && (data as Record<string, unknown>)._paginated === true) return true;
    // 自动检测：必须有 total 字段 + page/pageSize + 数据数组
    const d = data as Record<string, unknown>;
    if (typeof d.total !== "number") return false;
    if (typeof d.page !== "number" && typeof d.pageSize !== "number") return false;
    return ResponseInterceptor.PAGINATED_ROW_KEYS.some((k) => Array.isArray(d[k]));
  }

  /** 从分页响应中提取数据数组字段名 */
  private getPaginatedRowKey(data: Record<string, unknown>): string {
    for (const key of ResponseInterceptor.PAGINATED_ROW_KEYS) {
      if (Array.isArray(data[key])) return key;
    }
    return "rows";
  }
}
