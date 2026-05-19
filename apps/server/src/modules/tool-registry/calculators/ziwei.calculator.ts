// ── 紫微斗数排盘计算引擎 ──
// 封装 @guoxue/ziwei-engine，提供统一的 tool-registry 接口

import type { ZiweiInput, ZiweiResult } from "@guoxue/ziwei-engine";
import { calcZiwei } from "@guoxue/ziwei-engine";

/** 主计算函数 */
export function calculateZiWei(input: Record<string, unknown>): Record<string, unknown> {
  const ziweiInput: ZiweiInput = {
    name: (input.name as string) ?? "",
    gender: (input.gender as "男" | "女") ?? "男",
    year: (input.year as number) ?? 2000,
    month: (input.month as number) ?? 1,
    day: (input.day as number) ?? 1,
    hour: (input.hour as number) ?? 0,
    lunarMonth: (input.lunarMonth as number) ?? 1,
    lunarDay: (input.lunarDay as number) ?? 1,
    lunarHour: ((input.lunarHour as number) ?? 0) as any,
    lunarYearGan: ((input.lunarYearGan as string) ?? "甲") as any,
    lunarYearZhi: ((input.lunarYearZhi as string) ?? "子") as any,
  };

  return calcZiwei(ziweiInput) as unknown as Record<string, unknown>;
}
