// ── 奇门遁甲计算器（契约适配层）──
//
// 🔴 2026-07-14 去伪存真：本文件原先自带一整套奇门算法，与 C 端用户看到的盘**结果不同**。
//    实测（同一时刻，同为拆补法转盘）：
//      2026-07-14 09:00 → C 端：阳遁5局 值符天禽 值使死门 ／ 这里：阳遁2局 值符天辅 值使杜门
//      2024-06-21 14:00 → C 端：阴遁3局 值符天英 ／ 这里：6局 值符天蓬
//    8 个抽样时刻里 18 项不一致。也就是说，管理员在后台看到的盘，和用户看到的不是同一个盘。
//    对一个自称行业权威的平台，这不能存在。
//
//    现已删除那套未经校准的算法，改调全平台唯一真源 @guoxue/shared/paipan
//    （84 项奇门黄金测试逐值背书）。本文件现在只做**契约适配**：
//    把引擎结果映射成 admin 依赖的 QimenResult 形状。
//
//    ⚠️ 不要在这里写任何算法。要改算法就去改 shared，否则又会分叉出第二个真源。

import type { QimenResult, QimenGong, YinYangDun } from "@guoxue/shared";
import { computeQimen, computeQimenWithJu, PALACE_NAMES } from "@guoxue/shared/paipan";

/** 宫序号 → 八卦名 */
const BAGUA: Record<number, string> = {
  1: "坎", 2: "坤", 3: "震", 4: "巽", 5: "中", 6: "乾", 7: "兑", 8: "艮", 9: "离",
};

/** 引擎结果 → admin 契约 */
function toQimenResult(r: ReturnType<typeof computeQimen>): QimenResult & { summary: string } {
  const gongs: QimenGong[] = [];
  for (let i = 1; i <= 9; i++) {
    const p = r.palaces[i];
    if (!p) continue;
    gongs.push({
      index: i,
      name: PALACE_NAMES[i],
      bagua: BAGUA[i] ?? "",
      diPan: p.diGan,
      // 值符宫可能双干（引擎分 tianGan / tianGan2），拼给 admin 展示
      tianPan: [p.tianGan, p.tianGan2].filter(Boolean).join(""),
      star: [p.star, p.star2].filter(Boolean).join(""),
      men: p.men,
      shen: p.shen,
      // 契约之外的扩展字段：admin 的命理奇门页与既有单测要读暗干/地盘神/十二长生。
      // 值全部取自引擎，不在这里另算。
      anGan: p.anGan,
      dipanShen: p.diShen,
      changsheng: { tian: p.csTian, di: p.csDi },
    } as unknown as QimenGong);
  }

  const sz = r.sizhu;
  return {
    juNumber: r.ju.num,
    dunType: (r.ju.isYang ? "yang" : "yin") as YinYangDun,
    jieQi: r.ju.yuan,
    yongShi: `${sz.hour.gan}${sz.hour.zhi}`,
    zhiFu: r.zhifu.star,
    zhiShiMen: r.zhishi.men,
    gongs,
    dipanBashen: Array.from({ length: 9 }, (_, i) => r.palaces[i + 1]?.shen ?? ""),
    summary: `${r.ju.label} · 值符${r.zhifu.star}落${r.zhifu.palace}宫 · 值使${r.zhishi.men}落${r.zhishi.palace}宫`,
  } as QimenResult & { summary: string };
}

/** 阳盘奇门（转盘，与 C 端工具页同一套算法） */
export function calculateQimenYang(input: Record<string, unknown>): QimenResult {
  const d = new Date((input.datetime as string) ?? new Date().toISOString());

  // 自选局：走引擎的专用入口，不要自己另算
  const customJu = Number(input.customJu);
  if (customJu >= 1 && customJu <= 9) {
    const isYang = (input.dunType as string) !== "yin";
    return toQimenResult(computeQimenWithJu(d, isYang, customJu, { panMethod: "zhuan" }));
  }

  const startMethod = ((input.qiJuMethod as string) ?? "chaibu") as "zhirun" | "chaibu" | "maoshan";
  // 暗干起法（dipan=门地盘起 / zhishi=值使门起）——引擎支持，透传过去
  const anganMethod = ((input.anganMethod as string) ?? "dipan") as "dipan" | "zhishi";
  return toQimenResult(computeQimen(d, { panMethod: "zhuan", startMethod, anganMethod }));
}

/** 阴盘奇门（同一引擎，走飞盘） */
export function calculateQimenYin(input: Record<string, unknown>): QimenResult {
  const d = new Date((input.datetime as string) ?? new Date().toISOString());
  const startMethod = ((input.qiJuMethod as string) ?? "chaibu") as "zhirun" | "chaibu" | "maoshan";
  return toQimenResult(computeQimen(d, { panMethod: "fei", startMethod }));
}
