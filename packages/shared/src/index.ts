export * from "./types";
export * from "./constants";
export * from "./error-codes";
// 排盘算法真源走子路径 @guoxue/shared/paipan —— 不并入根导出，
// 因为 types/ 里已有同名的 Gan/Zhi/QimenResult（后端旧契约），并入会撞名。
