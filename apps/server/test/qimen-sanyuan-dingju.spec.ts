import * as fs from "fs";
import * as path from "path";

/**
 * 奇门三元定局表·跨文件一致性（2026-09-20）
 *
 * ══ 抓到的是什么 ══
 *
 * 仓库里有三张二十四节气三元定局表：
 *   packages/shared/src/paipan/qimen-engine.ts      （时家奇门，已验证）
 *   apps/mobile/src/pkg-paipan/lib/shanxiang-engine.ts（山向奇门）
 *   apps/mobile/src/pkg-paipan/lib/chuanren-engine.ts （奇门穿壬）—— 已切除
 *
 * 穿壬那张表的尾部三格写成 立冬四七一 / 小雪三六九 / 大雪二五八，
 * 正确应为 立冬六九三 / 小雪五八二 / 大雪四七一。
 * 错因：秋分七 → 寒露六 → 霜降五 之后顺手继续递减成 四、三、二，
 * 而真表在立冬处回跳（寒露与立冬同局、霜降与小雪同局）。
 * 旁证：阴遁上元的合法值域是 {9,8,7,6,5,4,2,1}，"3"根本不可能出现。
 * 影响面：立冬~大雪约 45 天/年（全年 1/8），局数全错 ⇒ 值符值使九宫皆错。
 *
 * ══ 本测试守什么（判据全可推导，不抄参考书）══
 *
 * ① 同节气三元成等差：阳遁 -3、阴遁 +3（mod 9）
 * ② 二至对称：节气 i 与 i+12 的上元局数必和为 10
 * ③ 24 节气齐全，阳遁冬至→芒种 12 个、阴遁夏至→大雪 12 个
 * ④ 两张表逐格一致
 * ⑤ 穿壬引擎不得再自带定局表（必须复用 shared 的 determineJu）
 */

const ROOT = path.resolve(__dirname, "../../..");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

const JIEQI = [
  "冬至", "小寒", "大寒", "立春", "雨水", "惊蛰", "春分", "清明", "谷雨", "立夏", "小满", "芒种",
  "夏至", "小暑", "大暑", "立秋", "处暑", "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪",
];

type Entry = { yang: boolean; ju: number[] };

function parseShared(): Record<string, Entry> {
  const out: Record<string, Entry> = {};
  const re = /(\S+?): \{ yang: (true|false), ju: \[(\d), (\d), (\d)\] \}/g;
  for (const m of read("packages/shared/src/paipan/qimen-engine.ts").matchAll(re))
    out[m[1]] = { yang: m[2] === "true", ju: [+m[3], +m[4], +m[5]] };
  return out;
}

function parseShanxiang(): Record<string, Entry> {
  const out: Record<string, Entry> = {};
  const re = /yang: (true|false), ju: \[(\d), (\d), (\d)\], jieqi: "(\S+?)"/g;
  for (const m of read("apps/server/src/modules/paipan/engine/shanxiang-engine.ts").matchAll(re))
    out[m[5]] = { yang: m[1] === "true", ju: [+m[2], +m[3], +m[4]] };
  return out;
}

const TABLES: [string, Record<string, Entry>][] = [
  ["shared/qimen-engine", parseShared()],
  ["mobile/shanxiang-engine", parseShanxiang()],
];

describe.each(TABLES)("奇门三元定局表 · %s", (_name, T) => {
  it("反证：24 个节气都解析到了（解析失败会让下面全变空跑）", () => {
    expect(Object.keys(T).sort()).toEqual([...JIEQI].sort());
    // 且每格都是 1~9 的三元
    for (const j of JIEQI) {
      expect(T[j].ju).toHaveLength(3);
      for (const v of T[j].ju) expect(v).toBeGreaterThanOrEqual(1), expect(v).toBeLessThanOrEqual(9);
    }
  });

  it("① 同节气三元等差：阳遁 -3 / 阴遁 +3（mod 9）", () => {
    const bad: string[] = [];
    for (const j of JIEQI) {
      const { ju, yang } = T[j];
      const step = yang ? 6 : 3; // -3 ≡ +6 (mod 9)
      for (let k = 0; k < 2; k++)
        if (((ju[k] + step - 1) % 9) + 1 !== ju[k + 1]) bad.push(`${j} ${ju.join("")}`);
    }
    expect(bad).toEqual([]);
  });

  it("② 二至对称：节气 i 与 i+12 的上元局数和为 10", () => {
    const bad: string[] = [];
    for (let i = 0; i < 12; i++) {
      const a = T[JIEQI[i]].ju[0], b = T[JIEQI[i + 12]].ju[0];
      if (a + b !== 10) bad.push(`${JIEQI[i]}${a} + ${JIEQI[i + 12]}${b} = ${a + b}`);
    }
    expect(bad).toEqual([]);
  });

  it("③ 阳遁冬至→芒种 12 节气、阴遁夏至→大雪 12 节气", () => {
    expect(JIEQI.filter((j) => T[j].yang)).toEqual(JIEQI.slice(0, 12));
    expect(JIEQI.filter((j) => !T[j].yang)).toEqual(JIEQI.slice(12));
  });

  it("④ 阴遁上元只能取 {9,8,7,6,5,4,2,1}（3 为非法值，曾据此定位穿壬表错）", () => {
    const legal = new Set([9, 8, 7, 6, 5, 4, 2, 1]);
    const bad = JIEQI.slice(12).filter((j) => !legal.has(T[j].ju[0]));
    expect(bad).toEqual([]);
  });
});

describe("奇门三元定局表 · 跨文件", () => {
  it("两张表逐格一致", () => {
    const [[, A], [, B]] = TABLES;
    const diff = JIEQI.filter((j) => A[j].yang !== B[j].yang || A[j].ju.join() !== B[j].ju.join());
    expect(diff).toEqual([]);
  });

  it("⑤ 穿壬引擎不得再自带定局表 / 自制连续排局，须复用 determineJu", () => {
    const src = read("apps/server/src/modules/paipan/engine/chuanren-engine.ts");
    // 查的是语义不是字面：determineJu 要导进来、要拿 date 调、默认要落在本脉口径上
    // 2026-09-21 穿壬引擎迁至服务端，determineJu 改从 shared 入口导入（同一份实现）
    expect(src).toMatch(/import \{[^}]*determineJu[^}]*\} from "@guoxue\/shared\/paipan"/);
    expect(src).toMatch(/determineJu\(date,/);
    expect(src).toMatch(/input\.startMethod \?\? "chaibu"/);
    // 下面这些是被切除的自制实现的残迹
    expect(src).not.toMatch(/^const JU_WHEEL/m);
    expect(src).not.toMatch(/^function continuousJu/m);
    expect(src).not.toMatch(/^const ANCHOR_UTC/m);
  });

  /**
   * ⑥ 王凤麟一脉口径一致性（2026-09-20 决策人确认穿壬与阴盘奇门、山向奇门同脉）
   *
   * 阴盘奇门页硬编码 'chaibu' 且副标题写明「拆补定局」；穿壬必须同口径。
   * 传统时家奇门页默认 'zhirun' 置闰、四法可切，**不属本脉**，两者不得互相看齐。
   */
  it("⑥ 穿壬与阴盘奇门同为拆补；与传统时家奇门（置闰四法可切）区分开", () => {
    const chuanren = read("apps/server/src/modules/paipan/engine/chuanren-engine.ts");
    // 2026-09-21 阴盘起局迁至服务端，拆补口径现写在服务端注册表的 yinpan 条目里
    const yinpan = read("apps/server/src/modules/paipan/engine/engine-registry.ts");
    const qimen = read("apps/mobile/src/pkg-paipan/qimen/result.vue");

    // 反证：三份源码都真读到了，否则下面全是空跑
    for (const [n, t] of [["chuanren", chuanren], ["yinpan", yinpan], ["qimen", qimen]] as const) {
      expect(`${n}:${t.length > 500}`).toBe(`${n}:true`);
    }

    expect(yinpan).toMatch(/startMethod: p\.juLabel \? "custom" : "chaibu"/);
    expect(chuanren).toMatch(/input\.startMethod \?\? "chaibu"/);
    // 传统时家奇门是另一脉：默认置闰
    expect(qimen).toMatch(/startMethod: 'zhirun'/);

    // 穿壬页不提供定局法切换（本脉只有一个口径，与阴盘奇门页做法一致）
    const chuanrenPage = read("apps/mobile/src/pkg-paipan/chuanren/index.vue");
    expect(chuanrenPage).not.toMatch(/maoshan|zhirun/);
    expect(chuanrenPage).toMatch(/拆补定局/);
  });
});
