import { ArgumentsHost, HttpStatus } from "@nestjs/common";

jest.mock("./pino-logger.service", () => ({
  PinoLoggerService: {
    getInstance: () => ({ raw: () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }) }),
  },
}));
jest.mock("./alert", () => ({ sendAlert: jest.fn() }));
jest.mock("./request-context", () => ({ RequestContext: { traceId: () => "test-trace" } }));

import { AllExceptionsFilter } from "./http-exception.filter";

describe("AllExceptionsFilter — PrismaClientValidationError 归一 400", () => {
  function mockHost() {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const setHeader = jest.fn();
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status, json, setHeader, headersSent: false }),
        getRequest: () => ({ url: "/api/v1/circles?page=abc", method: "GET" }),
      }),
    } as unknown as ArgumentsHost;
    return { host, status, json };
  }

  it("skip:NaN 类查询构造错误(PrismaClientValidationError)映射为 400 而非 500", () => {
    const filter = new AllExceptionsFilter();
    const { host, status, json } = mockHost();
    // 真实运行时该错误 name === "PrismaClientValidationError"
    const err = new Error("Invalid `prisma.circle.findMany()` invocation\nArgument `skip` is missing.");
    err.name = "PrismaClientValidationError";

    filter.catch(err, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: HttpStatus.BAD_REQUEST }));
  });

  it("普通未知 Error 仍为 500", () => {
    const filter = new AllExceptionsFilter();
    const { host, status } = mockHost();
    filter.catch(new Error("boom"), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
  });
});
