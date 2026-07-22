import { CallHandler, ExecutionContext } from "@nestjs/common";
import { lastValueFrom, of } from "rxjs";
import { AuditInterceptor } from "./audit.interceptor";

describe("AuditInterceptor", () => {
  const audit = { log: jest.fn().mockResolvedValue({ id: "a1" }) };
  const interceptor = new AuditInterceptor(audit as any);

  beforeEach(() => jest.clearAllMocks());

  function contextOf(req: Record<string, any>): ExecutionContext {
    return {
      switchToHttp: () => ({ getRequest: () => req }),
      getHandler: () => function handler() {},
    } as unknown as ExecutionContext;
  }

  const next: CallHandler = { handle: () => of({ id: "target-1" }) };

  it("只读请求没有显式装饰器时不写日志", async () => {
    await lastValueFrom(interceptor.intercept(contextOf({ method: "GET" }), next));
    expect(audit.log).not.toHaveBeenCalled();
  });

  it("商家写操作记录店铺前缀且不写查询参数和请求体", async () => {
    const req = {
      method: "POST",
      originalUrl: "/api/v1/merchant-backend/products?keyword=敏感内容",
      url: "/products?keyword=敏感内容",
      merchant: { id: "merchant-1" },
      user: { id: "operator-1" },
      body: { title: "不应进入审计明细" },
      route: { path: "/products" },
      params: {},
      ip: "127.0.0.1",
    };

    await lastValueFrom(interceptor.intercept(contextOf(req), next));

    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      userId: "operator-1",
      targetId: "target-1",
      detail: "merchant:merchant-1 | POST /api/v1/merchant-backend/products",
    }));
    expect(audit.log.mock.calls[0][0].detail).not.toContain("敏感内容");
    expect(audit.log.mock.calls[0][0].detail).not.toContain("不应进入审计明细");
  });

  it("非商家写操作保持原有可读路径格式", async () => {
    const req = {
      method: "DELETE",
      originalUrl: "/api/v1/content/c1?force=true",
      user: { id: "admin-1" },
      route: { path: "/content/:id" },
      params: { id: "c1" },
    };

    await lastValueFrom(interceptor.intercept(contextOf(req), next));

    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      detail: "DELETE /api/v1/content/c1",
    }));
  });
});