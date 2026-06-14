// ── 玄空大卦计算引擎 ──
// 算法参考：《青囊奥语》《天玉经》《玄空秘旨》
// 六十四卦风水 + 抽爻换象 + 卦运卦气

import type { XuanKongDaGuaInput, XuanKongDaGuaResult, XuanKongYaoBian } from "@guoxue/shared";

const GUA = [
  { n:1, name:"乾为天", sym:"䷀", upper:"乾", lower:"乾", wx:9, yun:1 },
  { n:2, name:"坤为地", sym:"䷁", upper:"坤", lower:"坤", wx:1, yun:1 },
  { n:3, name:"水雷屯", sym:"䷂", upper:"坎", lower:"震", wx:6, yun:8 },
  { n:4, name:"山水蒙", sym:"䷃", upper:"艮", lower:"坎", wx:2, yun:4 },
  { n:5, name:"水天需", sym:"䷄", upper:"坎", lower:"乾", wx:7, yun:7 },
  { n:6, name:"天水讼", sym:"䷅", upper:"乾", lower:"坎", wx:3, yun:3 },
  { n:7, name:"地水师", sym:"䷆", upper:"坤", lower:"坎", wx:7, yun:7 },
  { n:8, name:"水地比", sym:"䷇", upper:"坎", lower:"坤", wx:7, yun:7 },
  { n:9, name:"风天小畜", sym:"䷈", upper:"巽", lower:"乾", wx:2, yun:8 },
  { n:10, name:"天泽履", sym:"䷉", upper:"乾", lower:"兑", wx:9, yun:6 },
  { n:11, name:"地天泰", sym:"䷊", upper:"坤", lower:"乾", wx:1, yun:9 },
  { n:12, name:"天地否", sym:"䷋", upper:"乾", lower:"坤", wx:9, yun:1 },
  { n:13, name:"天火同人", sym:"䷌", upper:"乾", lower:"离", wx:3, yun:9 },
  { n:14, name:"火天大有", sym:"䷍", upper:"离", lower:"乾", wx:7, yun:9 },
  { n:15, name:"地山谦", sym:"䷎", upper:"坤", lower:"艮", wx:6, yun:1 },
  { n:16, name:"雷地豫", sym:"䷏", upper:"震", lower:"坤", wx:8, yun:1 },
  { n:17, name:"泽雷随", sym:"䷐", upper:"兑", lower:"震", wx:4, yun:6 },
  { n:18, name:"山风蛊", sym:"䷑", upper:"艮", lower:"巽", wx:6, yun:4 },
  { n:19, name:"地泽临", sym:"䷒", upper:"坤", lower:"兑", wx:1, yun:6 },
  { n:20, name:"风地观", sym:"䷓", upper:"巽", lower:"坤", wx:2, yun:1 },
  { n:21, name:"火雷噬嗑", sym:"䷔", upper:"离", lower:"震", wx:3, yun:8 },
  { n:22, name:"山火贲", sym:"䷕", upper:"艮", lower:"离", wx:6, yun:4 },
  { n:23, name:"山地剥", sym:"䷖", upper:"艮", lower:"坤", wx:6, yun:4 },
  { n:24, name:"地雷复", sym:"䷗", upper:"坤", lower:"震", wx:1, yun:8 },
  { n:25, name:"天雷无妄", sym:"䷘", upper:"乾", lower:"震", wx:3, yun:8 },
  { n:26, name:"山天大畜", sym:"䷙", upper:"艮", lower:"乾", wx:6, yun:4 },
  { n:27, name:"山雷颐", sym:"䷚", upper:"艮", lower:"震", wx:6, yun:4 },
  { n:28, name:"泽风大过", sym:"䷛", upper:"兑", lower:"巽", wx:4, yun:6 },
  { n:29, name:"坎为水", sym:"䷜", upper:"坎", lower:"坎", wx:7, yun:7 },
  { n:30, name:"离为火", sym:"䷝", upper:"离", lower:"离", wx:3, yun:9 },
  { n:31, name:"泽山咸", sym:"䷞", upper:"兑", lower:"艮", wx:4, yun:6 },
  { n:32, name:"雷风恒", sym:"䷟", upper:"震", lower:"巽", wx:8, yun:8 },
  { n:33, name:"天山遁", sym:"䷠", upper:"乾", lower:"艮", wx:9, yun:4 },
  { n:34, name:"雷天大壮", sym:"䷡", upper:"震", lower:"乾", wx:8, yun:8 },
  { n:35, name:"火地晋", sym:"䷢", upper:"离", lower:"坤", wx:3, yun:1 },
  { n:36, name:"地火明夷", sym:"䷣", upper:"坤", lower:"离", wx:1, yun:1 },
  { n:37, name:"风火家人", sym:"䷤", upper:"巽", lower:"离", wx:2, yun:4 },
  { n:38, name:"火泽睽", sym:"䷥", upper:"离", lower:"兑", wx:3, yun:6 },
  { n:39, name:"水山蹇", sym:"䷦", upper:"坎", lower:"艮", wx:7, yun:4 },
  { n:40, name:"雷水解", sym:"䷧", upper:"震", lower:"坎", wx:8, yun:8 },
  { n:41, name:"山泽损", sym:"䷨", upper:"艮", lower:"兑", wx:6, yun:6 },
  { n:42, name:"风雷益", sym:"䷩", upper:"巽", lower:"震", wx:2, yun:8 },
  { n:43, name:"泽天夬", sym:"䷪", upper:"兑", lower:"乾", wx:4, yun:6 },
  { n:44, name:"天风姤", sym:"䷫", upper:"乾", lower:"巽", wx:9, yun:4 },
  { n:45, name:"泽地萃", sym:"䷬", upper:"兑", lower:"坤", wx:4, yun:6 },
  { n:46, name:"地风升", sym:"䷭", upper:"坤", lower:"巽", wx:1, yun:1 },
  { n:47, name:"泽水困", sym:"䷮", upper:"兑", lower:"坎", wx:4, yun:6 },
  { n:48, name:"水风井", sym:"䷯", upper:"坎", lower:"巽", wx:7, yun:4 },
  { n:49, name:"泽火革", sym:"䷰", upper:"兑", lower:"离", wx:4, yun:6 },
  { n:50, name:"火风鼎", sym:"䷱", upper:"离", lower:"巽", wx:3, yun:4 },
  { n:51, name:"震为雷", sym:"䷲", upper:"震", lower:"震", wx:8, yun:8 },
  { n:52, name:"艮为山", sym:"䷳", upper:"艮", lower:"艮", wx:6, yun:4 },
  { n:53, name:"风山渐", sym:"䷴", upper:"巽", lower:"艮", wx:2, yun:4 },
  { n:54, name:"雷泽归妹", sym:"䷵", upper:"震", lower:"兑", wx:8, yun:6 },
  { n:55, name:"雷火丰", sym:"䷶", upper:"震", lower:"离", wx:8, yun:8 },
  { n:56, name:"火山旅", sym:"䷷", upper:"离", lower:"艮", wx:3, yun:4 },
  { n:57, name:"巽为风", sym:"䷸", upper:"巽", lower:"巽", wx:2, yun:4 },
  { n:58, name:"兑为泽", sym:"䷹", upper:"兑", lower:"兑", wx:4, yun:6 },
  { n:59, name:"风水涣", sym:"䷺", upper:"巽", lower:"坎", wx:2, yun:4 },
  { n:60, name:"水泽节", sym:"䷻", upper:"坎", lower:"兑", wx:7, yun:7 },
  { n:61, name:"风泽中孚", sym:"䷼", upper:"巽", lower:"兑", wx:2, yun:4 },
  { n:62, name:"雷山小过", sym:"䷽", upper:"震", lower:"艮", wx:8, yun:8 },
  { n:63, name:"水火既济", sym:"䷾", upper:"坎", lower:"离", wx:7, yun:9 },
  { n:64, name:"火水未济", sym:"䷿", upper:"离", lower:"坎", wx:3, yun:3 },
];

const WX_NAMES: Record<number, string> = { 1:"水", 2:"火", 3:"木", 4:"金", 5:"土", 6:"水", 7:"火", 8:"木", 9:"金" };

const YUN_MEANING: Record<number, string> = {
  1: "一运（贪狼/坎/水）", 2: "二运（巨门/坤/土）", 3: "三运（禄存/震/木）",
  4: "四运（文曲/巽/木）", 5: "五运（廉贞/中宫/土）", 6: "六运（武曲/乾/金）",
  7: "七运（破军/兑/金）", 8: "八运（左辅/艮/土）", 9: "九运（右弼/离/火）",
};

const YAO_NAMES = ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"];

const WX_SHENG_KE: Record<string, Record<string, string>> = {
  "水": { "木":"生", "火":"克", "土":"被克", "金":"被生", "水":"比和" },
  "火": { "土":"生", "金":"克", "水":"被克", "木":"被生", "火":"比和" },
  "木": { "火":"生", "土":"克", "金":"被克", "水":"被生", "木":"比和" },
  "金": { "水":"生", "木":"克", "火":"被克", "土":"被生", "金":"比和" },
  "土": { "金":"生", "水":"克", "木":"被克", "火":"被生", "土":"比和" },
};

// 抽爻换象：翻转该爻的阴阳，得到变卦
function getYaoBian(gua: typeof GUA[0]): XuanKongYaoBian[] {
  // 每卦6爻的阴阳：用卦序号对应8宫卦的爻位来推算
  // 简化：根据上下卦生成抽爻换象
  const baguaYao = {
    "乾": [1,1,1], "兑": [0,1,1], "离": [1,0,1], "震": [0,0,1],
    "巽": [1,1,0], "坎": [0,1,0], "艮": [1,0,0], "坤": [0,0,0],
  };

  const upperYao = baguaYao[gua.upper as keyof typeof baguaYao];
  const lowerYao = baguaYao[gua.lower as keyof typeof baguaYao];
  const allYao = [...lowerYao, ...upperYao]; // 从下往上

  return allYao.map((y, i) => {
    const flipped = [...allYao];
    flipped[i] = y === 0 ? 1 : 0;
    const newUpper = flipped.slice(3).join(",");
    const newLower = flipped.slice(0, 3).join(",");

    const reverseMap: Record<string, string> = {
      "1,1,1":"乾","0,1,1":"兑","1,0,1":"离","0,0,1":"震",
      "1,1,0":"巽","0,1,0":"坎","1,0,0":"艮","0,0,0":"坤",
    };
    const upName = reverseMap[newUpper];
    const loName = reverseMap[newLower];
    const afterGuaName = `${upName}${loName === upName ? "" : loName}`;

    const afterGua = GUA.find(g => g.upper === upName && g.lower === loName);

    const wxRel = y === 0 ? "阳变阴" : "阴变阳";
    const jiXiongMap = ["平","吉","凶","吉","凶","平"];
    return {
      yaoIndex: i + 1,
      yaoName: YAO_NAMES[i],
      afterGua: afterGuaName,
      afterGuaNumber: afterGua?.n || 0,
      description: `${YAO_NAMES[i]}${wxRel}，变${afterGuaName}，玄空五行${afterGua ? WX_NAMES[afterGua.wx] : "?"}`,
      jiXiong: jiXiongMap[i] as "吉" | "凶" | "平",
    };
  });
}

function getGuaQi(guaYun: number, currentYun: number): "旺" | "衰" | "平" {
  if (guaYun === currentYun) return "旺";
  if (guaYun === (currentYun % 9) + 1) return "平";
  // 生入克出判断
  const diff = Math.abs(guaYun - currentYun);
  if (diff <= 2) return "平";
  return "衰";
}

function getCurrentYun(year: number): number {
  // 三元九运：2004-2023八运，2024-2043九运
  if (year >= 2024 && year < 2044) return 9;
  if (year >= 2004 && year < 2024) return 8;
  const since2004 = year - 2004;
  const yun = (8 + Math.floor(since2004 / 20)) % 9;
  return yun === 0 ? 9 : yun;
}

export function calculateXuanKongDaGua(input: Record<string, unknown>): XuanKongDaGuaResult {
  const { guaNumber, orientation, year } = input as unknown as XuanKongDaGuaInput;
  if (!Number.isInteger(guaNumber) || guaNumber < 1 || guaNumber > 64) {
    throw new Error("卦序号必须在1-64之间");
  }

  const gua = GUA.find(g => g.n === guaNumber)!;
  const currentYun = getCurrentYun(typeof year === "number" ? year : new Date().getFullYear());
  const wxName = WX_NAMES[gua.wx];
  const guaQi = getGuaQi(gua.yun, currentYun);

  const yaoBian = getYaoBian(gua);
  const tianXinZhengYun = `${YUN_MEANING[gua.yun]}，当前${YUN_MEANING[currentYun]}，卦气${guaQi === "旺" ? "旺相大吉" : guaQi === "平" ? "平和可安" : "衰败当避"}`;

  const qiXingDaJie = guaQi === "旺"
    ? "卦运当旺，七星打劫可用，宜收山出煞"
    : "卦运不当，七星不宜动，宜静守";

  const lingZheng = (gua.yun % 2 === 0)
    ? "零神方见水为吉，正神方见山为宜"
    : "正神方宜见山，零神方宜见水";

  const upperWx = gua.upper === "乾"|| gua.upper === "兑" ? "金" : gua.upper === "离" ? "火" : gua.upper === "震"||gua.upper==="巽" ? "木" : gua.upper === "坎" ? "水" : gua.upper === "坤"||gua.upper==="艮" ? "土" : "";
  const lowerWx = gua.lower === "乾"|| gua.lower === "兑" ? "金" : gua.lower === "离" ? "火" : gua.lower === "震"||gua.lower==="巽" ? "木" : gua.lower === "坎" ? "水" : gua.lower === "坤"||gua.lower==="艮" ? "土" : "";

  const wxRel = WX_SHENG_KE[upperWx]?.[lowerWx] || "比和";
  const shanShui = `上卦${gua.upper}(${upperWx})${wxRel === "生" ? "生" : wxRel === "克" ? "克" : wxRel}下卦${gua.lower}(${lowerWx})，${wxRel === "生" || wxRel === "被生" ? "山水有情" : wxRel === "克" ? "山克水主丁旺财衰" : wxRel === "被克" ? "水克山主财旺丁衰" : "山水比和"}`;

  // 天卦地卦：上卦为天卦，下卦为地卦，父母卦取归藏
  const tianGua = `${gua.upper}(${upperWx})`;
  const diGua = `${gua.lower}(${lowerWx})`;
  const fuMuGua = gua.upper === gua.lower ? `${gua.upper}为父母卦` : `${gua.upper}${gua.lower}为子息卦`;

  const ori = orientation || "未指定坐向";
  const analysis = [
    `${gua.name}卦，玄空五行${gua.wx}(${wxName})，卦运${gua.yun}运。`,
    `坐向：${ori}。当前${YUN_MEANING[currentYun]}。`,
    `卦气：${guaQi === "旺" ? "当运旺相" : guaQi === "平" ? "平运中和" : "失运衰败"}。`,
    `天卦${tianGua}，地卦${diGua}。${shanShui}`,
    `抽爻换象六爻变化各有吉凶，择吉爻而用之。`,
  ].join("");

  return {
    guaNumber,
    guaName: gua.name,
    guaSymbol: gua.sym,
    upperTrigram: gua.upper,
    lowerTrigram: gua.lower,
    xuanKongWx: { value: gua.wx, name: wxName },
    guaYun: gua.yun,
    tianGua,
    diGua,
    fuMuGua,
    guaQi,
    yaoBian,
    tianXinZhengYun,
    qiXingDaJie,
    lingZheng,
    shanShui,
    analysis,
  };
}
