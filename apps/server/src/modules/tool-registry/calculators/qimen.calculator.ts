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
import { computeQimen, computeQimenWithJu, computeYinpanJu, PALACE_NAMES } from "@guoxue/shared/paipan";
import { calcAllJieQi } from "@guoxue/bazi-engine";

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
      /**
       * 四害与马星（2026-09-19 补）。
       *
       * 这几个字段引擎一直都有，契约层却没往外带——阳盘重格局，用不上；
       * 但**阴盘奇门断事必查四害**（空亡／入墓／击刑／门迫），
       * 取完象之后全靠它们定成色，少一个都读不准。
       * C 端阴盘页是直接读引擎结果才拿到的，后端报告走存库的 QimenResult，
       * 不补进来就等于把最关键的修正项丢在半路。
       */
      kongWang: p.kongWang,
      ruMu: p.ruMu,
      jiXing: p.jiXing,
      xingMu: p.xingMu,
      menPo: p.menPo,
      maXing: p.maXing,
      isZhifu: p.isZhifu,
      isZhishi: p.isZhishi,
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

/**
 * 阴盘奇门（同一引擎）。
 *
 * 🔴 2026-09-19 重写缘由：本目录原有一份独立的 `qimen-yin.calculator.ts`（277 行），
 * 采样 2024 全年 360 个时点后确认它是**编造的简化物**，已删除——
 * - 遁型**永远是阴遁**（180/180）：把「阴**盘**」（流派名）误当成「阴**遁**」（遁法）；
 * - **节气字段全空**（180/180）：奇门定局的根本依据完全没用；
 * - 局数只随**月支**查一张自称「简化算法」的自造表，同月内所有日期同局，
 *   时家奇门被做成了月家（3 月与 6 月都判 3 局），且只产出 1/3/5/7/9 五种局。
 * 它原本还被奇门针灸、奇门符咒、阴盘命理三个计算器当作盘源，一并改接到这里。
 *
 * 本函数此前写死 `panMethod: "fei"`（飞盘），且**沿用阳盘的拆补／置闰定局**——这是错的。
 * 阴盘奇门（道家阴盘奇门，王凤麟一路）按月亮走，自有一套定局法：
 *   局数 =（年支序数 + 农历月 + 农历日 + 时支序数）÷ 9 的余数，整除取 9
 * **完全不查节气表**，掌上可算，每个时辰换一盘；
 * 遁型仍分阴阳（冬至后夏至前阳遁、夏至后冬至前阴遁）——
 * 「阴盘」是流派名，不是「一律阴遁」的意思，这一点最常被误会。
 *
 * 定局实现在 `@guoxue/shared` 的 `computeYinpanJu`（含两个公开算例作基准），
 * 这里只补历法：农历月日与年支时支由 lunar-javascript 换算后传进去。
 * 排盘本身仍走 `computeQimenWithJu`，九宫推演与阳盘共用一套。
 *
 * ⚠️ **仍不加进 VERIFIED_TOOLS**：定局法已按通行讲法落地并有算例，
 * 但阴盘奇门是近二十余年成形的现代体系，没有《金函玉镜》那样来历明确的古籍，
 * 各家弟子讲法亦有出入（尤以天盘转法与暗干起法为甚）。
 * 等第三方 App 实测基准或决策人指定口径之后再放行。
 */
export function calculateQimenYin(input: Record<string, unknown>): QimenResult {
  const d = new Date((input.datetime as string) ?? new Date().toISOString());

  // 自选局：与阳盘一致，走引擎专用入口，不自己另算
  const customJu = Number(input.customJu);
  if (customJu >= 1 && customJu <= 9) {
    const isYangSel = (input.dunType as string) !== "yin";
    return toQimenResult(computeQimenWithJu(d, isYangSel, customJu, { panMethod: "zhuan", anganMethod: "zhishi" }));
  }

  const { isYang, num } = yinpanJuOf(d);
  // 暗干用值使起——重暗干是阴盘一路的做法，与 C 端 yinpan 页一致
  return toQimenResult(computeQimenWithJu(d, isYang, num, { panMethod: "zhuan", anganMethod: "zhishi" }));
}

/**
 * 按阴盘规则求某一时刻的局。
 *
 * 历法这一层留在后端：shared 不为一个农历转换背依赖（与小六壬同一处理方式）。
 * 阳遁／阴遁以冬至、夏至为界，用引擎既有的节气表判断——
 * 注意这里用节气**只是为了定遁型**，局数本身不查节气，这正是阴盘与阳盘的分水岭。
 */
function yinpanJuOf(d: Date): { isYang: boolean; num: number } {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Solar } = require("lunar-javascript");
  const solar = Solar.fromDate(d);
  const lunar = solar.getLunar();

  const yearZhi = String(lunar.getYearZhiByLiChun?.() ?? lunar.getYearZhi());
  const hourZhi = String(lunar.getTimeZhi());
  const lunarMonth = Math.abs(Number(lunar.getMonth())); // 闰月为负数，取绝对值按本月数
  const lunarDay = Number(lunar.getDay());

  /**
   * 冬至后夏至前为阳遁，夏至后冬至前为阴遁。用实际节气日判断，
   * 不拿月份近似——6 月 21 前后差一天就换遁。
   *
   * ⚠️ 不用 lunar 的 `getJieQiTable()`：它给的「冬至」是**上一个**冬至
   * （2024 年的日期查出来是 2023-12-22），拿它当上界会把 2024-12-15 判成阳遁，
   * 当下界又会把冬至当天（2024-12-21）判成阴遁。两头都错，第一版就栽在这里。
   * 改用 bazi-engine 的 `calcAllJieQi(year)`，它按公历年给出本年全部节气，语义明确。
   */
  const year = d.getFullYear();
  const at = (y: number, name: string, fallback: [number, number]): number => {
    const t = calcAllJieQi(y).get(name);
    const mm = t?.month ?? fallback[0];
    const dd = t?.day ?? fallback[1];
    return y * 10000 + mm * 100 + dd;
  };
  const ymdNum = year * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  const xiaZhi = at(year, "夏至", [6, 21]);
  const dongZhiThisYear = at(year, "冬至", [12, 21]);
  // 冬至（含当天）之后到次年夏至之前为阳遁
  const isYang = ymdNum < xiaZhi || ymdNum >= dongZhiThisYear;

  return computeYinpanJu({ yearZhi, lunarMonth, lunarDay, hourZhi, isYang });
}
