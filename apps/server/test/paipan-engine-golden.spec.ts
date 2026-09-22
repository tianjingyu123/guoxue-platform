import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { PaipanEngineService } from "../src/modules/paipan/engine/paipan-engine.service";
import { ENGINES } from "../src/modules/paipan/engine/engine-registry";

/**
 * 排盘引擎迁后端 · 金样对照（第 4 步防抄：算法只在服务端运行）
 *
 * ══ 守什么 ══
 *
 * 引擎从前端逐字搬到服务端（仅改 import 路径），理论上结果不变。但有三处会悄悄变：
 *   1. **时区** —— 引擎用本地时间 getter，手机是北京时间，服务端进程时区不可控
 *      （本机就是 America/Los_Angeles）。由 engine-tz.ts 的时区锁保证。
 *   2. **JSON 往返** —— Date / undefined / NaN 过 HTTP 会变形，前端拿到的不是原值。
 *   3. **入参解析** —— 服务端默认值、校验若与前端结果页原逻辑不一致，同一 payload 会算出不同盘。
 *
 * 金样由**迁移前的前端引擎**在 Asia/Shanghai 下生成（fixtures/paipan-engine/*.golden.json；
 * 例：太乙 1900–2100 每天 × 各时辰 × 四盘式 × 三算法 = 418 万次），按年/按分组出 sha256 指纹。
 * 重引擎（单次 6–24 ms）的日期网格见 cases.ts 的 dateGrid：夏令时等关键年逐日、其余年按间隔抽日。
 * 这里走 PaipanEngineService.run（= 线上接口同一路径）+ JSON 往返，逐年比指纹。
 *
 * 默认只跑代表年份（含 1986–1991 中国夏令时、世纪边界）；`PAIPAN_GOLDEN_FULL=1` 跑全部年份。
 * 迁移当日（2026-09-21）已全量跑过并通过。
 */

const FIX = path.join(__dirname, "fixtures/paipan-engine");
const ROOT = path.resolve(__dirname, "../../..");
const FULL = process.env.PAIPAN_GOLDEN_FULL === "1";
const SAMPLE_YEARS = [1900, 1901, 1949, 1986, 1988, 1991, 2000, 2024, 2026, 2033, 2099, 2100];

interface Golden {
  tool: string;
  calls: number;
  /** 分组模式（用例见 fixtures/paipan-engine/cases.ts）；缺省为按年模式（太乙） */
  mode?: "groups";
  spec?: { from: number; to: number; byPanShi: Record<string, number[]>; suanFa: string[] };
  byYear?: Record<string, string>;
  byGroup?: Record<string, string>;
}

/**
 * 重引擎（单次 6–24 ms）默认只跑「用例数不超过上限」的小分组，关键年逐日全扫那些大组留给全量模式。
 * 时区锁在夏令时年份的正确性，已由廉价引擎（太乙/小成图/五运六气等）的默认用例覆盖——同一段时区锁代码。
 */
const HEAVY_CAP: Record<string, number> = {
  feigong: 2500, jinkoujue: 2500, daliuren: 1500, yinpan: 1500, qimen: 1000, chuanren: 1000,
  ziwei: 2500, hepan: 1500, qizheng: 800,
  // 2 ms 级：逐日全枚举的年份组约 4700 次，默认只取下面 CAP_YEARS 里的几年
  xiaoliuren: 5000, liuyao: 5000, meihua: 5000,
};
/** 上限模式下按年分组只取这几年（含 1988 夏令时、今年、非关键年抽样组） */
const CAP_YEARS = [1901, 1988, 2026, 2033, 2099];

function groupSizes(tool: string): Map<string, number> {
  const { CASES } = require("./fixtures/paipan-engine/cases");
  const ctx = { kangxi: JSON.parse(fs.readFileSync(path.join(ROOT, "packages/shared/src/paipan/data/kangxi-strokes.json"), "utf8")) };
  const m = new Map<string, number>();
  for (const [g] of CASES[tool](ctx)) m.set(g, (m.get(g) ?? 0) + 1);
  return m;
}

/** 分组模式的代表分组：非按年的分组全跑；按年分组（time:YYYY 之类）只跑代表年份；重引擎另受 HEAVY_CAP 限制 */
function sampleGroups(g: Golden): string[] {
  const cap = HEAVY_CAP[g.tool];
  if (cap) {
    const sizes = groupSizes(g.tool);
    return Object.keys(g.byGroup!).filter((k) => {
      const y = /:(\d{4})$/.exec(k);
      return (sizes.get(k) ?? Infinity) <= cap && (!y || CAP_YEARS.includes(Number(y[1])));
    });
  }
  return Object.keys(g.byGroup!).filter((k) => {
    const m = /:(\d{4})$/.exec(k);
    return !m || SAMPLE_YEARS.includes(Number(m[1])) || (m && Number(m[1]) === 2026);
  });
}

const svc = new PaipanEngineService();

/** 在真实子进程里跑（TZ=UTC 模拟生产最危险的情形：进程非北京时区） */
function runChild(tool: string, years: (number | string)[] | "all") {
  const runner = path.join(FIX, "golden-runner.ts");
  const bin = path.join(__dirname, "../node_modules/ts-node/dist/bin.js");
  const out = execFileSync(process.execPath, [bin, "--transpile-only", runner, tool, years === "all" ? "all" : years.join(",")], {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, TZ: "UTC" },
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  return JSON.parse(out.trim().split(String.fromCharCode(10)).pop()!) as {
    tzBefore: number; tzInside: number; tzAfter: number; byYear?: Record<string, string>; byGroup?: Record<string, string>; calls: number;
  };
}

const TOOLS = fs.readdirSync(FIX).filter((f) => f.endsWith(".golden.json")).map((f) => f.replace(".golden.json", ""));

describe("排盘引擎迁后端 · 金样对照", () => {
  it("反证：金样都在、且每个金样都有已注册的引擎（空目录会让下面全变空跑）", () => {
    expect(TOOLS.length).toBeGreaterThanOrEqual(1);
    for (const t of TOOLS) expect(`${t}:${t in ENGINES}`).toBe(`${t}:true`);
  });


  for (const tool of TOOLS) {
    const g: Golden = JSON.parse(fs.readFileSync(path.join(FIX, `${tool}.golden.json`), "utf8"));
    const keys: string[] = g.mode === "groups"
      ? (FULL ? Object.keys(g.byGroup!) : sampleGroups(g))
      : (FULL ? Object.keys(g.byYear!) : SAMPLE_YEARS.filter((y) => String(y) in g.byYear!).map(String));
    const want = (g.mode === "groups" ? g.byGroup : g.byYear)!;

    it(`${tool}：${FULL ? "全部" : "代表"}分组（${keys.length} 组）逐组指纹与迁移前前端一致（子进程 TZ=UTC）`, () => {
      const r = runChild(tool, FULL ? "all" : keys);
      // 时区锁在真进程里生效：进程是 UTC(0)，引擎内是北京(-480)，执行完恢复 UTC
      expect([r.tzBefore, r.tzInside, r.tzAfter]).toEqual([0, -480, 0]);
      const got = (g.mode === "groups" ? r.byGroup : r.byYear)!;
      const diff = keys.filter((k) => got[k] !== want[k]).map((k) => `${k}: 金样 ${want[k]} / 现 ${got[k]}`);
      expect(diff).toEqual([]);
      expect(r.calls).toBeGreaterThan(0);
    }, FULL ? 3_600_000 : 300_000);
  }

  it("反证：改动任一入参，指纹必须变（否则上面的比对是空跑）", () => {
    const a = JSON.stringify(svc.run("taiyi", { year: 2026, month: 9, day: 21, hour: 13, minute: 0, panShi: "hour", suanFa: "zhijin" }));
    const b = JSON.stringify(svc.run("taiyi", { year: 2026, month: 9, day: 21, hour: 15, minute: 0, panShi: "hour", suanFa: "zhijin" }));
    expect(a).not.toBe(b);
  });
});

describe("排盘引擎 · 入参校验", () => {
  it.each<[Record<string, unknown>, string]>([
    [{ year: 2026, month: 2, day: 30, hour: 0, minute: 0 }, "2 月 30 日不得被 Date 静默进位"],
    [{ year: 2026, month: 13, day: 1, hour: 0, minute: 0 }, "月越界"],
    [{ year: 2026, month: 1, day: 1, hour: 24, minute: 0 }, "时越界"],
    [{ year: "abc", month: 1, day: 1, hour: 0, minute: 0 }, "非数字"],
    [{ year: 2026, month: 1, day: 1, hour: 0, minute: 0, panShi: "week" }, "盘式不在枚举内"],
  ])("拒绝非法入参：%j（%s）", (body: Record<string, unknown>, _why: string) => {
    expect(() => svc.run("taiyi", body)).toThrow();
  });

  it("缺省盘式/算法时取前端原默认值（hour / zhijin）", () => {
    const base = { year: 2026, month: 9, day: 21, hour: 13, minute: 0 };
    expect(svc.run("taiyi", base)).toEqual(svc.run("taiyi", { ...base, panShi: "hour", suanFa: "zhijin" }));
  });

  it("引擎的普通 Error（输入校验）→ 400 带原文；TypeError 等真缺陷原样抛出（按 500，不漏内部信息）", () => {
    const { BusinessException } = require("../src/common/business.exception");
    // 生僻字：引擎抛普通 Error → 业务异常，原文给用户
    let e1: unknown;
    try { svc.run("zhuge", { input: "天地㐀" }); } catch (e) { e1 = e; }
    expect(e1).toBeInstanceOf(BusinessException);
    expect((e1 as Error).message).toMatch(/康熙字典/);
    // 注入一个会抛 TypeError 的临时引擎：不得被包成 400
    ENGINES.__typeErr = { parse: () => ({}), run: () => { throw new TypeError("内部缺陷"); } };
    try {
      let e2: unknown;
      try { svc.run("__typeErr", {}); } catch (e) { e2 = e; }
      expect(e2).toBeInstanceOf(TypeError);
      expect(e2).not.toBeInstanceOf(BusinessException);
    } finally {
      delete ENGINES.__typeErr;
    }
  });

  it("未注册的工具 → 拒绝；原型链上的名字也不得穿透", () => {
    expect(() => svc.run("nope", {})).toThrow();
    expect(() => svc.run("constructor", {})).toThrow();
    expect(() => svc.run("__proto__", {})).toThrow();
  });
});

/**
 * ★48：奇门飞盘的「飞宫方式」此前是假开关 —— 前端适配层从未把 flyMethod 传给引擎，
 * 飞盘永远按「阴阳皆顺」排；且取值口径不同（页面 yangshun/yinyang，引擎 shunni/yinyang）。
 * 修法：服务端适配层把 yangshun 映射为 shunni 传入。转盘的相关分支都限定在飞盘，不受影响。
 */
describe("★48 奇门飞宫方式生效", () => {
  // 2026-09-21 在夏至后，阴遁 —— 「阳顺阴逆」与「阴阳皆顺」在阴遁时飞布方向相反
  const base = { year: 2026, month: 9, day: 21, hour: 10, minute: 0, startMethod: "zhirun", anganMethod: "dipan" };
  type Qm = { dunType: string; gongs: { index: number; star: string; men: string; tianPan: string }[] };
  const sig = (r: Qm) => JSON.stringify(r.gongs.map((g) => [g.index, g.star, g.men, g.tianPan]));

  it("前提：该时刻为阴遁", () => {
    expect((svc.run("qimen", { ...base, panMethod: "fei", flyMethod: "yinyang" }) as Qm).dunType).toBe("yin");
  });

  it("飞盘：阳顺阴逆 与 阴阳皆顺 排出的盘不同（开关生效）", () => {
    const a = svc.run("qimen", { ...base, panMethod: "fei", flyMethod: "yangshun" }) as Qm;
    const b = svc.run("qimen", { ...base, panMethod: "fei", flyMethod: "yinyang" }) as Qm;
    expect(sig(a)).not.toBe(sig(b));
  });

  it("转盘：飞宫方式不影响结果", () => {
    const a = svc.run("qimen", { ...base, panMethod: "zhuan", flyMethod: "yangshun" }) as Qm;
    const b = svc.run("qimen", { ...base, panMethod: "zhuan", flyMethod: "yinyang" }) as Qm;
    expect(sig(a)).toBe(sig(b));
  });

  it("阳遁时两种飞宫方式方向一致（阳遁本就都顺飞）", () => {
    const yang = { ...base, month: 3, day: 1, panMethod: "fei" };
    const a = svc.run("qimen", { ...yang, flyMethod: "yangshun" }) as Qm;
    const b = svc.run("qimen", { ...yang, flyMethod: "yinyang" }) as Qm;
    expect(a.dunType).toBe("yang");
    expect(sig(a)).toBe(sig(b));
  });
});

/**
 * ★47：小成图「自动起卦」此前不可复现 —— 输入页没把随机结果写进 payload，
 * 结果页每次打开都重新随机，从排盘记录重开会变成另一卦（同页「摇卦」早已按可复现处理，唯独漏了它）。
 * 修法：输入页定下 u/l/dong 随 payload 传递；引擎自动分支优先用传入值，未传才现场随机（兼容旧记录）。
 */
describe("★47 小成图自动起卦可复现", () => {
  const base = { year: 2026, month: 9, day: 21, hour: 10, minute: 0, m: "auto", zg: "sizheng" };
  type Xct = { benGua: { name: string }; bianGua: { name: string }; dongYao: number };

  it("带 u/l/dong 的自动起卦：同一 payload 反复排盘，结果完全相同", () => {
    const p = { ...base, u: 3, l: 6, dong: 4 };
    const a = JSON.stringify(svc.run("xiaochengtu", p));
    for (let i = 0; i < 20; i++) expect(JSON.stringify(svc.run("xiaochengtu", p))).toBe(a);
  });

  it("自动起卦定下的卦与「指定起卦」同参数的卦象一致（只差起卦说明文字）", () => {
    const auto = svc.run("xiaochengtu", { ...base, u: 3, l: 6, dong: 4 }) as Xct;
    const manual = svc.run("xiaochengtu", { ...base, m: "manual", u: 3, l: 6, dong: 4 }) as Xct;
    expect([auto.benGua.name, auto.bianGua.name, auto.dongYao]).toEqual([manual.benGua.name, manual.bianGua.name, manual.dongYao]);
  });

  it("反证：不带 u/l/dong 的旧记录仍现场随机（多次排盘会出现不同卦）", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) seen.add((svc.run("xiaochengtu", base) as Xct).benGua.name);
    expect(seen.size).toBeGreaterThan(1);
  });
});
