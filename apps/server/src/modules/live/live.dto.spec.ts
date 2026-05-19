import "reflect-metadata";
import { validate } from "class-validator";
import { CreateRoomDto, UpdateRoomDto } from "./live.dto";

describe("Live DTO 校验", () => {
  describe("CreateRoomDto", () => {
    it("合法输入通过", async () => {
      const dto = Object.assign(new CreateRoomDto(), { title: "国学直播", hostUserId: "u1" });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("带全部可选字段通过", async () => {
      const dto = Object.assign(new CreateRoomDto(), {
        circleId: "c1", title: "直播", cover: "https://example.com/cover.jpg",
        hostUserId: "u1", coHostIds: ["u2", "u3"], chargeType: "PAID",
        chargePrice: 99, productIds: ["p1", "p2"],
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("缺 title 报错", async () => {
      const dto = Object.assign(new CreateRoomDto(), { hostUserId: "u1" });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("hostUserId 可选通过", async () => {
      const dto = Object.assign(new CreateRoomDto(), { title: "直播" });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("coHostIds 为字符串报错", async () => {
      const dto = Object.assign(new CreateRoomDto(), {
        title: "直播", hostUserId: "u1", coHostIds: "not-array" as any,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("UpdateRoomDto", () => {
    it("空对象通过", async () => {
      const dto = Object.assign(new UpdateRoomDto(), {});
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("部分更新通过", async () => {
      const dto = Object.assign(new UpdateRoomDto(), { title: "新标题" });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});
