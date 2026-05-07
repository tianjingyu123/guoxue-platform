import { validate } from "class-validator";
import { SendNotificationDto, BatchSendDto } from "./notification.dto";

describe("Notification DTO 校验", () => {
  describe("SendNotificationDto", () => {
    it("合法输入通过", async () => {
      const dto = Object.assign(new SendNotificationDto(), { type: "EARNING", title: "收益通知", content: "您收到一笔佣金" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("带 targetType/targetId 通过", async () => {
      const dto = Object.assign(new SendNotificationDto(), { type: "SYSTEM", title: "通知", content: "内容", targetType: "ORDER", targetId: "order-1" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("缺 type 报错", async () => {
      const dto = Object.assign(new SendNotificationDto(), { title: "通知", content: "内容" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("缺 title 报错", async () => {
      const dto = Object.assign(new SendNotificationDto(), { type: "SYSTEM", content: "内容" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("缺 content 报错", async () => {
      const dto = Object.assign(new SendNotificationDto(), { type: "SYSTEM", title: "通知" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
  });
  describe("BatchSendDto", () => {
    it("合法输入通过", async () => {
      const dto = Object.assign(new BatchSendDto(), { userIds: ["user-1", "user-2"], type: "SYSTEM", title: "群发", content: "群发测试" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("缺 userIds 报错", async () => {
      const dto = Object.assign(new BatchSendDto(), { type: "SYSTEM", title: "群发", content: "内容" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("userIds 不是数组报错", async () => {
      const dto = Object.assign(new BatchSendDto(), { userIds: "not-array", type: "SYSTEM", title: "群发", content: "内容" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
  });
});
