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
    result.subscribe((r: ApiResponse) => {
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

  it("分页响应被正确包装", (done) => {
    const ctx = mockContext("/api/v1/courses");
    const paginated = { items: [{ id: "1" }], total: 100, page: 1, pageSize: 10 };
    const result = interceptor.intercept(ctx, mockHandler(paginated));
    result.subscribe((r: ApiResponse) => {
      expect(r.code).toBe(200);
      expect(r.data.items).toBeDefined();
      expect(r.data.total).toBe(100);
      done();
    });
  });
});
