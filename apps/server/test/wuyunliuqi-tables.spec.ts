import * as fs from "fs";
import * as path from "path";

/**
 * 五运六气·表结构可推导性（2026-09-20）
 *
 * ══ 这套体系的表一张都不用抄 ══
 *
 * `apps/server/src/modules/paipan/engine/wuyunliuqi-data.ts`（2026-09-21 自前端迁入）里那几张表，
 * 每一张都能从更基本的规则生成出来：
 *
 *  ① **十干化运 = 五合成运**：合干同运（甲己/乙庚/丙辛/丁壬/戊癸），
 *     且五运按**相生序自土起**排 —— 甲土 乙金 丙水 丁木 戊火，土→金→水→木→火
 *  ② **地支化气 = 对冲支同气**（支 i 与 i+6 同气），
 *     且自子起恰为三阴三阳序轮转一位：`ZHI_SITIAN[支i] === GUEST_QI_SEQUENCE[(i+1) % 6]`
 *  ③ **司天在泉相对**：在三阴三阳序上相隔 3，且互为对合（自反）
 *  ④ **主气六步按五行相生**：厥阴风木 → 少阴君火 → 少阳相火 → 太阴湿土 → 阳明燥金 → 太阳寒水，
 *     五行序为 木火火土金水（君火相火同属火）
 *  ⑤ **六步节气边界**：各步恰跨 4 个节气（60 天），六步首尾相接成环、合围 24 节气，初之气始于大寒
 *
 * ══ 运行时部分 ══
 *
 * `artifacts/paipan-compare-20260919/wuyunliuqi-verify.mts`：
 * 1984–2103 两个甲子共 120 年全枚举 ——
 * 岁运太过/不及 = 阳干/阴干、岁运覆盖 10 种、司天在泉覆盖 6 种且按支稳定、
 * 客气三之气 = 司天且终之气 = 在泉、相邻步沿三阴三阳序 +1、主气六步恒定、
 * 客主相得判定（相生或同气为相得、相克为不相得）—— 全过。
 * 客主关系分布 harmony 280 / same 160 / conflict 280。
 */

const ROOT = path.resolve(__dirname, "../../..");
const SRC = fs.readFileSync(
  path.join(ROOT, "apps/server/src/modules/paipan/engine/wuyunliuqi-data.ts"), "utf8",
);

const GANS = "甲乙丙丁戊己庚辛壬癸".split("");
const ZHIS = "子丑寅卯辰巳午未申酉戌亥".split("");
const JIEQI24 = [
  "小寒", "大寒", "立春", "雨水", "惊蛰", "春分", "清明", "谷雨", "立夏", "小满", "芒种", "夏至",
  "小暑", "大暑", "立秋", "处暑", "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪", "冬至",
];
const SHENG: Record<string, string> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
const WUHE: Record<string, string> = {
  甲: "己", 己: "甲", 乙: "庚", 庚: "乙", 丙: "辛", 辛: "丙", 丁: "壬", 壬: "丁", 戊: "癸", 癸: "戊",
};
const YUN_WX: Record<string, string> = { earth: "土", metal: "金", water: "水", wood: "木", fire: "火" };

function rec(name: string, valPat: string): Record<string, string> {
  const blk = new RegExp(`export const ${name}[^=]*=\\s*\\{([\\s\\S]*?)\\n\\}`).exec(SRC);
  if (!blk) throw new Error(`${name} 没解析到`);
  const out: Record<string, string> = {};
  for (const m of blk[1].matchAll(new RegExp(`(\\S+?):\\s*"(${valPat})"`, "g"))) out[m[1]] = m[2];
  return out;
}
function arr(name: string): string[] {
  const m = new RegExp(`export const ${name}[^=]*=\\s*\\[([^\\]]+)\\]`).exec(SRC);
  if (!m) throw new Error(`${name} 没解析到`);
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}

const GAN_YUN = rec("GAN_YUN", "[a-z]+");
const ZHI_SITIAN = rec("ZHI_SITIAN", "[a-z]+");
const SITIAN_ZAIQUAN = rec("SITIAN_ZAIQUAN", "[a-z]+");
const HOST_QI_ORDER = arr("HOST_QI_ORDER");
const GUEST_QI_SEQUENCE = arr("GUEST_QI_SEQUENCE");

describe("五运六气 · 十干化运（五合成运）", () => {
  it("反证：十干全解析到（解析失败会让下面全变空跑）", () => {
    expect(Object.keys(GAN_YUN).sort()).toEqual([...GANS].sort());
    expect(new Set(Object.values(GAN_YUN)).size).toBe(5);
  });

  it("① 合干同运：甲己/乙庚/丙辛/丁壬/戊癸 各自同化一运", () => {
    const bad = GANS.filter((g) => GAN_YUN[g] !== GAN_YUN[WUHE[g]]);
    expect(bad).toEqual([]);
  });

  it("① 五运按相生序自土起：甲土 乙金 丙水 丁木 戊火", () => {
    let cur = "土";
    const got: string[] = [], want: string[] = [];
    for (let i = 0; i < 5; i++) {
      got.push(GANS[i] + YUN_WX[GAN_YUN[GANS[i]]]);
      want.push(GANS[i] + cur);
      cur = SHENG[cur];
    }
    expect(got).toEqual(want);
  });

  it("反证：改成「自木起」必须报红", () => {
    let cur = "木";
    const bad = GANS.slice(0, 5).filter((g) => {
      const ok = YUN_WX[GAN_YUN[g]] === cur;
      cur = SHENG[cur];
      return !ok;
    });
    expect(bad.length).toBeGreaterThan(0);
  });
});

describe("五运六气 · 地支化气", () => {
  it("反证：十二支全解析到，六气各配两支", () => {
    expect(Object.keys(ZHI_SITIAN).sort()).toEqual([...ZHIS].sort());
    const cnt: Record<string, number> = {};
    for (const z of ZHIS) cnt[ZHI_SITIAN[z]] = (cnt[ZHI_SITIAN[z]] ?? 0) + 1;
    expect(Object.values(cnt)).toEqual([2, 2, 2, 2, 2, 2]);
  });

  it("② 对冲支同气（支 i 与 i+6）", () => {
    const bad = ZHIS.filter((z, i) => ZHI_SITIAN[z] !== ZHI_SITIAN[ZHIS[(i + 6) % 12]]);
    expect(bad).toEqual([]);
  });

  it("② 自子起恰为三阴三阳序轮转一位", () => {
    const bad: string[] = [];
    for (let i = 0; i < 12; i++) {
      const want = GUEST_QI_SEQUENCE[(i + 1) % 6];
      if (ZHI_SITIAN[ZHIS[i]] !== want) bad.push(`${ZHIS[i]}=${ZHI_SITIAN[ZHIS[i]]} 应${want}`);
    }
    expect(bad).toEqual([]);
  });

  it("反证：轮转量改成 0，十二支不得有一支仍对", () => {
    const still = ZHIS.filter((z, i) => ZHI_SITIAN[z] === GUEST_QI_SEQUENCE[i % 6]);
    expect(still).toEqual([]);
  });
});

describe("五运六气 · 司天在泉", () => {
  it("③ 在三阴三阳序上相隔 3，且互为对合", () => {
    expect(Object.keys(SITIAN_ZAIQUAN).sort()).toEqual([...GUEST_QI_SEQUENCE].sort());
    const bad: string[] = [];
    for (const q of GUEST_QI_SEQUENCE) {
      const z = SITIAN_ZAIQUAN[q];
      const d = ((GUEST_QI_SEQUENCE.indexOf(z) - GUEST_QI_SEQUENCE.indexOf(q)) % 6 + 6) % 6;
      if (d !== 3) bad.push(`${q}→${z} 隔${d}`);
      if (SITIAN_ZAIQUAN[z] !== q) bad.push(`${q} 非自反`);
    }
    expect(bad).toEqual([]);
  });
});

describe("五运六气 · 主气与客气序", () => {
  it("④ 主气六步五行序为 木火火土金水（君火相火同属火）", () => {
    // QI_MAP 的条目形如 `key: "jueyin",` … `element: "木",`——逐个 key 向后找最近的 element，
    // 比整块切稳：切块的正则遇到嵌套对象会失手（我第一次就切成了 null，测试当场报红）
    const el: Record<string, string> = {};
    for (const k of GUEST_QI_SEQUENCE) {
      const at = SRC.indexOf(`key: "${k}"`);
      expect(`${k}:${at > -1}`).toBe(`${k}:true`);
      const m = /element: "(.)"/.exec(SRC.slice(at));
      expect(m).not.toBeNull();
      el[k] = m![1];
    }
    expect(Object.keys(el).sort()).toEqual([...GUEST_QI_SEQUENCE].sort());
    expect(HOST_QI_ORDER.map((q) => el[q]).join("")).toBe("木火火土金水");
  });

  it("客气序为三阴三阳：厥阴 少阴 太阴 少阳 阳明 太阳", () => {
    expect(GUEST_QI_SEQUENCE).toEqual(["jueyin", "shaoyin", "taiyin", "shaoyang", "yangming", "taiyang"]);
  });

  it("主气序与客气序是同一批六气的两种排列（不得多也不得少）", () => {
    expect([...HOST_QI_ORDER].sort()).toEqual([...GUEST_QI_SEQUENCE].sort());
    expect(HOST_QI_ORDER).not.toEqual(GUEST_QI_SEQUENCE); // 两者确实不同序
  });
});

describe("五运六气 · 六步节气边界", () => {
  const blk = /export const STEP_BOUNDARIES = \[([\s\S]*?)\n\] as const/.exec(SRC)!;
  const steps = [...blk[1].matchAll(/step: (\d), label: "(\S+?)", start: "(\S+?)", end: "(\S+?)"/g)]
    .map((m) => ({ step: +m[1], label: m[2], start: m[3], end: m[4] }));

  it("反证：六步全解析到且编号 1–6", () => {
    expect(steps).toHaveLength(6);
    expect(steps.map((s) => s.step)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("⑤ 各步恰跨 4 个节气（60 天）", () => {
    const idx = (t: string) => JIEQI24.indexOf(t);
    const bad = steps
      .map((s) => ({ s, span: ((idx(s.end) - idx(s.start)) % 24 + 24) % 24 }))
      .filter((x) => x.span !== 4)
      .map((x) => `${x.s.label} 跨${x.span}`);
    expect(bad).toEqual([]);
  });

  it("⑤ 六步首尾相接成环，初之气始于大寒", () => {
    expect(steps[0].start).toBe("大寒");
    for (let i = 0; i < 6; i++) expect(steps[i].end).toBe(steps[(i + 1) % 6].start);
  });

  it("⑤ 六步起点合起来是 24 节气里等距的 6 个", () => {
    const idx = (t: string) => JIEQI24.indexOf(t);
    const starts = steps.map((s) => idx(s.start)).sort((a, b) => a - b);
    const gaps = starts.map((v, i) => ((starts[(i + 1) % 6] - v) % 24 + 24) % 24);
    expect(gaps).toEqual([4, 4, 4, 4, 4, 4]);
  });
});
