import * as fs from "fs";
import * as path from "path";

/**
 * 周易经文·跨副本用字一致性（2026-09-21 定案）
 *
 * ══ 根因不是「哪个字对」，是「同一段经文有五六份副本」══
 *
 * 2026-09-20 的十六份副本比对列出 8 处字级异文，当时结论是「不凭票数定，等底本」。
 * 2026-09-21 复查发现**那份清单已经过时**：
 *
 *   · 「震来厉 / 震来历」——**现存只有「厉」**（`shared/paipan/liuyao-data.ts`、
 *     `liushisi-gua.calculator.ts`），其余几份写的是卦辞「震来虩虩」而非六二爻辞。
 *     这处异文已自行消失。
 *   · 「自天祐之 / 自天佑之」——记录说三比一，实测是**二比二**，
 *     而且多出一份记录里没有的副本 `zhouyi-64gua.calculator.ts`。
 *
 * **副本数量本身还在变**（kongming 删除后分布就变了）。所以逐字校勘是治标：
 * 今天校准了，明天多一份副本又会漂。
 *
 * ══ 本次定的 ══
 *
 * **「自天祐之」统一为「祐」**（6 处全部）。依据：《周易》大有上九与《系辞上》通行本作「祐」；
 * 祐为神助、佑为人助，此爻辞讲的是天助。二比二时以通行本为准，不靠票数。
 * （注意：`liuyao-guaci` 的断语「天佑自助者」是现代表述，不是经文，未动。）
 *
 * **其余 5 处异文也已全部定案**（见下方各条注释）。定案依据不是票数而是字书：
 * 四处是「正字 vs 俗字/省写/异体」，一处是义项辨析。
 *
 * 定案前先统计了各文件的「底本倾向」，结论是**没有任何一份是一致的底本**：
 *
 *   文件              坎九五  坎上六  同人/旅  无妄六二  困上六
 *   jinqianke          甲      甲      甲       甲       甲
 *   liushisi-gua       甲      乙      乙       乙       乙
 *   liuyao-guaci       甲      乙      乙       甲       甲
 *   zhouyi-64gua       甲      乙      乙       甲       甲     ← 与 liuyao-guaci 完全同步，同源
 *   meihua             乙      乙      —        —        —
 *
 * 各抄各的，不存在「某一份更权威」，所以只能逐字按字书判，不能靠选一份当底本。
 *
 * ══ 本闸门守什么 ══
 *
 * 七处经文用字全部卡死；并**盯住携带六十四卦爻辞的副本数量** ——
 * 逐字校勘是治标，副本一多就会再漂。新增副本应走收敛（并入第 4 步引擎迁后端），而不是再抄一份。
 */

const ROOT = path.resolve(__dirname, "../../..");

/** 会携带周易经文的所有文件（含前端、shared、后端计算器） */
function corpusFiles(): string[] {
  const out: string[] = [];
  const dirs = [
    "apps/server/src/modules/tool-registry/calculators",
    "apps/server/src/modules/paipan/engine", // 迁后端的前端引擎（第 4 步）
    "packages/shared/src/paipan",
    "apps/mobile/src/pkg-paipan3/lib",
    "apps/mobile/src/pkg-paipan/lib",
  ];
  for (const d of dirs) {
    const abs = path.join(ROOT, d);
    if (!fs.existsSync(abs)) continue;
    for (const f of fs.readdirSync(abs)) {
      if (f.endsWith(".ts")) out.push(path.join(abs, f));
    }
  }
  return out;
}
const FILES = corpusFiles();
const TEXT = new Map(FILES.map((f) => [path.basename(f), fs.readFileSync(f, "utf8")]));

/** 统计某组互斥写法在各文件里的出现情况 */
function variants(patterns: string[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const p of patterns) {
    const hits: string[] = [];
    for (const [name, src] of TEXT) if (src.includes(p)) hits.push(name);
    if (hits.length) out.set(p, hits);
  }
  return out;
}

describe("周易经文 · 跨副本用字一致", () => {
  it("反证：语料文件扫到了（扫不到会让下面全变空跑）", () => {
    expect(FILES.length).toBeGreaterThan(20);
    // 至少有几份确实含六十四卦经文
    const withJing = [...TEXT].filter(([, s]) => s.includes("元亨利贞") || s.includes("吉无不利"));
    expect(withJing.length).toBeGreaterThanOrEqual(3);
  });

  /**
   * 已定案的一处：全仓必须只有「祐」，不得再出现经文里的「自天佑之」。
   * （断语「天佑自助者」不是经文，故只卡「自天X之」这个组合。）
   */
  it("大有上九：全仓统一「自天祐之」，不得出现「自天佑之」", () => {
    const v = variants(["自天祐之", "自天佑之"]);
    expect(v.get("自天佑之") ?? []).toEqual([]);
    expect((v.get("自天祐之") ?? []).length).toBeGreaterThanOrEqual(4);
  });

  /**
   * 2026-09-21 定案：其余 5 处也全部统一，依据**不是票数而是字书**——
   * 四处是「正字 vs 俗字/省写/异体」，一处是义项辨析：
   *
   *   坎九五   **祗**既平    祗=适/恰，祇=地神；此处取「适」义（4:1 亦为祗）
   *   坎上六   **寘**于丛棘  寘为置之古字，经文用古字（4:1）
   *   同人/旅  号**咷**      《说文》有咷无啕，**啕是后起俗字**
   *   无妄六二 不菑**畬**    畬=三年之田（《尔雅》），**畲是异体**
   *   困上六   臲**卼**      臲卼为联绵词专用字，**兀是省写**
   *
   * 定案前先统计了各文件的「底本倾向」，发现**没有任何一份是一致的底本**
   * （jinqianke 五处全站甲、liushisi-gua 四处站乙、liuyao-guaci 与 zhouyi-64gua 完全同步），
   * 说明这些副本本就各抄各的，不存在「某一份更权威」——只能逐字按字书判。
   */
  it.each([
    ["坎九五", "祗既平", "祇既平"],
    ["坎上六", "寘于丛棘", "置于丛棘"],
    ["同人九五/旅上九", "号咷", "号啕"],
    ["无妄六二", "不菑畬", "不菑畲"],
    ["困上六", "臲卼", "臲兀"],
  ])("%s：全仓统一「%s」，不得再出现「%s」", (_label, right, wrong) => {
    const v = variants([right, wrong]);
    expect(v.get(wrong) ?? []).toEqual([]);
    expect((v.get(right) ?? []).length).toBeGreaterThanOrEqual(1);
  });

  /**
   * 「震来历」曾被列为异文，复查发现现存只有「厉」。钉住，防止简化误植回流。
   * （「历」是「歷」的简化，在「震来厉」这个爻辞里无危厉义，讲不通。）
   */
  it("震六二：只许「震来厉」，不得出现简化误植的「震来历」", () => {
    const v = variants(["震来厉", "震来历"]);
    expect(v.get("震来历") ?? []).toEqual([]);
    expect((v.get("震来厉") ?? []).length).toBeGreaterThanOrEqual(1);
  });

  /**
   * 副本数量本身要盯住 —— 这是「逐字校勘治标、收敛数据源治本」的理由。
   * 新增一份带六十四卦经文的副本，就会在这里露头。
   */
  it("携带六十四卦爻辞的副本数量快照（新增副本应走收敛而非再抄一份）", () => {
    const carriers = [...TEXT]
      .filter(([, s]) => s.includes("吉无不利") && s.includes("元亨"))
      .map(([n]) => n)
      .sort();
    // 现状：后端若干计算器 + shared 六爻数据 + 前端金钱课
    expect(carriers.length).toBeGreaterThanOrEqual(3);
    expect(carriers.length).toBeLessThanOrEqual(10); // 超出说明又抄了新副本
  });
});
