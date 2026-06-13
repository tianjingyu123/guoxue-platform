// ── 八字排盘计算引擎 ──
// 算法参考：《渊海子平》《三命通会》《滴天髓》
// 封装 @guoxue/bazi-engine，提供统一的 tool-registry 接口

import type { BaziInput } from "@guoxue/bazi-engine";
import { calcBazi } from "@guoxue/bazi-engine";

/** 主计算函数 */
export function calculateBaZi(input: Record<string, unknown>): Record<string, unknown> {
  // 真太阳时：支持 trueSolar (前端) 和 useTrueSolarTime (API直接调用)
  const useTrueSolarTime = input.trueSolar === true || input.useTrueSolarTime === true
  // 夏令时：支持 daylightSaving (前端) 和 useDaylightSaving (API直接调用)
  const useDaylightSaving = input.daylightSaving === true || input.useDaylightSaving === true
  // 早晚子时：将前端 'early-late' 映射为引擎 'modern'
  const rawZiShi = (input.ziShiMode as string) || 'traditional'
  const ziShiMode = rawZiShi === 'early-late' ? 'modern' : rawZiShi

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
    useTrueSolarTime,
    useDaylightSaving,
    ziShiMode: ziShiMode as "traditional" | "modern",
  };

  const result = calcBazi(baziInput) as unknown as Record<string, any>;

  const siZhu = result.siZhu as any;
  const riGan = siZhu?.ri?.gan ?? "?";
  const riZhi = siZhu?.ri?.zhi ?? "?";
  const riWx = siZhu?.ri?.wuXing ?? "?";
  const wxDist = result.wuXingEnergy as any;
  const geJu = result.geJu as any;

  const wxBar = wxDist
    ? ["金", "水", "木", "火", "土"].map(w => w + " " + "█".repeat(Math.round((wxDist[w] || 0) / 5))).join(" ")
    : "";

  const summary = [
    "┌──────────────────────────────────────┐",
    "│        八字排盘 · 四柱推命            │",
    "├──────────────────────────────────────┤",
    "│ 姓名：" + ((result.input as any)?.name || "—").padEnd(30) + "│",
    "│ 日主：" + riGan + riZhi + " · " + riWx + "命" + " ".repeat(25) + "│",
    "│ 四柱：" + (siZhu?.nian?.gan ?? "?") + (siZhu?.nian?.zhi ?? "?") + " " + (siZhu?.yue?.gan ?? "?") + (siZhu?.yue?.zhi ?? "?") + " " + riGan + riZhi + " " + (siZhu?.shi?.gan ?? "?") + (siZhu?.shi?.zhi ?? "?") + " ".repeat(20) + "│",
    "│ 生肖：" + (result.shengXiao || "—").padEnd(30) + "│",
    "│ 空亡：" + (result.kongWang || "—").padEnd(30) + "│",
    "│ 格局：" + (geJu?.name || geJu?.pattern || "—").padEnd(30) + "│",
    "│ 旺衰：" + (result.wangXiang || "—").padEnd(30) + "│",
    "│ 五行：  " + wxBar.padEnd(26) + "│",
    "├──────────────────────────────────────┤",
    "│ 出处：《渊海子平》《三命通会》        │",
    "│ 历法参校《协纪辨方书》钦定本          │",
    "│ 日柱用bazi-engine纯数学天文算法       │",
    "└──────────────────────────────────────┘",
  ].join("\n");

  return { ...result, summary } as Record<string, unknown>;
}
