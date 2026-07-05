import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { PaginationQueryDto } from "./pagination-query.dto";

/** 模拟全局 ValidationPipe 的 transform（enableImplicitConversion 无关·@Type 显式转换） */
function parse(query: Record<string, unknown>) {
  const dto = plainToInstance(PaginationQueryDto, query);
  const errors = validateSync(dto, { whitelist: true });
  return { dto, errors };
}

describe("PaginationQueryDto", () => {
  it("合法数字串通过并转为 number", () => {
    const { dto, errors } = parse({ page: "3", pageSize: "10" });
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(3);
    expect(dto.pageSize).toBe(10);
  });

  it("缺省时用默认值 1 / 20", () => {
    const { dto, errors } = parse({});
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(1);
    expect(dto.pageSize).toBe(20);
  });

  it("非数字串(NaN) 在边界被拦(校验失败·不会 skip:NaN 进 Prisma)", () => {
    const { errors } = parse({ page: "abc" });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === "page")).toBe(true);
  });

  it("页码 < 1 被拒", () => {
    const { errors } = parse({ page: "0" });
    expect(errors.some((e) => e.property === "page")).toBe(true);
  });

  it("pageSize 超过上限 100 被拒", () => {
    const { errors } = parse({ pageSize: "500" });
    expect(errors.some((e) => e.property === "pageSize")).toBe(true);
  });

  it("pageSize < 1 被拒", () => {
    const { errors } = parse({ pageSize: "0" });
    expect(errors.some((e) => e.property === "pageSize")).toBe(true);
  });

  it("非整数(小数) 被拒", () => {
    const { errors } = parse({ page: "1.5" });
    expect(errors.some((e) => e.property === "page")).toBe(true);
  });

  it("边界值 pageSize=100 通过", () => {
    const { dto, errors } = parse({ pageSize: "100" });
    expect(errors).toHaveLength(0);
    expect(dto.pageSize).toBe(100);
  });
});
