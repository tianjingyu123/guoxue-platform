// ── 二十四山计算引擎 ──
// 风水二十四山方位详解
// 算法参考：《罗经解定》《青囊奥语》《天玉经》《催官篇》
// 《青囊奥语》云：「二十四山分五行，知得荣枯死与生。」
// 《罗经解定》：「二十四山者，八卦之支干，罗经之纲领也。」

import type { ShanDetail, ErShiSiShanInput, ErShiSiShanResult } from "@guoxue/shared";

const SHAN_DB: ShanDetail[] = [
  { name:"子", angle:"0°(正北)", baGua:"坎", wuXing:"水", yinYang:"阳", sanYuanLong:"天元龙", gua:"坎", naJia:"戊", jiuXing:"贪狼", jiXiong:"吉", yi:"安床/开门/放水", ji:"动土/修造", yingShi:"主科甲文贵", shuiFa:"收右水倒左" },
  { name:"癸", angle:"15°", baGua:"坎", wuXing:"水", yinYang:"阴", sanYuanLong:"人元龙", gua:"坎", naJia:"－", jiuXing:"巨门", jiXiong:"平", yi:"安灶/修宅", ji:"葬坟", yingShi:"主财帛", shuiFa:"宜收逆水" },
  { name:"丑", angle:"30°", baGua:"艮", wuXing:"土", yinYang:"阴", sanYuanLong:"地元龙", gua:"艮", naJia:"己", jiuXing:"禄存", jiXiong:"凶", yi:"－", ji:"安门/安床", yingShi:"主口舌是非", shuiFa:"忌直冲水" },
  { name:"艮", angle:"45°(东北)", baGua:"艮", wuXing:"土", yinYang:"阳", sanYuanLong:"天元龙", gua:"艮", naJia:"丙", jiuXing:"文曲", jiXiong:"吉", yi:"安门/安床/修造", ji:"放水", yingShi:"主丁财两旺", shuiFa:"宜收右水倒左" },
  { name:"寅", angle:"60°", baGua:"艮", wuXing:"木", yinYang:"阳", sanYuanLong:"人元龙", gua:"艮", naJia:"－", jiuXing:"廉贞", jiXiong:"凶", yi:"－", ji:"修造/动土", yingShi:"主火灾血光", shuiFa:"忌直射水" },
  { name:"甲", angle:"75°", baGua:"震", wuXing:"木", yinYang:"阳", sanYuanLong:"地元龙", gua:"震", naJia:"庚", jiuXing:"武曲", jiXiong:"吉", yi:"安门/修造/出行", ji:"葬坟", yingShi:"主功名富贵", shuiFa:"宜收左水倒右" },
  { name:"卯", angle:"90°(正东)", baGua:"震", wuXing:"木", yinYang:"阴", sanYuanLong:"天元龙", gua:"震", naJia:"庚", jiuXing:"破军", jiXiong:"吉", yi:"安床/开门/嫁娶", ji:"修灶", yingShi:"主桃花人缘", shuiFa:"宜收逆水" },
  { name:"乙", angle:"105°", baGua:"震", wuXing:"木", yinYang:"阴", sanYuanLong:"人元龙", gua:"震", naJia:"－", jiuXing:"左辅", jiXiong:"平", yi:"安灶/修宅", ji:"安门", yingShi:"主田产", shuiFa:"宜收顺水" },
  { name:"辰", angle:"120°", baGua:"巽", wuXing:"土", yinYang:"阳", sanYuanLong:"地元龙", gua:"巽", naJia:"辛", jiuXing:"右弼", jiXiong:"凶", yi:"－", ji:"安门/安床/修造", yingShi:"主牢狱官非", shuiFa:"忌冲射水" },
  { name:"巽", angle:"135°(东南)", baGua:"巽", wuXing:"木", yinYang:"阴", sanYuanLong:"天元龙", gua:"巽", naJia:"辛", jiuXing:"贪狼", jiXiong:"吉", yi:"安门/修文峰/安床", ji:"放水", yingShi:"主文昌科甲", shuiFa:"宜收左水倒右" },
  { name:"巳", angle:"150°", baGua:"巽", wuXing:"火", yinYang:"阳", sanYuanLong:"人元龙", gua:"巽", naJia:"－", jiuXing:"巨门", jiXiong:"平", yi:"安灶", ji:"安门/出行", yingShi:"主口舌官司", shuiFa:"宜收逆水" },
  { name:"丙", angle:"165°", baGua:"离", wuXing:"火", yinYang:"阳", sanYuanLong:"地元龙", gua:"离", naJia:"壬", jiuXing:"禄存", jiXiong:"凶", yi:"－", ji:"安床/修造", yingShi:"主眼疾火灾", shuiFa:"忌直水" },
  { name:"午", angle:"180°(正南)", baGua:"离", wuXing:"火", yinYang:"阳", sanYuanLong:"天元龙", gua:"离", naJia:"壬", jiuXing:"文曲", jiXiong:"吉", yi:"安门/安床/嫁娶", ji:"修灶/动土", yingShi:"主富贵荣华", shuiFa:"宜收逆水" },
  { name:"丁", angle:"195°", baGua:"离", wuXing:"火", yinYang:"阴", sanYuanLong:"人元龙", gua:"离", naJia:"－", jiuXing:"廉贞", jiXiong:"平", yi:"安灶/修宅", ji:"安门", yingShi:"主寿元健康", shuiFa:"宜收顺水" },
  { name:"未", angle:"210°", baGua:"坤", wuXing:"土", yinYang:"阴", sanYuanLong:"地元龙", gua:"坤", naJia:"癸", jiuXing:"武曲", jiXiong:"凶", yi:"－", ji:"安门/安床", yingShi:"主脾胃病", shuiFa:"忌直冲水" },
  { name:"坤", angle:"225°(西南)", baGua:"坤", wuXing:"土", yinYang:"阴", sanYuanLong:"天元龙", gua:"坤", naJia:"乙", jiuXing:"破军", jiXiong:"吉", yi:"安门/安床/修造", ji:"放水/动土", yingShi:"主旺女丁贵", shuiFa:"宜收右水倒左" },
  { name:"申", angle:"240°", baGua:"坤", wuXing:"金", yinYang:"阳", sanYuanLong:"人元龙", gua:"坤", naJia:"－", jiuXing:"左辅", jiXiong:"平", yi:"安灶/修宅", ji:"安门/出行", yingShi:"主盗贼破财", shuiFa:"宜收逆水" },
  { name:"庚", angle:"255°", baGua:"兑", wuXing:"金", yinYang:"阳", sanYuanLong:"地元龙", gua:"兑", naJia:"甲", jiuXing:"右弼", jiXiong:"吉", yi:"安门/出行/交易", ji:"葬坟", yingShi:"主武贵兵权", shuiFa:"宜收左水倒右" },
  { name:"酉", angle:"270°(正西)", baGua:"兑", wuXing:"金", yinYang:"阴", sanYuanLong:"天元龙", gua:"兑", naJia:"甲", jiuXing:"贪狼", jiXiong:"吉", yi:"安门/安床/开市", ji:"修灶", yingShi:"主口才艺术", shuiFa:"宜收逆水" },
  { name:"辛", angle:"285°", baGua:"兑", wuXing:"金", yinYang:"阴", sanYuanLong:"人元龙", gua:"兑", naJia:"－", jiuXing:"巨门", jiXiong:"平", yi:"安灶/修宅", ji:"安门", yingShi:"主肺病咳嗽", shuiFa:"宜收顺水" },
  { name:"戌", angle:"300°", baGua:"乾", wuXing:"土", yinYang:"阳", sanYuanLong:"地元龙", gua:"乾", naJia:"丁", jiuXing:"禄存", jiXiong:"凶", yi:"－", ji:"安门/安床/修造", yingShi:"主官非口舌", shuiFa:"忌冲射水" },
  { name:"乾", angle:"315°(西北)", baGua:"乾", wuXing:"金", yinYang:"阳", sanYuanLong:"天元龙", gua:"乾", naJia:"甲壬", jiuXing:"文曲", jiXiong:"吉", yi:"安门/修造/出行", ji:"放水", yingShi:"主得贵旺丁", shuiFa:"宜收左水倒右" },
  { name:"亥", angle:"330°", baGua:"乾", wuXing:"水", yinYang:"阴", sanYuanLong:"人元龙", gua:"乾", naJia:"－", jiuXing:"廉贞", jiXiong:"平", yi:"安灶/修宅", ji:"安门", yingShi:"主水厄肾病", shuiFa:"宜收逆水" },
  { name:"壬", angle:"345°", baGua:"坎", wuXing:"水", yinYang:"阳", sanYuanLong:"地元龙", gua:"坎", naJia:"戊", jiuXing:"武曲", jiXiong:"吉", yi:"安门/修造/出行", ji:"葬坟", yingShi:"主富贵双全", shuiFa:"宜收逆水" },
];

const BA_GUA_MAP: Record<string, string> = {
  "坎":"坎为水，北方之卦，主智/肾/耳，一阳陷于二阴之中，险陷也。",
  "艮":"艮为山，东北之卦，主土/脾/手，一阳止于二阴之上，静止也。",
  "震":"震为雷，东方之卦，主木/肝/足，一阳动于二阴之下，奋起也。",
  "巽":"巽为风，东南之卦，主木/胆/股，一阴伏于二阳之下，入也。",
  "离":"离为火，南方之卦，主火/心/目，一阴丽于二阳之中，明丽也。",
  "坤":"坤为地，西南之卦，主土/脾/腹，三阴纯厚，载物也。",
  "兑":"兑为泽，西方之卦，主金/肺/口，一阴见于二阳之上，悦也。",
  "乾":"乾为天，西北之卦，主金/大肠/头，三阳纯刚，健行也。",
};

export function calculateErShiSiShan(input: Record<string, unknown>): ErShiSiShanResult {
  const { shanName } = input as unknown as ErShiSiShanInput;
  const shan = shanName ? (SHAN_DB.find(s => s.name === shanName) || null) : null;
  const allShan = SHAN_DB;

  if (shan) {
    const baGuaInfo = BA_GUA_MAP[shan.baGua] || "";
    const jiXiongLabel = shan.jiXiong === "吉" ? "★ 吉" : shan.jiXiong === "凶" ? "⚠ 凶" : "· 平";

    // 同卦三山
    const sameGua = SHAN_DB.filter(s => s.baGua === shan.baGua);
    const sameGuaStr = sameGua.map(s => `${s.name}(${s.sanYuanLong})`).join("、");

    // 同元龙八山
    const sameYuan = SHAN_DB.filter(s => s.sanYuanLong === shan.sanYuanLong);
    const sameYuanStr = sameYuan.map(s => s.name).join(" ");

    const analysis = [
      `┌─ 二十四山详解：${shan.name}山 ─────────────────`,
      `│ 方位：${shan.angle} 八卦：${shan.baGua}卦 五行：${shan.wuXing} 阴阳：${shan.yinYang}`,
      `│ 三元龙：${shan.sanYuanLong} 纳甲：${shan.naJia} 九星：${shan.jiuXing}`,
      `│ 吉凶：${jiXiongLabel}`,
      ``,
      `├─ 卦象释义 ─────────────────`,
      `│ ${baGuaInfo}`,
      ``,
      `├─ 宜忌事项 ─────────────────`,
      `│ 宜：${shan.yi || "无特别适宜"}`,
      `│ 忌：${shan.ji || "无特别禁忌"}`,
      ``,
      `├─ 应事水法 ─────────────────`,
      `│ 应事：${shan.yingShi}`,
      `│ 水法：${shan.shuiFa}`,
      ``,
      `├─ 同卦三山 ─────────────────`,
      `│ ${sameGuaStr}`,
      ``,
      `├─ ${shan.sanYuanLong}八山 ─────────────────`,
      `│ ${sameYuanStr}`,
      ``,
      `├─ 古籍出处 ─────────────────`,
      `│ 《罗经解定》：「二十四山分八卦，每卦三山。」`,
      `│ 《天玉经》：「二十四山分顺逆，共成四十有八局。」`,
      `│ 《青囊奥语》：「颠颠倒，二十四山有珠宝。」`,
      ``,
      `└─ 实用要诀 ─────────────────`,
      `   ${shan.jiXiong === "吉" ? `${shan.name}山为吉山，宜取用。` : shan.jiXiong === "凶" ? `${shan.name}山为凶山，宜避之。若不得已用之，须合水法化解。` : `${shan.name}山为平山，须配合水法及元运取用。`}`,
      `   二十四山乃罗经之根本，识得山向方能知吉凶。`,
      `   故《催官篇》云：「识得阴阳玄妙理，知其生旺与衰死。」`,
    ].join("\n");
    return { shan, allShan, analysis };
  }

  // 无shanName时返回总览
  const jiShanCount = SHAN_DB.filter(s => s.jiXiong === "吉").length;
  const xiongShanCount = SHAN_DB.filter(s => s.jiXiong === "凶").length;
  const pingShanCount = SHAN_DB.filter(s => s.jiXiong === "平").length;

  const analysis = [
    `┌─ 二十四山总览 ─────────────────`,
    `│ 二十四山涵盖八卦24方位，每卦三山。`,
    `│ 吉山${jiShanCount}座 凶山${xiongShanCount}座 平山${pingShanCount}座`,
    ``,
    `├─ 三元龙分类 ─────────────────`,
    `│ 天元龙（父母）：子午卯酉 乾坤艮巽 — 天地之正气`,
    `│ 人元龙（顺子）：乙辛丁癸 寅申巳亥 — 顺承之气`,
    `│ 地元龙（逆子）：甲庚丙壬 辰戌丑未 — 逆承之气`,
    ``,
    `├─ 八卦配山 ─────────────────`,
    `│ 坎卦（水·北）：壬子癸`,
    `│ 艮卦（土·东北）：丑艮寅`,
    `│ 震卦（木·东）：甲卯乙`,
    `│ 巽卦（木·东南）：辰巽巳`,
    `│ 离卦（火·南）：丙午丁`,
    `│ 坤卦（土·西南）：未坤申`,
    `│ 兑卦（金·西）：庚酉辛`,
    `│ 乾卦（金·西北）：戌乾亥`,
    ``,
    `├─ 古籍出处 ─────────────────`,
    `│ 《青囊奥语》：「二十四山分五行，知得荣枯死与生。」`,
    `│ 《天玉经》：「二十四龙管三卦，莫与时师话。」`,
    `│ 《罗经解定》：「二十四山者，罗经之纲领。」`,
    ``,
    `└─ 请输入具体山名（如：子、午、卯、酉等）查看详情。`,
  ].join("\n");
  return { shan, allShan, analysis };
}
