import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { FeedbackCollaborationDto, QueryCollaborationDto, QueryEventDto } from "./ai-infra.dto";

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

describe("协作查询与反馈 DTO", () => {
  it("支持失败/执行中状态和字符串分页", () => {
    const dto = plainToInstance(QueryCollaborationDto, { status: "rollback_failed", limit: "20", offset: "40" });
    expect(validateSync(dto)).toHaveLength(0);
    expect(dto.limit).toBe(20);
  });

  it.each([{ limit: "101" }, { limit: "NaN" }, { offset: "-1" }, { offset: "100001" }, { status: "invented" }])("拒绝非法查询 %j", (input) => {
    expect(validateSync(plainToInstance(QueryCollaborationDto, input)).length).toBeGreaterThan(0);
  });

  it.each([0, 1.5, 6])("拒绝数据库 Int 字段不能接受的评分 %s", (rating) => {
    expect(validateSync(plainToInstance(FeedbackCollaborationDto, { rating })).length).toBeGreaterThan(0);
  });
});
