import { evaluateOperation } from "./operation.util";
const scope = { applicationId: "rebu", platform: "android", channelId: "xiaomi" };
const flag = { key: "shop_checkout", enabled: true, percentage: 100, targetUserIds: [] };
describe("运营范围交集", () => {
  it("小米关闭不影响华为，未知客户端不能删头逃过关闭", () => {
    const f = { ...flag, scopeRules: [{ ...scope, state: "UNOPENED" }] };
    expect(evaluateOperation(f, "u1", scope)).toBe("UNOPENED");
    expect(evaluateOperation(f, "u1", { ...scope, channelId: "huawei" })).toBe("OPEN");
    expect(evaluateOperation(f, "u1")).toBe("UNOPENED");
  });
  it.each([false, true])("全局关闭不能被渠道 OPEN 或白名单重新开启 %s", (emergency) => {
    const f = {
      ...flag,
      enabled: emergency,
      emergencyDisabled: emergency,
      targetUserIds: ["u1"],
      scopeRules: [{ ...scope, state: "OPEN", targetUserIds: ["u1"] }],
    };
    expect(evaluateOperation(f, "u1", scope)).toBe("UNOPENED");
  });
  it.each(["READ_ONLY", "MAINTENANCE", "UNOPENED"] as const)("渠道不能把全局 %s 放宽", (state) => {
    expect(
      evaluateOperation(
        { ...flag, operationState: state, scopeRules: [{ ...scope, state: "OPEN" }] },
        "u1",
        scope,
      ),
    ).toBe(state);
  });
  it("构建边界和匿名灰度保守处理", () => {
    const f = {
      ...flag,
      scopeRules: [{ ...scope, state: "OPEN", minNativeBuild: "253", maxNativeBuild: "300" }],
    };
    expect(evaluateOperation(f, "u1", scope, "252")).toBe("UNOPENED");
    expect(evaluateOperation(f, "u1", scope, "301")).toBe("UNOPENED");
    expect(evaluateOperation(f, "u1", scope)).toBe("UNOPENED");
    expect(evaluateOperation(f, "u1", scope, "253")).toBe("OPEN");
    expect(evaluateOperation({ ...flag, percentage: 5 })).toBe("UNOPENED");
  });
});
