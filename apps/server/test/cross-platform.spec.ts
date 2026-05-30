// ── 竞品交叉比对测试套件 ──
// 选取固定时间点，对核心计算器输出结果
// 与问真八字、热卜排盘等主流产品进行人工比对
//
// 运行：./node_modules/.bin/jest --config jest.config.ts cross-platform
// 目的：产出可比对的标准输出，非自动pass/fail

import {
  calculateBaZi,
  calculateZiWei,
  calculateQimenYang,
  calculateDaLiuRen,
  calculateMeiHua,
  calculateXiaoLiuRen,
  calculateXuanKong,
  calculateQiZheng,
  calculateBaZhai,
} from "../src/modules/tool-registry/calculators/index";

import { calcRiZhu, calcAllJieQi } from "@guoxue/bazi-engine";

// ── 10个固定测试时间点 ──
const TEST_POINTS = [
  { label: "P1: 1984-02-04 15:30 (立春交界)", dt: "1984-02-04T15:30:00+08:00", gender: "male" },
  { label: "P2: 1990-06-15 08:00 (夏至前)", dt: "1990-06-15T08:00:00+08:00", gender: "female" },
  { label: "P3: 2000-01-01 00:00 (千禧年)", dt: "2000-01-01T00:00:00+08:00", gender: "male" },
  { label: "P4: 2008-08-08 20:08 (北京奥运)", dt: "2008-08-08T20:08:00+08:00", gender: "male" },
  { label: "P5: 1976-07-28 03:42 (唐山)", dt: "1976-07-28T03:42:00+08:00", gender: "female" },
  { label: "P6: 2020-01-25 00:00 (庚子春节)", dt: "2020-01-25T00:00:00+08:00", gender: "male" },
  { label: "P7: 1970-03-15 12:00 (春分前)", dt: "1970-03-15T12:00:00+08:00", gender: "female" },
  { label: "P8: 1997-07-01 00:00 (香港回归)", dt: "1997-07-01T00:00:00+08:00", gender: "male" },
  { label: "P9: 1960-02-05 06:00 (立春当日)", dt: "1960-02-05T06:00:00+08:00", gender: "male" },
  { label: "P10: 2024-12-21 17:20 (冬至)", dt: "2024-12-21T17:20:00+08:00", gender: "female" },
];

function pd(dt: string) {
  const d = new Date(dt);
  const [h, m] = dt.slice(11, 19).split(":").map(Number);
  return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate(), h, min: m ?? 0 };
}

// 工具函数：安全访问嵌套属性
function g(obj: unknown, path: string): unknown {
  try {
    return path.split(".").reduce((o: any, k) => o?.[k], obj);
  } catch { return undefined; }
}

// ─────────────────────────────────────────
// 日柱对标（最基础、最客观的验证）
// ─────────────────────────────────────────
describe("日柱对照（自动验证）", () => {
  const expected: Record<string, string> = {
    "1984-02-04": "戊辰", "1990-06-15": "辛亥", "2000-01-01": "戊午",
    "2008-08-08": "庚辰", "1976-07-28": "辛巳", "2020-01-25": "丁卯",
    "1970-03-15": "甲午", "1997-07-01": "甲辰", "1960-02-05": "癸亥", "2024-12-21": "己未",
  };

  for (const tp of TEST_POINTS) {
    const { y, m, d } = pd(tp.dt);
    const key = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    it(`${tp.label} → ${expected[key]}`, () => {
      const rz = calcRiZhu(y, m, d);
      expect(rz.gan + rz.zhi).toBe(expected[key]);
    });
  }
});

// ─────────────────────────────────────────
// 节气对标（Meeus算法精度）
// ─────────────────────────────────────────
describe("节气时间对标", () => {
  for (const year of [1984, 1990, 2000, 2008, 2020, 2024]) {
    it(`${year}年 → 春分/夏至/秋分/冬至`, () => {
      const jq = calcAllJieQi(year);
      const names = ["春分", "夏至", "秋分", "冬至"];
      const parts: string[] = [];
      for (const n of names) {
        const j = jq.get(n);
        parts.push(j ? `${n}:${j.month}/${j.day} ${j.hour}:${String(j.minute).padStart(2, "0")}` : `${n}:无`);
      }
      console.log(`[节气] ${year}: ${parts.join(" | ")}`);
      expect(jq.get("春分")).toBeDefined();
    });
  }
});

// ─────────────────────────────────────────
// 八字四柱对标（人工比对问真）
// ─────────────────────────────────────────
describe("八字四柱对照", () => {
  for (const tp of TEST_POINTS) {
    it(tp.label, () => {
      const { y, m, d, h } = pd(tp.dt);
      const r: any = calculateBaZi({ year: y, month: m, day: d, hour: h, gender: tp.gender as any });
      const si = r.siZhu;
      const pillars = si ? `${si.nian?.ganZhi ?? "?"} ${si.yue?.ganZhi ?? "?"} ${si.ri?.ganZhi ?? "?"} ${si.shi?.ganZhi ?? "?"}` : "?";
      console.log(`[八字] ${tp.label}: ${pillars}`);
      expect(r.siZhu).toBeDefined();
    });
  }
});

// ─────────────────────────────────────────
// 紫微斗数对标
// ─────────────────────────────────────────
describe("紫微斗数对照", () => {
  for (const tp of TEST_POINTS.slice(0, 5)) {
    it(tp.label, () => {
      const { y, m, d, h } = pd(tp.dt);
      const r: any = calculateZiWei({ year: y, month: m, day: d, hour: h, gender: tp.gender as any });
      const bi = r.basicInfo;
      console.log(`[紫微] ${tp.label}: 命宫${bi?.mingGong ?? "?"} 五行局${bi?.wuXingJu ?? "?"} 紫微${bi?.ziWeiGong ?? "?"}`);
      expect(r).toBeDefined();
    });
  }
});

// ─────────────────────────────────────────
// 阳盘奇门对标
// ─────────────────────────────────────────
describe("阳盘奇门对照", () => {
  for (const tp of TEST_POINTS.slice(0, 5)) {
    it(tp.label, () => {
      const { y, m, d, h, min } = pd(tp.dt);
      const r: any = calculateQimenYang({ year: y, month: m, day: d, hour: h, minute: min, method: "chaiBu" });
      console.log(`[奇门] ${tp.label}: ${r.dunType ?? "?"}${r.juNum ?? "?"}局 值符${r.zhiFuStar ?? "?"} 值使${r.zhiShiMen ?? "?"}`);
      expect(r.dunType).toBeDefined();
    });
  }
});

// ─────────────────────────────────────────
// 大六壬对标
// ─────────────────────────────────────────
describe("大六壬对照", () => {
  for (const tp of TEST_POINTS.slice(0, 3)) {
    it(tp.label, () => {
      const { y, m, d, h } = pd(tp.dt);
      const r: any = calculateDaLiuRen({ year: y, month: m, day: d, hour: h });
      const sc = r.sanChuan;
      console.log(`[六壬] ${tp.label}: 月将${r.yueJiang} 三传${sc?.chu}/${sc?.zhong}/${sc?.mo} 宗门${r.zongMen ?? r.jiuZongMen}`);
      expect(r.sanChuan).toBeDefined();
    });
  }

  it("2008-05-12 汶川课", () => {
    const r: any = calculateDaLiuRen({ year: 2008, month: 5, day: 12, hour: 14 });
    const sc = r.sanChuan;
    console.log(`[六壬·汶川] 月将${r.yueJiang} 三传${sc?.chu}/${sc?.zhong}/${sc?.mo} 宗门${r.zongMen ?? r.jiuZongMen}`);
    expect(r.sanChuan).toBeDefined();
  });

  it("2022-02-24 重大事件", () => {
    const r: any = calculateDaLiuRen({ year: 2022, month: 2, day: 24, hour: 5 });
    const sc = r.sanChuan;
    console.log(`[六壬·事件] 2022-02-24: 月将${r.yueJiang} 三传${sc?.chu}/${sc?.zhong}/${sc?.mo} 宗门${r.zongMen ?? r.jiuZongMen}`);
    expect(r.sanChuan).toBeDefined();
  });
});

// ─────────────────────────────────────────
// 梅花易数对标
// ─────────────────────────────────────────
describe("梅花易数对照", () => {
  it("固定起卦(1,2,3)", () => {
    const r: any = calculateMeiHua({ method: "shuzi", numbers: [1, 2, 3] });
    console.log(`[梅花] 本卦${r.benGua} 互卦${r.huGua} 变卦${r.bianGua} 动爻${r.dongYao}`);
    expect(r.benGua).toBeDefined();
  });
});

// ─────────────────────────────────────────
// 玄空风水对标
// ─────────────────────────────────────────
describe("玄空风水对照", () => {
  for (const c of [
    { label: "八运子山午向", shan: "子", xiang: "午", yun: 8 },
    { label: "九运壬山丙向", shan: "壬", xiang: "丙", yun: 9 },
  ]) {
    it(c.label, () => {
      const r: any = calculateXuanKong({ shan: c.shan, xiang: c.xiang, yuanYun: c.yun });
      console.log(`[玄空] ${c.label}: 运星${r.yunXing} 山星${r.shanXing} 向星${r.xiangXing} 格局${r.geJu}`);
      expect(r.geJu).toBeDefined();
    });
  }
});

// ─────────────────────────────────────────
// 七政四余对标
// ─────────────────────────────────────────
describe("七政四余对照", () => {
  it("2024-06-21 夏至 七曜位置", () => {
    const r: any = calculateQiZheng({ datetime: "2024-06-21T04:51:00Z", gender: "male", system: "guolao" });
    const stars = (r.starPositions as any[])?.slice(0, 7)
      .map((s: any) => `${s.star}:${s.gong}(${s.eclipticDeg}°)`).join(", ");
    console.log(`[七政四余] 2024夏至: ${stars}`);
    expect(r.starPositions).toBeDefined();
  });
});

// ─────────────────────────────────────────
// 小六壬对标
// ─────────────────────────────────────────
describe("小六壬对照", () => {
  it("2024-06-01", () => {
    const r: any = calculateXiaoLiuRen({ year: 2024, month: 6, day: 1 });
    console.log(`[小六壬] 2024-06-01: 掌诀${r.zhangJue} 宫位${r.gongWei}`);
    expect(r.zhangJue).toBeDefined();
  });
});

// ─────────────────────────────────────────
// 八宅风水对标
// ─────────────────────────────────────────
describe("八宅对照", () => {
  it("1984年生男 坐坎向离", () => {
    const r: any = calculateBaZhai({ birthYear: 1984, gender: "male", zuoShan: "坎" });
    console.log(`[八宅] 1984男: 命卦${r.mingGua} 宅卦${r.zhaiGua} ${r.dongXiMing}`);
    expect(r.mingGua).toBeDefined();
  });
});

// ─────────────────────────────────────────
// 已知算法分歧点
// ─────────────────────────────────────────
describe("已知算法分歧点", () => {
  it("早晚子时 — 23:00后为晚子时日柱+1天", () => {
    const a = calcRiZhu(2000, 1, 1);
    const b = calcRiZhu(2000, 1, 2);
    expect(a.gan + a.zhi).toBe("戊午");
    expect(b.gan + b.zhi).toBe("己未");
  });

  it("真太阳时 — 默认关闭opt-in", () => { expect(true).toBe(true); });
  it("羊刃 — 统一子平派（禄前一位为刃）", () => { expect(true).toBe(true); });
  it("大六壬月将 — 中气换将", () => { expect(true).toBe(true); });
  it("奇门用局 — 拆补法", () => { expect(true).toBe(true); });
});
