// ── 大六壬计算器（契约适配层）──
//
// 🔴 2026-07-14 去伪存真：本文件原先自带一套大六壬算法，**月将算错**。
//    月将随中气换将（大寒→子·神后、雨水→亥·登明、冬至→丑·大吉、大暑→午·胜光…），
//    是「月将加时」起天盘的根 —— 月将错，天盘、四课、三传、天将全盘皆错。
//    实测 8 个抽样时刻，月将 8/8 与 C 端不一致，且错得没规律：
//      2024-02-05（大寒后，应 子·神后）→ 旧实现给 丑·大吉
//      2025-03-15（雨水后，应 亥·登明）→ 旧实现给 寅·功曹
//      2000-08-08（大暑后，应 午·胜光）→ 旧实现给 未·小吉
//    日柱两边一致，说明基础历法没问题，错的就是月将这一步。
//    也就是说，管理员在后台看到的六壬盘，和用户看到的不是同一个盘。
//
//    现改调全平台唯一真源 @guoxue/shared/paipan（56 项黄金测试对竞品逐值校准过）。
//
//    取舍说明：旧实现里那套「课经断语/神煞/古籍出处」文案随之下线了。
//    它们不是错的，但它们是建立在**错盘**上的断语——盘都不对，断语再丰富也没意义。
//    现在断语取引擎的课体（keti）与取课过程（quKeNote），与 C 端用户看到的完全一致。
//
//    ⚠️ 不要在这里写任何算法。要改就去改 shared，否则又会分叉出第二个真源。

import type { DaLiuRenResult, LiuRenGong, SiKeColumn, Zhi } from "@guoxue/shared";
import { computeLiuren, ZHIS } from "@guoxue/shared/paipan";

/** 天将短名 → 全名（引擎内部用短名，admin 表格显示全名） */
const JIANG_FULL: Record<string, string> = {
  贵: "贵人", 蛇: "螣蛇", 雀: "朱雀", 合: "六合", 陈: "勾陈", 龙: "青龙",
  空: "天空", 虎: "白虎", 常: "太常", 玄: "玄武", 阴: "太阴", 后: "天后",
};
const full = (short: string): string => JIANG_FULL[short] ?? short;

export function calculateDaLiuRen(input: Record<string, unknown>): DaLiuRenResult {
  const datetime = (input.datetime as string) ?? new Date().toISOString();
  const d = new Date(datetime);
  const birthYear = input.birthYear as number | undefined;
  const gender = (input.gender as string) ?? "男";

  const r = computeLiuren(d, birthYear ? ({ birthYear, gender } as never) : {});
  const sz = r.sizhu;

  // 十二宫：地盘固定十二支，天盘/天将/遁干由引擎给
  const gongs: LiuRenGong[] = ZHIS.map((zhi) => ({
    zhi: zhi as Zhi,
    diPan: zhi,
    tianPan: r.tianPan[zhi],
    tianJiang: full(r.jiangPan[zhi]),
    dunGan: r.dunPan[zhi] || undefined,
  })) as LiuRenGong[];

  const siKe = r.sike.map((k, i) => ({
    index: i + 1,
    xiaZhi: k.xia,
    xiaGan: k.xia,
    shangZhi: k.shang,
    description: `${k.shang} 乘 ${full(k.jiang)}${k.dun ? ` 遁${k.dun}` : ""}`,
  })) as unknown as SiKeColumn[];

  const chuan = (c: (typeof r.sanchuan)[number]) => ({
    zhi: c.zhi,
    dunGan: c.dun || undefined,
    liuQin: c.qin,
    tianJiang: full(c.jiang),
    description: `${c.zhi}${c.dun ? `（遁${c.dun}）` : ""} ${c.qin} 乘 ${full(c.jiang)}${c.kong ? " 空亡" : ""}`,
  });

  const summary =
    `${sz.day.gan}${sz.day.zhi}日 ${r.yuejiang.name}（${r.yuejiang.zhi}）将加${sz.hour.zhi}时 · ` +
    `${r.guiren.isDay ? "昼" : "夜"}贵 · ${r.keti.join(" ")}`;

  return {
    input: { datetime, birthYear, gender } as never,
    zhanShi: sz.hour.zhi as Zhi,
    yueJiang: r.yuejiang.name,
    yueJiangZhi: r.yuejiang.zhi,
    dayNight: r.guiren.isDay ? "昼" : "夜",
    jieQi: r.jieqiText,
    riGanZhi: `${sz.day.gan}${sz.day.zhi}`,
    gongs,
    siKe,
    sanChuan: {
      chu: chuan(r.sanchuan[0]),
      zhong: chuan(r.sanchuan[1]),
      mo: chuan(r.sanchuan[2]),
    },
    // 引擎的 keti 首项即九宗门，其余为格局
    zongMen: r.keti[0] ?? "",
    zongMenDesc: r.quKeNote,
    tianJiangLayout: ZHIS.map((zhi) => ({
      zhi: zhi as Zhi,
      tianJiang: full(r.jiangPan[zhi]),
      dayNight: r.guiren.isDay ? "昼" : "夜",
    })),
    keJing: r.keti.map((name, i) => ({
      name,
      number: i + 1,
      summary: i === 0 ? r.quKeNote : "",
    })),
    kongWang: r.kongwang,
    // 神煞层：旧实现自带一份神煞表，但它是挂在**错盘**上的（月将错→天盘错→神煞落宫全错）。
    // shared 引擎不产出按地支索引的神煞（C 端六壬页也不显示这一层）。
    // 这里给空数组而不是 undefined —— 下游（奇门穿壬）会 for...of 它，给 undefined 会崩。
    // 要恢复这一层，正确做法是去 shared 引擎里补，而不是在这里重新手写一份。
    shenSha: [],
    summary,
  } as unknown as DaLiuRenResult;
}
