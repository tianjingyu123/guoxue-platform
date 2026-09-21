import { STOCKLESS_ORDER_TYPES, isStocklessOrderType } from "./shop-order-types.constants";

describe("STOCKLESS_ORDER_TYPES 单一真源(后端审计P1-6)", () => {
  it("无实物库存订单全部纳入(修复前 shop-order 缺 PRACTITIONER_PRO / lifecycle 缺 STATION_MASTER+OPERATOR；2026-09-21 增 VOICE_MINUTES、XIAOBU_REPORT、XIAOBU_MEMBER)", () => {
    expect([...STOCKLESS_ORDER_TYPES].sort()).toEqual(
      ["MEMBER", "OPERATOR", "PRACTITIONER_PRO", "STATION_MASTER", "VOICE_MINUTES", "XIAOBU_MEMBER", "XIAOBU_REPORT"],
    );
  });

  it("VOICE_MINUTES（语音时长充值）判为无库存 → 下单不误入扣库存分支", () => {
    expect(isStocklessOrderType("VOICE_MINUTES")).toBe(true);
  });

  it("小卜报告 / 小卜AI会员判为无库存 → 下单不误入扣库存分支", () => {
    expect(isStocklessOrderType("XIAOBU_REPORT")).toBe(true);
    expect(isStocklessOrderType("XIAOBU_MEMBER")).toBe(true);
  });

  it("PRACTITIONER_PRO 判为无库存 → 下单不误入扣库存分支", () => {
    expect(isStocklessOrderType("PRACTITIONER_PRO")).toBe(true);
  });

  it("STATION_MASTER / OPERATOR 判为无库存 → 关单不误恢复库存", () => {
    expect(isStocklessOrderType("STATION_MASTER")).toBe(true);
    expect(isStocklessOrderType("OPERATOR")).toBe(true);
  });

  it("实物 PRODUCT 不在其中 → 正常扣/补库存", () => {
    expect(isStocklessOrderType("PRODUCT")).toBe(false);
  });
});
