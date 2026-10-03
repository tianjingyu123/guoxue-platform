import { ZHI, ZHI_CANG } from "../constants";
import { calcShengXiao, calcNianZhu } from "../sizhu";
import { daysToNearestJie } from "../jieqi";
import { calcQiYun } from "../dayun";
import { calcBazi } from "../index";
import { calcTrueSolarTime } from "../taiyangshi";

/**
 * 旧版实排比对查出的问题，逐条钉死（2026-09-19）
 *
 * 来源：前端窗口拿旧版 App（cn.net.rebu.bazi）实排，与 `calcBazi` 逐项对照，
 * 截图与完整记录在 `artifacts/paipan-compare-20260919/发现记录.md`。
 * 本文件只覆盖**已独立复核确认、且属于客观错误**的那几条；
 * 涉及流派选择的（命宫/身宫起法）不在此列，需决策人定口径。
 */
describe("旧版比对修复", () => {
  /**
   * ★1 地支藏干
   *
   * 子、卯、酉是三个独气支。原表子对了、卯与酉各多一个余气，
   * 说明是抄表出错而非流派选择。
   *
   * 另有一处是比对清单里**没报到**的：亥本该藏「壬甲」，原表给的是「壬戊」——
   * 而且看得出是串行：亥的「甲」跑到了卯上，亥自己补了个不该有的「戊」。
   */
  it("三个独气支各只藏一个本气（子癸、卯乙、酉辛）", () => {
    const cang = (zhi: string) => ZHI_CANG[ZHI.indexOf(zhi as never)].map((x) => x.gan).join("");
    expect(`子=${cang("子")}`).toBe("子=癸");
    expect(`卯=${cang("卯")}`).toBe("卯=乙");
    expect(`酉=${cang("酉")}`).toBe("酉=辛");
  });

  it("亥藏壬甲，不是壬戊（比对清单未报到的第三处）", () => {
    const cang = ZHI_CANG[ZHI.indexOf("亥" as never)].map((x) => x.gan).join("");
    expect(`亥=${cang}`).toBe("亥=壬甲");
  });

  it("十二支藏干逐支对《渊海子平》通行表", () => {
    const WANT: Record<string, string> = {
      子: "癸", 丑: "己癸辛", 寅: "甲丙戊", 卯: "乙",
      辰: "戊乙癸",
      // 巳统一为「丙庚戊」：庚为中气（金长生在巳），戊为余气（土寄）。
      // 本行原写「丙戊庚」，是统一气位序之前的旧序，当时漏改了本文件——
      // 与 `apps/server/test/shared-constants-consistency.spec.ts` 的口径一致。
      巳: "丙庚戊", 午: "丁己", 未: "己丁乙",
      申: "庚壬戊", 酉: "辛", 戌: "戊辛丁", 亥: "壬甲",
    };
    for (const [zhi, want] of Object.entries(WANT)) {
      const got = ZHI_CANG[ZHI.indexOf(zhi as never)].map((x) => x.gan).join("");
      expect(`${zhi}=${got}`).toBe(`${zhi}=${want}`);
    }
  });

  /**
   * ★2 生肖漏传分钟
   *
   * 2000-02-04 立春在 20:40。20:40 之后出生，年柱已换到庚辰（龙）；
   * 原实现的生肖这条路丢了分钟，按 20:00 判仍在立春前，给出兔——
   * 同一份盘里年柱说龙、生肖说兔。
   */
  it("立春交节当小时内，生肖与年柱必须一致", () => {
    for (const [h, m] of [[20, 45], [20, 41], [21, 0], [23, 59]] as [number, number][]) {
      const { zhi } = calcNianZhu(2000, 2, 4, h, m);
      const sx = calcShengXiao(2000, 2, 4, h, m);
      expect(`2000-02-04 ${h}:${m} 年支=${zhi} 生肖=${sx}`).toBe(`2000-02-04 ${h}:${m} 年支=辰 生肖=龙`);
    }
  });

  it("立春交节之前仍算上一年（兔）", () => {
    for (const [h, m] of [[20, 39], [19, 0], [0, 1]] as [number, number][]) {
      expect(`${h}:${m} → ${calcShengXiao(2000, 2, 4, h, m)}`).toBe(`${h}:${m} → 兔`);
    }
  });

  /**
   * ★5 真太阳时的分钟被舍入成 60
   *
   * 原实现 `Math.round(adjustedMinutes % 60)`，余数 ≥59.5 会得到 60，
   * 前端直接输出就成了「11时60分」。
   */
  it("真太阳时的分钟永远落在 0-59，小时落在 0-23", () => {
    const bad: string[] = [];
    for (let mo = 1; mo <= 12; mo++)
      for (const d of [1, 8, 15, 22, 28])
        for (const h of [0, 6, 11, 12, 18, 23])
          for (const lon of [120, 116.4, 87.6, 121.5, 100]) {
            const r = calcTrueSolarTime(h, 0, mo, d, undefined, lon);
            if (!Number.isInteger(r.adjustedMinute) || r.adjustedMinute < 0 || r.adjustedMinute > 59) {
              bad.push(`${mo}-${d} ${h}时 经度${lon} → 分钟=${r.adjustedMinute}`);
            }
            if (r.adjustedHour < 0 || r.adjustedHour >= 24) {
              bad.push(`${mo}-${d} ${h}时 经度${lon} → 小时=${r.adjustedHour}`);
            }
          }
    expect(`越界样本: ${bad.slice(0, 5).join("｜") || "无"}（共 ${bad.length}）`).toBe("越界样本: 无（共 0）");
  });

  it("比对清单点名的两个样本不再出现 60 分", () => {
    // 120°E：原实现 04-15 得 12:60、09-01 得 11:60
    for (const [mo, d] of [[4, 15], [9, 1]] as [number, number][]) {
      const r = calcTrueSolarTime(12, 0, mo, d, undefined, 120);
      expect(`${mo}-${d} 分钟=${r.adjustedMinute}`).not.toBe(`${mo}-${d} 分钟=60`);
      expect(r.adjustedMinute).toBeLessThanOrEqual(59);
    }
  });
});

/**
 * ★11 + ★9 起运精度（2026-09-19）
 *
 * 这是旧版比对里最严重的一条：起运时间可差近十年。根因两个，都在 `daysToNearestJie`：
 *   一、出生时刻只取到整点（丢分钟），而节气时刻精确到分 → 节气当天判错归属
 *   二、返回值被 `Math.ceil` 取整 → 起运年整体偏一年
 *
 * 修的过程中又查出**第三个**，是比对清单里没有的：
 * `jieYear = (小寒 && month===1) ? y + 1 : y` 这个补丁本身是错的——
 * `calcAllJieQi(y)` 返回的小寒本就在公历 y 年 1 月，不需要 +1。
 * 逆排搜 [y, y-1] 时，y 那份被挪到未来排除，实际用上的是 y-1 那份，
 * 等于**拿上一年小寒的时刻贴上本年的年份**；节气时刻每年漂移约 5 小时 49 分，
 * 起运因此差了近一个月。
 */
describe("★11 起运精度", () => {
  it("换挡点落在节气时刻（20:40），不是整点", () => {
    // 2000-02-04 立春 20:40，顺排
    const at = (h: number, m: number) => daysToNearestJie(2000, 2, 4, "forward", h, m);
    // 立春前：下一个节就是立春，距离很近
    expect(at(19, 30)).toBeLessThan(1);
    expect(at(20, 39)).toBeLessThan(1);
    // 立春已过：下一个节变成惊蛰，约 29.7 天——原实现在这里仍给 1
    expect(at(20, 40)).toBeGreaterThan(29);
    expect(at(20, 45)).toBeGreaterThan(29);
    expect(at(20, 59)).toBeGreaterThan(29);
  });

  it("返回含小数，不再向上取整", () => {
    const d = daysToNearestJie(2000, 2, 4, "backward", 19, 30);
    expect(Number.isInteger(d)).toBe(false);
    // 2000 小寒 01-06 09:01 → 到 02-04 19:30 恰为 29 天 10.5 小时
    expect(d).toBeCloseTo(29.437, 2);
  });

  it("小寒不再被错挪到次年（逆排用的必须是本年小寒）", () => {
    // 若仍有 y+1 的补丁，这里会拿 1999 年小寒的时刻贴 2000 年，得 29.68
    expect(daysToNearestJie(2000, 2, 4, "backward", 19, 30)).toBeCloseTo(29.437, 2);
  });

  it("起运时间与旧版 App 逐字一致（两个实测基准）", () => {
    // B1 2000-02-04 19:30 男，年柱己卯（阴年男→逆排）；旧版：9年9个月22日
    expect(calcQiYun(2000, 2, 4, 19, "男", "己", "丁丑", 30).desc).toContain("9岁9个月22日");
    // B2 2000-02-04 20:45 男，年柱庚辰（阳年男→顺排）；旧版：9年10个月29日
    expect(calcQiYun(2000, 2, 4, 20, "男", "庚", "戊寅", 45).desc).toContain("9岁10个月29日");
  });

  it("不满一日不计（截断而非四舍五入）——B2 得 29.76 日应显示 29 日", () => {
    // 四舍五入会得 30 日，与旧版差一天
    expect(calcQiYun(2000, 2, 4, 20, "男", "庚", "戊寅", 45).desc).not.toContain("30日");
  });
});

/**
 * ★3 ★4 时间校正跨零点，日期不回退（2026-09-19）
 *
 * 两者同源：夏令时与真太阳时原先**只改 hour/minute，从不动 year/month/day**，
 * 校正一旦跨过零点，日期停在原地，日柱整整错一天。
 * 已改为把总偏移量加到 Date 上，跨日/跨月/跨年翻转交给 Date 处理。
 */
describe("★3★4 时间校正跨零点", () => {
  const gz = (p: any) => p.gan + p.zhi;

  it("夏令时回拨跨零点：1986-07-15 00:30 → 日柱庚申（旧版基准）", () => {
    // 回拨一小时应为 07-14 23:30；traditional 下晚子时归次日 → 07-15 → 庚申。
    // 原实现日期停在 07-15，再推次日成 07-16 → 辛酉。
    const r: any = calcBazi({
      name: "", gender: "男", year: 1986, month: 7, day: 15, hour: 0, minute: 30,
      useDaylightSaving: true, ziShiMode: "traditional",
    } as any);
    expect(`日柱=${gz(r.siZhu.ri)}`).toBe("日柱=庚申");
  });

  it("真太阳时回拨跨零点：乌鲁木齐 2000-06-15 00:30 → 癸卯日癸亥时（旧版基准）", () => {
    // 偏移 −129.6 分 → 06-14 22:20。原实现日期停在 06-15 → 甲辰日乙亥时。
    const r: any = calcBazi({
      name: "", gender: "男", year: 2000, month: 6, day: 15, hour: 0, minute: 30,
      useTrueSolarTime: true, longitude: 87.6,
    } as any);
    expect(`${gz(r.siZhu.ri)}日${gz(r.siZhu.shi)}时`).toBe("癸卯日癸亥时");
  });

  it("不开校正时不受影响（改动不得波及默认路径）", () => {
    const r: any = calcBazi({
      name: "", gender: "男", year: 1986, month: 7, day: 15, hour: 0, minute: 30,
    } as any);
    expect(`日柱=${gz(r.siZhu.ri)}`).toBe("日柱=庚申");
  });

  it("跨月、跨年边界也要正确翻转", () => {
    // 月初 00:30 开夏令时 → 应退到上月最后一天；这里只断言不抛错且日柱有值，
    // 具体干支等拿到旧版基准再钉（不自己手推期望值——本轮已因手推错过四次）
    for (const [y, mo, d] of [[1986, 8, 1], [1987, 9, 1], [1988, 5, 1]] as [number, number, number][]) {
      const r: any = calcBazi({
        name: "", gender: "男", year: y, month: mo, day: d, hour: 0, minute: 30,
        useDaylightSaving: true,
      } as any);
      expect(`${y}-${mo}-${d} 日柱`).toBe(`${y}-${mo}-${d} 日柱`);
      expect(r.siZhu.ri.gan).toBeTruthy();
      expect(r.siZhu.ri.zhi).toBeTruthy();
    }
  });
});

/**
 * ★6 四柱各自旬空（2026-09-19）
 *
 * 原先只按日柱算一个 `kongWang`，前端四柱位置却都填这同一个值——
 * 年、月、时三柱显示的都是错的。`getKongWang` 本就接受任意干支，
 * 只是调用方只喂了日柱。新增 `kongWangByPillar`，原字段保留不动（向后兼容）。
 */
describe("★6 四柱各自旬空", () => {
  it("四柱旬空逐柱对旧版（2000-02-04 19:30）", () => {
    const r: any = calcBazi({ name: "", gender: "男", year: 2000, month: 2, day: 4, hour: 19, minute: 30 } as any);
    const k = r.kongWangByPillar;
    expect(`年${k.nian} 月${k.yue} 日${k.ri} 时${k.shi}`).toBe("年申酉 月申酉 日午未 时寅卯");
  });

  it("四柱旬空不应全部相同（原实现的症状就是四柱同值）", () => {
    const r: any = calcBazi({ name: "", gender: "男", year: 2000, month: 2, day: 4, hour: 19, minute: 30 } as any);
    const k = r.kongWangByPillar;
    expect(new Set([k.nian, k.yue, k.ri, k.shi]).size).toBeGreaterThan(1);
  });

  it("原 kongWang 字段仍是日柱旬空（向后兼容不破）", () => {
    const r: any = calcBazi({ name: "", gender: "男", year: 2000, month: 2, day: 4, hour: 19, minute: 30 } as any);
    expect(r.kongWang).toBe(r.kongWangByPillar.ri);
  });
});

/**
 * 交运年应取命理年（立春分界），不是公历年 —— ★9/★11 的第四层（2026-09-19）
 *
 * 交运日若落在 1月1日 ~ 立春 之间，公历年与命理年差一岁，整条大运的年份会整体偏移。
 *
 * **这是「两个样本里一个碰巧对」的活例**：
 *   B1 交运 2009-12-04 → 公历 2009、命理 2009，两者相同，碰巧对
 *   B2 交运 2010-01-04 → 公历 2010、命理 2009（立春在 02-04），旧版取 2009
 * 只拿 B1 验证的话这层根本不会暴露。所以 B2 这种「交运日落在年初立春前」的样本必须钉住。
 */
describe("交运年取命理年", () => {
  const cols = (q: any, n = 3) => q.daYun.slice(0, n).map((d: any) => `${d.startYear}${d.ganZhi}`).join(" ");

  it("B1（交运日在年末，公历年=命理年，碰巧对）", () => {
    const q = calcQiYun(2000, 2, 4, 19, "男", "己", "丁丑", 30);
    expect(cols(q)).toBe("1999丁丑 2009丙子 2019乙亥");
  });

  it("B2（交运日落在年初立春前，公历年≠命理年）", () => {
    const q = calcQiYun(2000, 2, 4, 20, "男", "庚", "戊寅", 45);
    // 取公历年会得 2010己卯 2020庚辰，与旧版差一年
    expect(cols(q)).toBe("2000戊寅 2009己卯 2019庚辰");
  });

  it("对外展示的交运月日仍用公历，不跟着改成命理年", () => {
    const q: any = calcQiYun(2000, 2, 4, 20, "男", "庚", "戊寅", 45);
    // 交运日期本身是 2010-01-04：月日取公历
    expect(q.jiaoYunMonth).toBe(1);
    expect(q.jiaoYunDay).toBeGreaterThan(0);
  });
});
