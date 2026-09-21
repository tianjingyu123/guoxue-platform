import {
  ALL_RINGS, PLATE_RINGS, SHAN_24, JIA_ZI_60,
  RING_XIANTIAN_BAGUA, RING_HOUTIAN_BAGUA, RING_DIPAN, RING_RENPAN, RING_TIANPAN,
  RING_SANYUAN_LONG, RING_JING_YIN_YANG, RING_JIE_QI, RING_SHUANG_SHAN,
  RING_CHUAN_SHAN_72, RING_TOU_DI_60, RING_FEN_JIN_120, RING_XIU_28, RING_GUA_64,
  readRing, readPlate, ringsOf, shanCenterDeg, norm360,
  type LuoPanRing, type PlateType,
} from "@guoxue/shared/paipan";

/**
 * 罗盘圈层数据层回归（2026-09-19，接续文档 §2.90）
 *
 * ══ 这份测试的组织原则 ══
 *
 * 罗盘圈层最容易出的错不是"内容抄错"，而是**格数、起算点、步长**。
 * 这三样错了以后每一格看着都像模像样，肉眼比对发现不了——
 * 已经吃过三次亏（后端地盘偏一山、前端七十二龙只 8 个空亡、透地龙以 0° 起算）。
 *
 * 所以每一圈都配一条**可机检的不变量**，且优先选那种「算出来必然如此」
 * 而不是「我抄的表长这样」的性质：
 *   · 计数型——珠宝 24/火坑 36/空亡 12、三元各八山、阴阳各十二山、四局各三双山；
 *   · 对称型——先天对宫六爻全反、后天对宫洛书数和为 10、六十四卦正对全反；
 *   · 定位型——二分二至恰落四正、子山中心正北。
 * 这类不变量的好处是：**抄错一格就会破**，而不需要另一份"正确答案"来比。
 */

const RINGS_BY_ID = new Map(ALL_RINGS.map((r) => [r.id, r]));
const at = (ring: LuoPanRing, deg: number) => readRing(ring, deg).cell;

describe("圈层通用契约", () => {
  it.each(ALL_RINGS.map((r) => [r.name, r] as [string, LuoPanRing]))("%s：格数与跨度自洽", (_n, ring) => {
    expect(ring.cells.length).toBeGreaterThan(0);
    if (ring.spans) {
      expect(`${ring.id} spans 长度=${ring.spans.length}`).toBe(`${ring.id} spans 长度=${ring.cells.length}`);
    }
  });

  it.each(ALL_RINGS.map((r) => [r.name, r] as [string, LuoPanRing]))("%s：全周天扫描恰好覆盖每一格，无重无漏", (_n, ring) => {
    const seen = new Set<number>();
    for (let d = 0; d < 360; d += 0.1) seen.add(readRing(ring, d).index);
    expect(`${ring.id} 覆盖=${seen.size}`).toBe(`${ring.id} 覆盖=${ring.cells.length}`);
  });

  it.each(ALL_RINGS.map((r) => [r.name, r] as [string, LuoPanRing]))("%s：格区间首尾相接、合计 360°", (_n, ring) => {
    let total = 0;
    for (let i = 0; i < ring.cells.length; i++) {
      // 取每格中点回读，必须落回该格
      const per = ring.spans
        ? (ring.spans[i] / ring.spans.reduce((a, b) => a + b, 0)) * 360
        : 360 / ring.cells.length;
      const mid = norm360(ring.startDeg + total + per / 2);
      expect(`${ring.id}[${i}] 回读=${readRing(ring, mid).index}`).toBe(`${ring.id}[${i}] 回读=${i}`);
      total += per;
    }
    expect(`${ring.id} 合计=${total.toFixed(4)}`).toBe(`${ring.id} 合计=360.0000`);
  });

  it("圈层 id 唯一", () => {
    expect(`唯一数=${RINGS_BY_ID.size}`).toBe(`唯一数=${ALL_RINGS.length}`);
  });
});

describe("先天八卦：对宫六爻全反", () => {
  /** 爻象自下而上，阳 1 阴 0 */
  const BITS: Record<string, number> = { 坤: 0b000, 艮: 0b001, 坎: 0b010, 巽: 0b011, 震: 0b100, 离: 0b101, 兑: 0b110, 乾: 0b111 };

  it("八卦俱全", () => {
    expect(new Set(RING_XIANTIAN_BAGUA.cells.map((c) => c.text)).size).toBe(8);
  });

  it("任一方位与其对宫（+180°）六爻全反", () => {
    for (let d = 0; d < 360; d += 5) {
      const a = BITS[at(RING_XIANTIAN_BAGUA, d).text];
      const b = BITS[at(RING_XIANTIAN_BAGUA, d + 180).text];
      expect(`${d}° 异或=${(a ^ b).toString(2)}`).toBe(`${d}° 异或=111`);
    }
  });

  it("乾居正南、坤居正北、离东坎西", () => {
    expect(at(RING_XIANTIAN_BAGUA, 180).text).toBe("乾");
    expect(at(RING_XIANTIAN_BAGUA, 0).text).toBe("坤");
    expect(at(RING_XIANTIAN_BAGUA, 90).text).toBe("离");
    expect(at(RING_XIANTIAN_BAGUA, 270).text).toBe("坎");
  });
});

describe("后天八卦：对宫洛书数和为十", () => {
  const LUOSHU: Record<string, number> = { 坎: 1, 坤: 2, 震: 3, 巽: 4, 乾: 6, 兑: 7, 艮: 8, 离: 9 };

  it("八卦俱全", () => {
    expect(new Set(RING_HOUTIAN_BAGUA.cells.map((c) => c.text)).size).toBe(8);
  });

  it("任一方位与其对宫洛书数相加恒为 10", () => {
    for (let d = 0; d < 360; d += 5) {
      const a = LUOSHU[at(RING_HOUTIAN_BAGUA, d).text];
      const b = LUOSHU[at(RING_HOUTIAN_BAGUA, d + 180).text];
      expect(`${d}° 和=${a + b}`).toBe(`${d}° 和=10`);
    }
  });

  it("坎北离南震东兑西", () => {
    expect(at(RING_HOUTIAN_BAGUA, 0).text).toBe("坎");
    expect(at(RING_HOUTIAN_BAGUA, 180).text).toBe("离");
    expect(at(RING_HOUTIAN_BAGUA, 90).text).toBe("震");
    expect(at(RING_HOUTIAN_BAGUA, 270).text).toBe("兑");
  });
});

describe("三针二十四山", () => {
  it("地盘：子山中心正北、午南、卯东、酉西", () => {
    expect(at(RING_DIPAN, 0).text).toBe("子");
    expect(at(RING_DIPAN, 180).text).toBe("午");
    expect(at(RING_DIPAN, 90).text).toBe("卯");
    expect(at(RING_DIPAN, 270).text).toBe("酉");
  });

  it("地盘：每山中心回读为本山（shanCenterDeg 与本圈自洽）", () => {
    SHAN_24.forEach((s, i) => {
      expect(`${s}(${shanCenterDeg(i)}°)=${at(RING_DIPAN, shanCenterDeg(i)).text}`).toBe(`${s}(${shanCenterDeg(i)}°)=${s}`);
    });
  });

  it("地盘：山界在 7.5 + 15k", () => {
    expect(at(RING_DIPAN, 7.4).text).toBe("子");
    expect(at(RING_DIPAN, 7.6).text).toBe("癸");
    expect(at(RING_DIPAN, 352.6).text).toBe("子");
    expect(at(RING_DIPAN, 352.4).text).toBe("壬");
  });

  it("中针逆偏、缝针顺偏各 7.5°（半个山，非整山常数）", () => {
    expect(`地盘起点=${RING_DIPAN.startDeg}`).toBe("地盘起点=337.5");
    expect(`中针起点=${RING_RENPAN.startDeg}`).toBe("中针起点=330");   // −7.5
    expect(`缝针起点=${RING_TIANPAN.startDeg}`).toBe("缝针起点=345");  // +7.5
  });

  it("同一朝向下三针读数两两相邻，且中针恒领先缝针一个山", () => {
    const idx = (s: string) => SHAN_24.indexOf(s as never);
    const gap = (a: string, b: string) => (idx(a) - idx(b) + 24) % 24;
    for (let d = 0; d < 360; d += 1.5) {
      const z = at(RING_DIPAN, d).text, m = at(RING_RENPAN, d).text, f = at(RING_TIANPAN, d).text;
      expect(`${d}° 中-缝=${gap(m, f)}`).toBe(`${d}° 中-缝=1`);
      expect([0, 1]).toContain(gap(m, z));  // 中针＝本山或下一山
      expect([0, 1]).toContain(gap(z, f));  // 缝针＝本山或上一山
    }
  });
});

describe("三元龙：各八山，且每卦宫天地人各一", () => {
  it("天元/地元/人元各八山", () => {
    const cnt: Record<string, number> = {};
    for (const c of RING_SANYUAN_LONG.cells) cnt[c.text] = (cnt[c.text] ?? 0) + 1;
    expect(`天${cnt["天元"]} 地${cnt["地元"]} 人${cnt["人元"]}`).toBe("天8 地8 人8");
  });

  it("每三山一宫，宫内天地人各一（八宫皆然）", () => {
    // 以壬为首每三山一组：壬子癸 / 丑艮寅 / 甲卯乙 / …
    for (let g = 0; g < 8; g++) {
      const trio = [0, 1, 2].map((k) => RING_SANYUAN_LONG.cells[g * 3 + k].text).sort().join("");
      expect(`第${g + 1}宫=${trio}`).toBe(`第${g + 1}宫=${["天元", "地元", "人元"].sort().join("")}`);
    }
  });
});

describe("净阴净阳：阴阳各十二山", () => {
  it("十二阳十二阴", () => {
    const cnt: Record<string, number> = {};
    for (const c of RING_JING_YIN_YANG.cells) cnt[c.text] = (cnt[c.text] ?? 0) + 1;
    expect(`阳${cnt["阳"]} 阴${cnt["阴"]}`).toBe("阳12 阴12");
  });

  it("四正中子午为阳、卯酉为阴（纳甲所定）", () => {
    expect(at(RING_JING_YIN_YANG, 0).text).toBe("阳");    // 子
    expect(at(RING_JING_YIN_YANG, 180).text).toBe("阳");  // 午
    expect(at(RING_JING_YIN_YANG, 90).text).toBe("阴");   // 卯
    expect(at(RING_JING_YIN_YANG, 270).text).toBe("阴");  // 酉
  });
});

describe("二十四节气：二分二至恰落四正", () => {
  it("子＝冬至、午＝夏至、卯＝春分、酉＝秋分", () => {
    expect(at(RING_JIE_QI, 0).text).toBe("冬至");
    expect(at(RING_JIE_QI, 180).text).toBe("夏至");
    expect(at(RING_JIE_QI, 90).text).toBe("春分");
    expect(at(RING_JIE_QI, 270).text).toBe("秋分");
  });

  it("四立落四维（艮立春、巽立夏、坤立秋、乾立冬）", () => {
    expect(at(RING_JIE_QI, 45).text).toBe("立春");   // 艮
    expect(at(RING_JIE_QI, 135).text).toBe("立夏");  // 巽
    expect(at(RING_JIE_QI, 225).text).toBe("立秋");  // 坤
    expect(at(RING_JIE_QI, 315).text).toBe("立冬");  // 乾
  });

  it("二十四节气不重不漏", () => {
    expect(new Set(RING_JIE_QI.cells.map((c) => c.text)).size).toBe(24);
  });
});

describe("双山三合五行：四局各三双山", () => {
  it("十二双山、四局各三", () => {
    const cnt: Record<string, number> = {};
    for (const c of RING_SHUANG_SHAN.cells) cnt[c.note!] = (cnt[c.note!] ?? 0) + 1;
    expect(RING_SHUANG_SHAN.cells.length).toBe(12);
    expect(`水${cnt["水局"]} 木${cnt["木局"]} 火${cnt["火局"]} 金${cnt["金局"]}`).toBe("水3 木3 火3 金3");
  });

  it("申子辰同水局、寅午戌同火局（三合定序）", () => {
    const ju = (shan: string) => RING_SHUANG_SHAN.cells.find((c) => c.text.includes(shan))!.note;
    for (const z of ["申", "子", "辰"]) expect(`${z}=${ju(z)}`).toBe(`${z}=水局`);
    for (const z of ["寅", "午", "戌"]) expect(`${z}=${ju(z)}`).toBe(`${z}=火局`);
    for (const z of ["亥", "卯", "未"]) expect(`${z}=${ju(z)}`).toBe(`${z}=木局`);
    for (const z of ["巳", "酉", "丑"]) expect(`${z}=${ju(z)}`).toBe(`${z}=金局`);
  });
});

describe("穿山七十二龙：珠宝 24 / 火坑 36 / 空亡 12", () => {
  it("七十二格，六十甲子不重复 + 十二空亡", () => {
    const cells = RING_CHUAN_SHAN_72.cells;
    expect(cells.length).toBe(72);
    const kong = cells.filter((c) => c.jiXiong === "空亡");
    const real = cells.filter((c) => c.jiXiong !== "空亡").map((c) => c.text);
    expect(`空亡=${kong.length}`).toBe("空亡=12");
    expect(`实龙=${real.length}`).toBe("实龙=60");
    // 前端那份正是栽在这里：64 格塞六十甲子，末四条是前四条的副本
    expect(`不重复=${new Set(real).size}`).toBe("不重复=60");
    expect(`恰为六十甲子=${new Set(real).size === 60 && real.every((x) => JIA_ZI_60.includes(x))}`).toBe("恰为六十甲子=true");
  });

  /**
   * 🔴 2026-09-19 补这条。首版穿山表是**把六十甲子顺排**当成了排布，
   * 而上面那批计数型断言（72 格/空亡 12/实龙 60/无重复/珠宝 24 火坑 36 空亡 12）
   * **一条不差全是绿的**——前端窗口要接入时打印前六格才撞见十二个地支山全不符。
   *
   * > **不变量对 ≠ 内容对。**
   * > 计数型不变量约束「有多少」，不约束「每一格放的是什么」。
   * > 补救必须用**内容型**不变量：落在「某一格与它所在位置的关系」上。
   * > 下面这条正是——地支山的三条龙，其地支必与山相同。
   */
  it("地支山的三条龙，地支必与山相同（内容型判据，首版 12/12 全不符）", () => {
    const ZHI = "子丑寅卯辰巳午未申酉戌亥";
    const bad: string[] = [];
    SHAN_24.forEach((shan, i) => {
      if (!ZHI.includes(shan)) return;
      const trio = RING_CHUAN_SHAN_72.cells.slice(i * 3, i * 3 + 3).map((c) => c.text);
      if (!trio.every((t) => t[1] === shan)) bad.push(`${shan}山=${trio.join(",")}`);
    });
    expect(`不符=${bad.join(" ")}`).toBe("不符=");
  });

  it("每个地支的五条龙连续跨越「前干维末格·本支山三格·后干维首格」", () => {
    const ZHI = [..."子丑寅卯辰巳午未申酉戌亥"];
    for (const zhi of ZHI) {
      const group = JIA_ZI_60.filter((gz) => gz[1] === zhi);
      const i = SHAN_24.indexOf(zhi as never);
      const prev = (i - 1 + 24) % 24, next = (i + 1) % 24;
      const got = [
        RING_CHUAN_SHAN_72.cells[prev * 3 + 2].text,
        RING_CHUAN_SHAN_72.cells[i * 3 + 0].text,
        RING_CHUAN_SHAN_72.cells[i * 3 + 1].text,
        RING_CHUAN_SHAN_72.cells[i * 3 + 2].text,
        RING_CHUAN_SHAN_72.cells[next * 3 + 0].text,
      ];
      expect(`${zhi}组=${got.join(",")}`).toBe(`${zhi}组=${group.join(",")}`);
    }
  });

  it("壬山逐格为「癸亥·空·甲子」，子山为「丙子戊子庚子」（实盘锚点）", () => {
    expect(RING_CHUAN_SHAN_72.cells.slice(0, 3).map((c) => c.text).join(" ")).toBe("癸亥 空 甲子");
    expect(RING_CHUAN_SHAN_72.cells.slice(3, 6).map((c) => c.text).join(" ")).toBe("丙子 戊子 庚子");
  });

  it("吉凶分布 24/36/12（典籍定数）", () => {
    const cnt: Record<string, number> = {};
    for (const c of RING_CHUAN_SHAN_72.cells) cnt[c.jiXiong!] = (cnt[c.jiXiong!] ?? 0) + 1;
    expect(`珠宝${cnt["吉"]} 火坑${cnt["凶"]} 空亡${cnt["空亡"]}`).toBe("珠宝24 火坑36 空亡12");
  });

  it("珠宝限庚丙丁辛四干", () => {
    for (const c of RING_CHUAN_SHAN_72.cells) {
      if (c.jiXiong === "空亡") continue;
      const isZhuBao = ["庚", "丙", "丁", "辛"].includes(c.text[0]);
      expect(`${c.text}→${c.jiXiong}`).toBe(`${c.text}→${isZhuBao ? "吉" : "凶"}`);
    }
  });

  it("空亡落八干四维十二山之中格，十二地支山各得三整龙", () => {
    const ZHI = "子丑寅卯辰巳午未申酉戌亥";
    SHAN_24.forEach((shan, i) => {
      const trio = RING_CHUAN_SHAN_72.cells.slice(i * 3, i * 3 + 3);
      const kong = trio.filter((c) => c.jiXiong === "空亡").length;
      expect(`${shan}山空亡数=${kong}`).toBe(`${shan}山空亡数=${ZHI.includes(shan) ? 0 : 1}`);
      if (kong) expect(`${shan}山空亡在第${trio.findIndex((c) => c.jiXiong === "空亡") + 1}格`).toBe(`${shan}山空亡在第2格`);
    });
  });

  it("同一山内三条龙可分辨（修前后端恒取中间那条）", () => {
    // 子山 352.5–7.5，内三龙中心 355 / 0 / 5
    const got = [355, 0, 5].map((d) => at(RING_CHUAN_SHAN_72, d).text);
    expect(`三龙=${new Set(got).size}`).toBe("三龙=3");
  });
});

describe("透地六十龙与一百二十分金", () => {
  it("透地六十龙恰为六十甲子、每龙 6°", () => {
    expect(RING_TOU_DI_60.cells.length).toBe(60);
    expect(RING_TOU_DI_60.cells.map((c) => c.text)).toEqual(JIA_ZI_60);
    expect(`起算点=${RING_TOU_DI_60.startDeg}`).toBe("起算点=337.5");
  });

  it("分金一百二十格、每山五格", () => {
    expect(RING_FEN_JIN_120.cells.length).toBe(120);
    SHAN_24.forEach((shan, i) => {
      const five = RING_FEN_JIN_120.cells.slice(i * 5, i * 5 + 5);
      expect(`${shan}山格数=${five.length}`).toBe(`${shan}山格数=5`);
      for (const c of five) expect(c.note).toContain(`${shan}山`);
    });
  });

  it("分金每山恰两格为吉（算术必然，非抄表）", () => {
    SHAN_24.forEach((shan, i) => {
      const ji = RING_FEN_JIN_120.cells.slice(i * 5, i * 5 + 5).filter((c) => c.jiXiong === "吉").length;
      expect(`${shan}山吉格=${ji}`).toBe(`${shan}山吉格=2`);
    });
  });

  it("分金吉格限丙丁庚辛四干", () => {
    for (const c of RING_FEN_JIN_120.cells) {
      const isJi = ["丙", "丁", "庚", "辛"].includes(c.text[0]);
      expect(`${c.text}→${c.jiXiong}`).toBe(`${c.text}→${isJi ? "吉" : "凶"}`);
    }
  });
});

describe("二十八宿：宿度不等分", () => {
  it("二十八宿俱全", () => {
    expect(new Set(RING_XIU_28.cells.map((c) => c.text)).size).toBe(28);
  });

  it("井宿跨度至少为觜宿的十倍（等分实现必挂）", () => {
    const width: Record<string, number> = {};
    for (let d = 0; d < 360; d += 0.05) {
      const t = readRing(RING_XIU_28, d).cell.text;
      width[t] = (width[t] ?? 0) + 0.05;
    }
    expect(`井/觜=${Math.floor(width["井"] / width["觜"])}`).toMatch(/^井\/觜=(1[0-9]|[2-9]\d)/);
  });

  it("角宿起于辰位 120°", () => {
    expect(RING_XIU_28.startDeg).toBe(120);
    expect(at(RING_XIU_28, 121).text).toBe("角");
  });
});

describe("六十四卦先天圆图", () => {
  it("六十四卦不重不漏", () => {
    expect(RING_GUA_64.cells.length).toBe(64);
    expect(new Set(RING_GUA_64.cells.map((c) => c.text)).size).toBe(64);
  });

  it("正对两卦六爻全反（圆图核心性质）", () => {
    for (let i = 0; i < 64; i++) {
      const a = RING_GUA_64.cells[i], b = RING_GUA_64.cells[(i + 32) % 64];
      const bits = (note: string) => {
        // 低位＝初爻（下爻）。位序写反的话错卦性质就测不出来
        const B: Record<string, number> = { 坤: 0b000, 震: 0b001, 坎: 0b010, 兑: 0b011, 艮: 0b100, 离: 0b101, 巽: 0b110, 乾: 0b111 };
        const m = note.match(/^上(.)下(.)$/)!;
        return (B[m[1]] << 3) | B[m[2]];
      };
      expect(`${a.text}↔${b.text} 异或=${(bits(a.note!) ^ bits(b.note!)).toString(2)}`)
        .toBe(`${a.text}↔${b.text} 异或=111111`);
    }
  });

  it("坤居北、乾居南", () => {
    expect(at(RING_GUA_64, 0).text).toBe("坤");
    expect(at(RING_GUA_64, 180).text).toBe("乾");
  });

  it("每卦 5.625°（64 × 5.625 = 360）", () => {
    const r = readRing(RING_GUA_64, 100);
    const [a, b] = r.range;
    expect(`跨度=${norm360(b - a).toFixed(3)}`).toBe("跨度=5.625");
  });
});

describe("盘制组成", () => {
  const plates: PlateType[] = ["sanhe", "sanyuan", "zonghe", "jianyi"];

  it.each(plates)("%s 的圈层 id 均已定义", (p) => {
    for (const id of PLATE_RINGS[p]) expect(`${p}:${id}`).toBe(`${p}:${RINGS_BY_ID.get(id)?.id}`);
  });

  it("三合盘有三针、无易卦层；三元盘有易卦层、只一层二十四山", () => {
    const sanhe = new Set(PLATE_RINGS.sanhe);
    expect(sanhe.has("renpan-zhongzhen") && sanhe.has("tianpan-fengzhen")).toBe(true);
    expect(sanhe.has("gua-64")).toBe(false);

    const sanyuan = new Set(PLATE_RINGS.sanyuan);
    expect(sanyuan.has("gua-64")).toBe(true);
    expect(sanyuan.has("renpan-zhongzhen") || sanyuan.has("tianpan-fengzhen")).toBe(false);
  });

  it("综合盘含全部圈层，简易盘最省", () => {
    expect(`综合=${PLATE_RINGS.zonghe.length}`).toBe(`综合=${ALL_RINGS.length}`);
    expect(PLATE_RINGS.jianyi.length).toBeLessThan(PLATE_RINGS.sanhe.length);
  });

  it("readPlate 返回条数与该盘制圈层数一致，且每条都有读数", () => {
    for (const p of plates) {
      const rows = readPlate(p, 173.4);
      expect(`${p} 条数=${rows.length}`).toBe(`${p} 条数=${ringsOf(p).length}`);
      for (const r of rows) expect(r.cell.text.length).toBeGreaterThan(0);
    }
  });
});
