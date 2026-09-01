import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { QueryEventDto } from "./ai-infra.dto";

describe("QueryEventDto", () => {
  it("把 HTTP 查询字符串转换为合法分页整数", () => {
    const dto = plainToInstance(QueryEventDto, { limit: "10", offset: "0" });

    expect(dto.limit).toBe(10);
    expect(dto.offset).toBe(0);
    expect(validateSync(dto)).toHaveLength(0);
  });

  it.each([
    [{ limit: "0" }, "limit 下限"],
    [{ limit: "101" }, "limit 上限"],
    [{ limit: "1.5" }, "limit 整数"],
    [{ offset: "-1" }, "offset 下限"],
    [{ offset: "0.5" }, "offset 整数"],
  ])("拒绝非法分页参数：%s（%s）", (input, _label) => {
    const dto = plainToInstance(QueryEventDto, input);

    expect(validateSync(dto).length).toBeGreaterThan(0);
  });
});
