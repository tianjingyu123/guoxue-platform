import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateOfflineCourseDto, UpdateOfflineCourseDto } from "./offline.dto";

describe("Offline 课程 DTO", () => {
  const base = {
    stationId: "station-1",
    title: "八字命理入门班",
    maxStudents: 30,
    startTime: "2030-06-01T09:00:00Z",
    endTime: "2030-06-01T17:00:00Z",
    location: "国学馆一层",
  };

  it("创建课程价格按元支持两位小数", async () => {
    const dto = plainToInstance(CreateOfflineCourseDto, { ...base, price: 99.5 });
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it("创建课程拒绝负价格和 0 名额", async () => {
    const dto = plainToInstance(CreateOfflineCourseDto, {
      ...base,
      price: -1,
      maxStudents: 0,
    });
    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(expect.arrayContaining(["price", "maxStudents"]));
  });

  it("编辑课程拒绝超过两位小数的价格", async () => {
    const dto = plainToInstance(UpdateOfflineCourseDto, { price: 99.999 });
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe("price");
  });

  it("编辑课程允许仅提交一个有效字段", async () => {
    const dto = plainToInstance(UpdateOfflineCourseDto, { title: "修改后的课程" });
    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
