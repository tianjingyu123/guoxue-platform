import { extractGlossary, BAZI_GLOSSARY } from "./bazi-glossary";
import { extractZiweiGlossary, ZIWEI_GLOSSARY } from "./ziwei-glossary";
import { extractLiuyaoGlossary, LIUYAO_GLOSSARY } from "./liuyao-glossary";
import { extractMeihuaGlossary, MEIHUA_GLOSSARY } from "./meihua-glossary";
import { extractQimenGlossary, QIMEN_GLOSSARY } from "./qimen-glossary";
import { extractDaliurenGlossary, DALIUREN_GLOSSARY } from "./daliuren-glossary";

/**
 * 术语注解是「同一份专业报告同时服务小白与行家」的关键机制：
 * 正文照专业口径写，看不懂的词点开就有解释，不必为小白另写一份浅版报告。
 *
 * 前提是词表要对得上自己那套术数的语言。六套术数各有各的词汇，
 * 混用等于没有注解——接入各自词表前实测：梅花借八字词表命中 0 条，六壬 2 条。
 * 因此这里用各盘报告正文里真实会出现的句子来验命中。
 */
const CASES: [string, (t: string[]) => any[], string, string[], string[]][] = [
  [
    "八字",
    extractGlossary,
    "癸水日主生于巳月，身弱财旺，格局为偏财格，用神取金。命带天乙贵人、驿马，大运走辛卯。",
    ["日主", "身弱", "偏财", "用神", "天乙贵人", "驿马", "大运"],
    [],
  ],
  [
    "紫微",
    extractZiweiGlossary,
    "命宫武曲七杀，身宫在夫妻，三方四正会照财帛官禄，生年化忌落在兄弟宫，水二局大限自二岁起，成杀破狼格。",
    ["命宫", "身宫", "三方四正", "化忌", "五行局", "大限", "杀破狼"],
    ["日主", "用神"],
  ],
  [
    "六爻",
    extractLiuyaoGlossary,
    "妻财持世，用神受月建克制而逢旬空，官鬼发动化进神，伏神藏于三爻之下，应期取出空之日。",
    ["妻财", "世爻", "用神", "月建", "旬空", "官鬼", "动爻", "进神", "伏神", "应期"],
    ["日主", "大运"],
  ],
  [
    "梅花",
    extractMeihuaGlossary,
    "体卦为乾，用卦为巽，体克用，互卦见坎，变卦生体，卦气得时，起卦时另有外应可参。",
    ["体卦", "用卦", "体克用", "互卦", "变卦", "卦气", "外应"],
    ["日主", "世爻"],
  ],
  [
    "奇门",
    extractQimenGlossary,
    // 用真实正文的措辞：局数在正文里写作「阴遁9局」，不出现「局数」二字
    "值符天禽落坤二宫，值使死门临九宫，天盘丙加地盘戊，乙丙丁三奇聚于巽四宫，本局阴遁9局，上元，用神落宫逢门迫与空亡。",
    ["值符", "值使", "天盘", "地盘", "三奇", "阴遁", "三元", "用神", "落宫", "门迫", "空亡", "九宫"],
    ["日主", "世爻"],
  ],
  [
    "六壬",
    extractDaliurenGlossary,
    "月将登明加占时，立四课取三传，本课为元首课，初传乘贵人，末传落旬空，昼贵顺布，日干代表求测人。",
    ["月将", "占时", "四课", "三传", "元首课", "初传", "贵人", "末传", "旬空", "昼贵", "日干"],
    ["日主", "体卦"],
  ],
];

describe("报告术语表", () => {
  it.each(CASES)("%s：正文里的专业词都点得开，不串别的术数", (_name, extract, text, expected, forbidden) => {
    const terms = extract([text]).map((t: any) => t.term);
    for (const e of expected) expect(terms).toContain(e);
    // 别的术数的词不该混进来
    for (const f of forbidden) expect(terms).not.toContain(f);
  });

  it("词条本身完整：释义写清「是什么」，并补一句「在盘上怎么用」", () => {
    const all = [
      ...BAZI_GLOSSARY, ...ZIWEI_GLOSSARY, ...LIUYAO_GLOSSARY,
      ...MEIHUA_GLOSSARY, ...QIMEN_GLOSSARY, ...DALIUREN_GLOSSARY,
    ];
    for (const t of all) {
      expect(t.term.trim()).not.toBe("");
      expect(t.brief.length).toBeGreaterThan(6);
      expect(t.group).toBeTruthy();
    }
  });

  it("同一词表内不重名，别名也不与他词同名（否则先命中的会吞掉后一条）", () => {
    for (const list of [BAZI_GLOSSARY, ZIWEI_GLOSSARY, LIUYAO_GLOSSARY, MEIHUA_GLOSSARY, QIMEN_GLOSSARY, DALIUREN_GLOSSARY]) {
      const keys = list.flatMap((t) => [t.term, ...(t.alias ?? [])]);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  /**
   * 引擎不算庙旺落陷，所以词表不能留下「报告会按庙陷判高低」的印象。
   *
   * 原先的规则是词表里一个「庙旺／落陷」都不许出现。但观点对照要讲清三合与飞星的分歧，
   * 绕不开这个词——三合派确实按庙陷判高低，而我们确实不算。
   * 于是把规则改精确：**可以提这个词，但必须在同一条里说明我们不据此下断语**。
   * 这样既讲得明白，又堵死「借着解释术语把庙陷断语写回来」的口子。
   */
  it("紫微词表提到庙旺落陷时，必须同时讲明本报告不据此判断", () => {
    const disclaim = /不计算庙陷|不拿庙陷|不重庙陷|不据此|不作断语依据|不取庙陷/;
    for (const t of ZIWEI_GLOSSARY) {
      const text = `${t.brief}${t.detail ?? ""}`;
      if (/庙旺|入庙|落陷|利陷|庙陷/.test(text)) {
        expect([t.term, disclaim.test(text)]).toEqual([t.term, true]);
      }
    }
  });

  it("空正文不产出注解", () => {
    for (const [, extract] of CASES) expect(extract([""])).toEqual([]);
  });
});
