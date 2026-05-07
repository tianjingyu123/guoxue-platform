import { validate } from "class-validator";
import { ConfigUpdateDto, WithdrawalApplyDto, WithdrawalAuditDto, CreateReferralDto } from "./commission.dto";

describe("Commission DTO 校验", () => {
  describe("ConfigUpdateDto", () => {
    it("空对象校验通过（所有字段可选）", async () => {
      const dto = Object.assign(new ConfigUpdateDto(), {});
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
    it("合法的 rateA 通过", async () => {
      const dto = Object.assign(new ConfigUpdateDto(), { rateA: 0.1 });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
    it("字符串 rateA 报错", async () => {
      const dto = Object.assign(new ConfigUpdateDto(), { rateA: "abc" });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
  describe("WithdrawalApplyDto", () => {
    it("合法输入（银行）校验通过", async () => {
      const dto = Object.assign(new WithdrawalApplyDto(), {
        amount: 200, bankName: "建设银行", bankAccount: "622700123456789", bankHolder: "张三",
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
    it("合法输入（支付宝）校验通过", async () => {
      const dto = Object.assign(new WithdrawalApplyDto(), { amount: 200, alipayAccount: "test@alipay.com" });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
    it("缺 amount 报错", async () => {
      const dto = Object.assign(new WithdrawalApplyDto(), { alipayAccount: "test@alipay.com" });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
    it("amount 为字符串报错", async () => {
      const dto = Object.assign(new WithdrawalApplyDto(), { amount: "abc" });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
  describe("WithdrawalAuditDto", () => {
    it("合法状态 APPROVED 通过", async () => {
      const dto = Object.assign(new WithdrawalAuditDto(), { status: "APPROVED" });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
    it("合法状态 PAID 通过", async () => {
      const dto = Object.assign(new WithdrawalAuditDto(), { status: "PAID" });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
    it("合法状态 REJECTED 通过", async () => {
      const dto = Object.assign(new WithdrawalAuditDto(), { status: "REJECTED", remark: "信息不完整" });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
    it("非法状态报错", async () => {
      const dto = Object.assign(new WithdrawalAuditDto(), { status: "INVALID" });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
    it("缺 status 报错", async () => {
      const dto = Object.assign(new WithdrawalAuditDto(), {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
  describe("CreateReferralDto", () => {
    it("合法输入通过", async () => {
      const dto = Object.assign(new CreateReferralDto(), { targetType: "COURSE", targetId: "course-123" });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
    it("带 channel 通过", async () => {
      const dto = Object.assign(new CreateReferralDto(), { targetType: "PRODUCT", targetId: "prod-456", channel: "WECHAT" });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
    it("缺 targetType 报错", async () => {
      const dto = Object.assign(new CreateReferralDto(), { targetId: "abc" });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
