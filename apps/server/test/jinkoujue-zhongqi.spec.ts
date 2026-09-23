/**
 * 金口诀·中气法月将回归（2026-09-20）
 *
 * ══ 抓到的是什么 ══
 *
 * `lunar.getJieQiTable()` 是**按农历年**给的一张表，「冬至」那一条装的是
 * **上一个**冬至：查 2025-12-25 时表里写着 2024-12-21，当年 2025-12-21 那个
 * 要跨年后再查才出现。两个调用方（apps/mobile 适配层、`paipan.service.calcJinkoujue`）
 * 当初都只取了这一张表，于是每年 **12-22 ~ 12-31** 这十天找不到当年冬至、
 * 退回上一个中气小雪，**月将错一位（给寅，应丑）**——
 * 而盘面字段完整、月将也是个合法地支，肉眼分辨不出。实测 2022–2027 稳定复现。
 *
 * ★24 刚把默认换将方式从交节改成中气，所以这条错在**默认路径**上。
 *
 * ══ 判据为什么可信 ══
 *
 * 参照不是抄来的月将表，而是**把候选集补全后重算**：
 * 单张年表漏条目，那就把前后若干张年表并成一条完整时间轴，再取「最近一个已过中气」。
 * 附带一条**结构性判据**（写进了引擎的守卫里）：中气每月一个，相邻间隔最长 31.3 天
 * （2020–2030 实测最大值），所以「最近已过中气距今 > 32 天」一定是候选集缺了东西。
 *
 * 反证：参照必须覆盖全部 12 种月将，否则「零不符」可能只是参照是空的。
 */
import { Solar } from "lunar-javascript";
import { computeJinkoujue } from "@guoxue/shared/paipan";

const ZHONGQI: [string, string][] = [
  ["雨水", "亥"], ["春分", "戌"], ["谷雨", "酉"], ["小满", "申"], ["夏至", "未"], ["大暑", "午"],
  ["处暑", "巳"], ["秋分", "辰"], ["霜降", "卯"], ["小雪", "寅"], ["冬至", "丑"], ["大寒", "子"],
];
const JIANG: Record<string, string> = Object.fromEntries(ZHONGQI);

const lunarOf = (d: Date) =>
  (Solar as any).fromYmdHms(d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(), 0).getLunar();

const timesOf = (d: Date): { name: string; time: number }[] => {
  const t = lunarOf(d).getJieQiTable();
  const out: { name: string; time: number }[] = [];
  for (const name of Object.keys(t)) {
    if (!(name in JIANG)) continue;
    const jq = t[name];
    out.push({
      name,
      time: new Date(jq.getYear(), jq.getMonth() - 1, jq.getDay(), jq.getHour(), jq.getMinute()).getTime(),
    });
  }
  return out;
};

/** 调用方该怎么建表：合并「当日」与「45 天后」两张年表，同名取不晚于当下的最晚一个 */
function buildZhongqiTable(d: Date, mergeLater: boolean): Record<string, number> {
  const later = new Date(d.getTime() + 45 * 86400000);
  const lists = mergeLater ? [timesOf(d), timesOf(later)] : [timesOf(d)];
  const cand: Record<string, number[]> = {};
  for (const list of lists) for (const e of list) (cand[e.name] ??= []).push(e.time);
  const out: Record<string, number> = {};
  for (const [name, arr] of Object.entries(cand)) {
    const passed = arr.filter((t) => t <= d.getTime());
    out[name] = passed.length ? Math.max(...passed) : Math.min(...arr);
  }
  return out;
}

/** 独立参照：把前后多张年表并成完整时间轴，取最近一个已过的中气 */
function refJiang(d: Date): string {
  const all: { name: string; time: number }[] = [];
  for (const off of [-400, -180, -90, -30, 0, 30, 90, 180, 400]) {
    all.push(...timesOf(new Date(d.getTime() + off * 86400000)));
  }
  let best: { name: string; time: number } | null = null;
  for (const e of all) if (e.time <= d.getTime() && (!best || e.time > best.time)) best = e;
  return best ? JIANG[best.name] : "?";
}

function engineJiang(d: Date, mergeLater: boolean): string {
  const lun = lunarOf(d);
  return (computeJinkoujue as any)({
    date: d,
    difenMethod: "manual", difenZhi: "子",
    jiangMethod: "zhong", guirenSchool: "A", guiType: "auto",
    sizhu: {
      year: lun.getYearInGanZhiByLiChun(),
      month: lun.getMonthInGanZhiExact(),
      day: lun.getDayInGanZhiExact(),
      hour: lun.getTimeInGanZhi(),
    },
    zhongqiTable: buildZhongqiTable(d, mergeLater),
    jieqiRange: "",
    lunarLabel: "",
  }).yuejiang.zhi;
}

describe("金口诀·中气法月将", () => {
  // 逐日扫描较慢，取能覆盖问题的日期集：每年 12 月下旬（病灶）+ 每月 5/15/25（面上）
  const DAYS: Date[] = [];
  for (let y = 2022; y <= 2027; y++) {
    for (let d = 18; d <= 31; d++) DAYS.push(new Date(y, 11, d, 12, 0));
    for (let m = 1; m <= 12; m++) for (const d of [5, 15, 25]) DAYS.push(new Date(y, m - 1, d, 12, 0));
  }

  it("反证：参照覆盖全部 12 种月将（否则「零不符」可能只是参照是空的）", () => {
    const seen = new Set(DAYS.map(refJiang));
    expect([...seen].sort()).toEqual(ZHONGQI.map(([, z]) => z).sort());
  });

  it(`合并两张年表后，${DAYS.length} 个取样日的月将与独立参照逐日一致`, () => {
    const bad = DAYS.filter((d) => engineJiang(d, true) !== refJiang(d))
      .map((d) => `${d.toISOString().slice(0, 10)} 得${engineJiang(d, true)} 应${refJiang(d)}`);
    expect(bad).toEqual([]);
  });

  it("反证：只取单张年表的旧写法，病灶恰好落在每年 12-22~12-31（抛守卫 或 给寅将）", () => {
    /**
     * 这条验的是「病灶确实存在、且确实被拦住」。
     * 加守卫之前，旧写法在这些天会**静默**返回寅将（应丑）；
     * 现在它抛错——所以断言的是抛错的日子恰好就是那批日子，一天不多一天不少。
     * 写「应该失败」的断言，先问它失败的理由是不是我想验的那个：
     * 这里连带校了错误文案里的中气名（小雪）与陈旧天数（>32），
     * 免得它是因为别的原因抛错而蒙混过关。
     */
    const sick: Date[] = [];   // 旧写法出问题的日子（抛错 或 给错月将）
    for (const d of DAYS) {
      let got: string | null = null;
      try {
        got = engineJiang(d, false);
      } catch (e) {
        expect(String(e)).toMatch(/中气表不完整/);
        expect(String(e)).toMatch(/小雪/);   // 确认拦的是「退回小雪」这个病，不是别的错
        sick.push(d);
        continue;
      }
      if (got !== refJiang(d)) {
        expect(got).toBe("寅");              // 退回小雪·寅将
        expect(refJiang(d)).toBe("丑");       // 正解是冬至·丑将
        sick.push(d);
      }
    }
    expect(sick.length).toBeGreaterThan(0);
    // 病灶窗口就是「冬至之后到元旦」，不是满盘皆错
    for (const d of sick) {
      expect(d.getMonth()).toBe(11);
      expect(d.getDate()).toBeGreaterThanOrEqual(21);
    }
    /**
     * 注意这里**不能**要求守卫抓住全部病日：
     * 守卫的阈值 32 天是结构上限（中气相邻间隔最长 31.3 天），
     * 而紧挨冬至那两三天的陈旧度约 30~32 天，**落在合法区间内**，
     * 结构上无从分辨。全量扫 2022–2027：病日 60 天，守卫抓住 44 天，
     * 另外 16 天（每年冬至后头 2~3 日）只能靠合并两张表根治。
     * **守卫是安全网，合并才是修复**——别把网当成修。
     */
  });

  it("引擎守卫：喂进不完整的中气表要报错，不能静默给个陈旧月将", () => {
    const d = new Date(2025, 11, 25, 12, 0);
    const lun = lunarOf(d);
    const only小雪 = timesOf(d).find((e) => e.name === "小雪")!;
    expect(() =>
      (computeJinkoujue as any)({
        date: d, difenMethod: "manual", difenZhi: "子",
        jiangMethod: "zhong", guirenSchool: "A", guiType: "auto",
        sizhu: {
          year: lun.getYearInGanZhiByLiChun(), month: lun.getMonthInGanZhiExact(),
          day: lun.getDayInGanZhiExact(), hour: lun.getTimeInGanZhi(),
        },
        zhongqiTable: { 小雪: only小雪.time },
        jieqiRange: "", lunarLabel: "",
      }),
    ).toThrow(/中气表不完整/);
  });

  it("反证：完整的表不会触发守卫（确认守卫拦的是缺表、不是别的）", () => {
    expect(() => engineJiang(new Date(2025, 11, 25, 12, 0), true)).not.toThrow();
  });

  it("交节法不走中气表，不受影响", () => {
    const d = new Date(2025, 11, 25, 12, 0);
    const lun = lunarOf(d);
    const r = (computeJinkoujue as any)({
      date: d, difenMethod: "manual", difenZhi: "子",
      jiangMethod: "jie", guirenSchool: "A", guiType: "auto",
      sizhu: {
        year: lun.getYearInGanZhiByLiChun(), month: lun.getMonthInGanZhiExact(),
        day: lun.getDayInGanZhiExact(), hour: lun.getTimeInGanZhi(),
      },
      zhongqiTable: {},          // 故意给空表
      jieqiRange: "", lunarLabel: "",
    });
    // 交节法＝月建六合，与中气表无关
    const monthZhi = lun.getMonthInGanZhiExact()[1];
    const LIUHE: Record<string, string> = {
      子: "丑", 丑: "子", 寅: "亥", 亥: "寅", 卯: "戌", 戌: "卯",
      辰: "酉", 酉: "辰", 巳: "申", 申: "巳", 午: "未", 未: "午",
    };
    expect(r.yuejiang.zhi).toBe(LIUHE[monthZhi]);
  });
});
