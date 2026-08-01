import { STOCKLESS_ORDER_TYPES, isStocklessOrderType } from "./shop-order-types.constants";

describe("STOCKLESS_ORDER_TYPES 单一真源(后端审计P1-6)", () => {
  it("四类无实物库存订单全部纳入(修复前 shop-order 缺 PRACTITIONER_PRO / lifecycle 缺 STATION_MASTER+OPERATOR)", () => {
    expect([...STOCKLESS_ORDER_TYPES].sort()).toEqual(
      ["MEMBER", "OPERATOR", "PRACTITIONER_PRO", "STATION_MASTER"],
    );
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
