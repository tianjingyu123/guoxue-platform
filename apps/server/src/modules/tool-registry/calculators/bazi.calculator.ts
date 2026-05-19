// ── 八字排盘计算引擎 ──
// 封装 @guoxue/bazi-engine，提供统一的 tool-registry 接口

import type { BaziInput } from "@guoxue/bazi-engine";
import { calcBazi } from "@guoxue/bazi-engine";

/** 主计算函数 */
export function calculateBaZi(input: Record<string, unknown>): Record<string, unknown> {
  const baziInput: BaziInput = {
    name: (input.name as string) ?? "",
    gender: (input.gender as "男" | "女") ?? "男",
    year: (input.year as number) ?? 2000,
    month: (input.month as number) ?? 1,
    day: (input.day as number) ?? 1,
    hour: (input.hour as number) ?? 0,
    minute: (input.minute as number) ?? 0,
    city: (input.city as string) ?? "",
    longitude: input.longitude as number | undefined,
  };

  return calcBazi(baziInput) as unknown as Record<string, unknown>;
}
