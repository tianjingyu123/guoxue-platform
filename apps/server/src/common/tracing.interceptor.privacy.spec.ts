import { CallHandler, ExecutionContext } from "@nestjs/common";
import { trace, SpanStatusCode } from "@opentelemetry/api";
import { lastValueFrom, of, throwError } from "rxjs";
import { TracingInterceptor } from "./tracing.interceptor";

describe("请求追踪隐私", () => {
  const marker = "synthetic-private-signature";
  const span = { setAttribute: jest.fn(), setStatus: jest.fn() };
  const context = { switchToHttp: () => ({ getRequest: () => ({ method: "POST",
    url: `/api/v1/im/callback?usersig=${marker}#${marker}`, route: { path: "/api/v1/im/callback" } }) }) } as ExecutionContext;
  beforeEach(() => { jest.clearAllMocks(); jest.spyOn(trace, "getActiveSpan").mockReturnValue(span as never); });
  afterEach(() => jest.restoreAllMocks());

  it("追踪只存路径，正常请求结果保留", async () => {
    const result = { value: marker };
    expect(await lastValueFrom(new TracingInterceptor().intercept(context, { handle: () => of(result) } as CallHandler))).toBe(result);
    expect(span.setAttribute).toHaveBeenCalledWith("http.url", "/api/v1/im/callback");
    expect(JSON.stringify(span.setAttribute.mock.calls)).not.toContain(marker);
  });

  it("IM异常保留错误状态和原异常传播，追踪不存异常原文", async () => {
    const error = new Error(marker);
    await expect(lastValueFrom(new TracingInterceptor().intercept(context, { handle: () => throwError(() => error) }))).rejects.toBe(error);
    expect(span.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.ERROR });
    expect(JSON.stringify(span.setStatus.mock.calls)).not.toContain(marker);
  });
});
