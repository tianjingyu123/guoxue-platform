import { validate } from "class-validator";
import { ExpertConfigDto } from "../modules/circle/circle.dto";
import { CONSULT_MAX_PRICE_PER_MINUTE, CONSULT_PREPAY_MINUTES, isValidConsultCallPrice } from "./consult-call-pricing";

describe("咨询配置与实际预扣使用同一数值边界", () => {
  it.each([-1, 1.5, NaN, Infinity, "8", null, undefined, 214748365, Number.MAX_SAFE_INTEGER])("非法价格不允许展示或保存：%s", value => {
    expect(isValidConsultCallPrice(value)).toBe(false);
    expect(isValidConsultCallPrice(value, true)).toBe(false);
  });
  it("零价仅用于关闭，最大可用价预扣不溢出", () => {
    expect(isValidConsultCallPrice(0)).toBe(false);
    expect(isValidConsultCallPrice(0, true)).toBe(true);
    expect(isValidConsultCallPrice(1)).toBe(true);
    expect(isValidConsultCallPrice(CONSULT_MAX_PRICE_PER_MINUTE)).toBe(true);
    expect(CONSULT_MAX_PRICE_PER_MINUTE * CONSULT_PREPAY_MINUTES).toBeLessThanOrEqual(2147483647);
    expect((CONSULT_MAX_PRICE_PER_MINUTE + 1) * CONSULT_PREPAY_MINUTES).toBeGreaterThan(2147483647);
  });
  it("HTTP DTO 也拒绝超界价格，不等到实际通话才失败", async () => {
    const dto = Object.assign(new ExpertConfigDto(), { questionPriceCoin: 0, questionTimeoutHours: 72, callPricePerMinuteCoin: CONSULT_MAX_PRICE_PER_MINUTE });
    expect(await validate(dto)).toEqual([]);
    dto.callPricePerMinuteCoin++;
    expect((await validate(dto)).map(error => error.property)).toEqual(["callPricePerMinuteCoin"]);
  });
});
