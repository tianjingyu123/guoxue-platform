import "reflect-metadata";
import { validate } from "class-validator";
import { CreateRoomDto, UpdateRoomDto, UpdateRoomProductsDto } from "./live.dto";

describe("Live DTO 校验", () => {
  describe("CreateRoomDto", () => {
    it("合法输入通过", async () => {
      const dto = Object.assign(new CreateRoomDto(), { title: "国学直播", hostUserId: "u1" });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("带全部可选字段通过", async () => {
      const dto = Object.assign(new CreateRoomDto(), {
        circleId: "c1", title: "直播", description: "本场讲解十二宫位", cover: "https://example.com/cover.jpg",
        hostUserId: "u1", coHostIds: ["u2", "u3"], chargeType: "PAID",
        chargePrice: 99, productIds: ["p1", "p2"],
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("直播介绍超过 500 字时报错", async () => {
      const dto = Object.assign(new CreateRoomDto(), {
        title: "直播", description: "介".repeat(501),
      });
      expect((await validate(dto)).length).toBeGreaterThan(0);
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

    it("拒绝未知收费类型和负数票价", async () => {
      const invalidType = Object.assign(new UpdateRoomDto(), { chargeType: "UNKNOWN" });
      const negativePrice = Object.assign(new UpdateRoomDto(), { chargePrice: -1 });
      expect((await validate(invalidType)).length).toBeGreaterThan(0);
      expect((await validate(negativePrice)).length).toBeGreaterThan(0);
    });
  });

  describe("UpdateRoomProductsDto", () => {
    it("最多 5 件且无重复时通过", async () => {
      const dto = Object.assign(new UpdateRoomProductsDto(), { productIds: ["p1", "p2", "p3", "p4", "p5"] });
      expect(await validate(dto)).toHaveLength(0);
    });

    it("超过 5 件时报错", async () => {
      const dto = Object.assign(new UpdateRoomProductsDto(), { productIds: ["p1", "p2", "p3", "p4", "p5", "p6"] });
      expect((await validate(dto)).length).toBeGreaterThan(0);
    });

    it("重复商品时报错", async () => {
      const dto = Object.assign(new UpdateRoomProductsDto(), { productIds: ["p1", "p1"] });
      expect((await validate(dto)).length).toBeGreaterThan(0);
    });

    it("空数组允许清空本场商品", async () => {
      const dto = Object.assign(new UpdateRoomProductsDto(), { productIds: [] });
      expect(await validate(dto)).toHaveLength(0);
    });
  });
});
