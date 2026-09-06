/** 整套排盘的运行策略，不接受工具编号或单工具权限。 */
export type PaipanSuiteMode = "legacy" | "native";
// 沿用私有前缀，避免被通用配置写入、历史回滚或公开批量接口绕过。
export const PAIPAN_SUITE_MODE_KEY = "paipan.native-preview.mode";

export function normalizePaipanSuiteMode(value: unknown): PaipanSuiteMode {
  return typeof value === "string" && value.trim().toLowerCase() === "native"
    ? "native" : "legacy";
}

/** 数据库配置读取失败时不可依据客户端缓存开放另一套工具。 */
export function resolvePaipanSuiteAccess(input: {
  mode: PaipanSuiteMode;
  configurationVerified: boolean;
  previewVerified: boolean;
  miniProgramMaintenance: boolean;
}): { publicSuite: PaipanSuiteMode | null; nativeAllowed: boolean } {
  if (input.miniProgramMaintenance || !input.configurationVerified) {
    return { publicSuite: null, nativeAllowed: false };
  }
  return {
    publicSuite: input.mode,
    nativeAllowed: input.mode === "native" || input.previewVerified,
  };
}
