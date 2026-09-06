import { normalizePaipanSuiteMode, resolvePaipanSuiteAccess } from "./paipan-suite-policy";

describe("整套排盘统一策略", () => {
  it("未知配置默认第三方模式，不自动开放自研", () => {
    for (const value of [undefined, null, "", "unknown", true, {}]) {
      expect(normalizePaipanSuiteMode(value)).toBe("legacy");
    }
    expect(normalizePaipanSuiteMode(" NATIVE ")).toBe("native");
  });
  it.each([false, true])("第三方模式仅有效预览资格可进入整套自研：%s", previewVerified => {
    expect(resolvePaipanSuiteAccess({ mode: "legacy", configurationVerified: true,
      previewVerified, miniProgramMaintenance: false })).toEqual({ publicSuite: "legacy", nativeAllowed: previewVerified });
  });
  it("显式切换自研后不再要求普通用户具有超级管理员预览资格", () => {
    expect(resolvePaipanSuiteAccess({ mode: "native", configurationVerified: true,
      previewVerified: false, miniProgramMaintenance: false })).toEqual({ publicSuite: "native", nativeAllowed: true });
  });
  it.each(["legacy", "native"] as const)("%s 模式下维护或配置未核实均不开放", mode => {
    for (const values of [[false, false], [true, true], [false, true]]) {
      expect(resolvePaipanSuiteAccess({ mode, configurationVerified: values[0],
        miniProgramMaintenance: values[1], previewVerified: true })).toEqual({ publicSuite: null, nativeAllowed: false });
    }
  });
});
