import { ResponseInterceptor, ApiResponse } from "./response.interceptor";
import { of } from "rxjs";
import { ExecutionContext, CallHandler } from "@nestjs/common";

describe("ResponseInterceptor", () => {
  let interceptor: ResponseInterceptor<any>;

  beforeEach(() => {
    interceptor = new ResponseInterceptor();
  });

  const mockContext = (path: string): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ path }),
      }),
    } as any);

  const mockHandler = (data: any): CallHandler =>
    ({
      handle: () => of(data),
    } as any);

  it("普通对象被包装为 {code,data,message}", (done) => {
    const ctx = mockContext("/api/v1/users");
    const result = interceptor.intercept(ctx, mockHandler({ id: "1", name: "test" }));
    result.subscribe((r: ApiResponse) => {
      expect(r).toEqual({ code: 200, data: { id: "1", name: "test" }, message: "ok" });
      done();
    });
  });

  it("数组被包装", (done) => {
    const ctx = mockContext("/api/v1/users");
    const result = interceptor.intercept(ctx, mockHandler([{ id: "1" }, { id: "2" }]));
    result.subscribe((r: ApiResponse<unknown[]>) => {
      expect(r.code).toBe(200);
      expect(Array.isArray(r.data)).toBe(true);
      expect(r.data.length).toBe(2);
      done();
    });
  });

  it("已含 code+data 的对象不被重复包装", (done) => {
    const ctx = mockContext("/api/v1/recommend");
    const already = { code: 200, data: { items: [] }, message: "ok" };
    const result = interceptor.intercept(ctx, mockHandler(already));
    result.subscribe((r: any) => {
      expect(r).toBe(already);
      done();
    });
  });

  it("null 被正确包装", (done) => {
    const ctx = mockContext("/api/v1/test");
    const result = interceptor.intercept(ctx, mockHandler(null));
    result.subscribe((r: ApiResponse) => {
      expect(r).toEqual({ code: 200, data: null, message: "ok" });
      done();
    });
  });

  it("Swagger 路径跳过包装", (done) => {
    const ctx = mockContext("/api-docs/swagger-ui-bundle.js");
    const handler = mockHandler("swagger content");
    const result = interceptor.intercept(ctx, handler);
    result.subscribe((r: any) => {
      expect(r).toBe("swagger content");
      done();
    });
  });

  it("分页响应被正确包装（标准 _paginated 标记）", (done) => {
    const ctx = mockContext("/api/v1/courses");
    const data = { rows: [{ id: "1" }], total: 100, page: 1, pageSize: 10, _paginated: true };
    const result = interceptor.intercept(ctx, mockHandler(data));
    result.subscribe((r: any) => {
      expect(r.code).toBe(200);
      expect(r.data).toEqual([{ id: "1" }]);
      expect(r.pagination).toEqual({ total: 100, page: 1, pageSize: 10 });
      done();
    });
  });

  it("分页响应自动检测 { items, total, page, pageSize } 模式", (done) => {
    const ctx = mockContext("/api/v1/courses");
    const data = { items: [{ id: "1" }, { id: "2" }], total: 50, page: 2, pageSize: 20 };
    const result = interceptor.intercept(ctx, mockHandler(data));
    result.subscribe((r: any) => {
      expect(r.code).toBe(200);
      expect(r.data).toEqual([{ id: "1" }, { id: "2" }]);
      expect(r.pagination).toEqual({ total: 50, page: 2, pageSize: 20 });
      done();
    });
  });

  it("自动识别 { list, total, page, pageSize } 分页格式", (done) => {
    const ctx = mockContext("/api/v1/merchants");
    const data = { list: [{ id: "m1" }], total: 30, page: 1, pageSize: 15 };
    const result = interceptor.intercept(ctx, mockHandler(data));
    result.subscribe((r: any) => {
      expect(r.code).toBe(200);
      expect(r.data).toEqual([{ id: "m1" }]);
      expect(r.pagination).toEqual({ total: 30, page: 1, pageSize: 15 });
      done();
    });
  });

  it("缺少数据数组的对象不误判为分页响应", (done) => {
    const ctx = mockContext("/api/v1/users");
    const data = { id: "1", name: "test", total: 100, page: 1 };
    const result = interceptor.intercept(ctx, mockHandler(data));
    result.subscribe((r: any) => {
      expect(r.code).toBe(200);
      expect(r.data).toEqual({ id: "1", name: "test", total: 100, page: 1 });
      expect(r.pagination).toBeUndefined();
      done();
    });
  });
});
