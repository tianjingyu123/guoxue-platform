import { ArgumentsHost, HttpStatus } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaValidationExceptionFilter } from "./prisma-exception.filter";

describe("PrismaValidationExceptionFilter", () => {
  function mockHost(): { host: ArgumentsHost; status: jest.Mock; json: jest.Mock } {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ url: "/api/v1/shop/orders/my?page=abc", method: "GET" }),
      }),
    } as unknown as ArgumentsHost;
    return { host, status, json };
  }

  it("将 PrismaClientValidationError 映射为 400 而非 500", () => {
    const filter = new PrismaValidationExceptionFilter();
    const { host, status, json } = mockHost();
    const err = new Prisma.PrismaClientValidationError(
      "Invalid `prisma.order.findMany()` invocation\nArgument `skip`: Got invalid value NaN",
      { clientVersion: "6.19.3" } as unknown as ConstructorParameters<typeof Prisma.PrismaClientValidationError>[1],
    );

    filter.catch(err, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: HttpStatus.BAD_REQUEST, path: expect.stringContaining("page=abc") }),
    );
  });
});
