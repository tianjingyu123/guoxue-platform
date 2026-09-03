import "reflect-metadata";
import { validateSync } from "class-validator";
import { plainToInstance } from "class-transformer";
import { UpdateProfileDto } from "./user.dto";

describe("账号兴趣引导完成态 DTO", () => {
  it.each([{}, { interestGuideCompleted: true }, { interestCategories: [], interestGuideCompleted: true }])("接受兼容资料或单向完成：%j", (value) => {
    expect(validateSync(plainToInstance(UpdateProfileDto, value))).toHaveLength(0);
  });

  it.each([false, "true", "false", 1, {}])("拒绝重置或非布尔完成态：%j", (value) => {
    const errors = validateSync(plainToInstance(UpdateProfileDto, { interestGuideCompleted: value }));
    expect(errors.some((error) => error.property === "interestGuideCompleted")).toBe(true);
  });
});
