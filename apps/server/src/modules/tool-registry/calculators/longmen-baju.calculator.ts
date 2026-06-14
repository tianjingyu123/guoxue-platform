// ── 龙门八局计算引擎 ──
// 算法参考：《青囊奥语》《天玉经》《催官篇》《阳宅十书》
// 龙门八局又名"先后天水法"，以坐山定先天后天方位，以水之来去判吉凶
// 《天玉经》云：「先天罗经十二支，后天再用干与维。」
// 《青囊奥语》：「先天为体，后天为用。体用兼备，方为全功。」

import type { LongMenBajuResult } from "@guoxue/shared";

// 24山→八卦局属性
const SHAN_BA_JU: Record<string, { gua: string; xianTianWei: string; houTianWei: string; jieSha: string; yaoSha: string; wuXing: string; classicalRef: string }> = {
  "壬": { gua:"坎", xianTianWei:"兑", houTianWei:"坤", jieSha:"辰", yaoSha:"午", wuXing:"水", classicalRef:"《催官篇》：「壬山属坎，先天兑后天坤。」" },
  "子": { gua:"坎", xianTianWei:"兑", houTianWei:"坤", jieSha:"辰", yaoSha:"午", wuXing:"水", classicalRef:"《天玉经》：「子山午向，先天在兑后天在坤。」" },
  "癸": { gua:"坎", xianTianWei:"兑", houTianWei:"坤", jieSha:"辰", yaoSha:"午", wuXing:"水", classicalRef:"《催官篇》：「癸山属坎，与子壬同局。」" },
  "丑": { gua:"艮", xianTianWei:"乾", houTianWei:"震", jieSha:"寅", yaoSha:"卯", wuXing:"土", classicalRef:"《催官篇》：「丑山属艮，先天乾后天震。」" },
  "艮": { gua:"艮", xianTianWei:"乾", houTianWei:"震", jieSha:"寅", yaoSha:"卯", wuXing:"土", classicalRef:"《天玉经》：「艮山坤向，先天在乾后天在震。」" },
  "寅": { gua:"艮", xianTianWei:"乾", houTianWei:"震", jieSha:"寅", yaoSha:"卯", wuXing:"木", classicalRef:"《催官篇》：「寅山属艮，先天乾后天震。」" },
  "甲": { gua:"震", xianTianWei:"离", houTianWei:"艮", jieSha:"申", yaoSha:"酉", wuXing:"木", classicalRef:"《催官篇》：「甲山属震，先天离后天艮。」" },
  "卯": { gua:"震", xianTianWei:"离", houTianWei:"艮", jieSha:"申", yaoSha:"酉", wuXing:"木", classicalRef:"《天玉经》：「卯山酉向，先天在离后天在艮。」" },
  "乙": { gua:"震", xianTianWei:"离", houTianWei:"艮", jieSha:"申", yaoSha:"酉", wuXing:"木", classicalRef:"《催官篇》：「乙山属震，与卯甲同局。」" },
  "辰": { gua:"巽", xianTianWei:"坤", houTianWei:"兑", jieSha:"卯", yaoSha:"子", wuXing:"土", classicalRef:"《催官篇》：「辰山属巽，先天坤后天兑。」" },
  "巽": { gua:"巽", xianTianWei:"坤", houTianWei:"兑", jieSha:"卯", yaoSha:"子", wuXing:"木", classicalRef:"《天玉经》：「巽山乾向，先天在坤后天在兑。」" },
  "巳": { gua:"巽", xianTianWei:"坤", houTianWei:"兑", jieSha:"卯", yaoSha:"子", wuXing:"火", classicalRef:"《催官篇》：「巳山属巽，与辰巽同局。」" },
  "丙": { gua:"离", xianTianWei:"震", houTianWei:"乾", jieSha:"亥", yaoSha:"酉", wuXing:"火", classicalRef:"《催官篇》：「丙山属离，先天震后天乾。」" },
  "午": { gua:"离", xianTianWei:"震", houTianWei:"乾", jieSha:"亥", yaoSha:"酉", wuXing:"火", classicalRef:"《天玉经》：「午山子向，先天在震后天在乾。」" },
  "丁": { gua:"离", xianTianWei:"震", houTianWei:"乾", jieSha:"亥", yaoSha:"酉", wuXing:"火", classicalRef:"《催官篇》：「丁山属离，与午丙同局。」" },
  "未": { gua:"坤", xianTianWei:"巽", houTianWei:"坎", jieSha:"酉", yaoSha:"卯", wuXing:"土", classicalRef:"《催官篇》：「未山属坤，先天巽后天坎。」" },
  "坤": { gua:"坤", xianTianWei:"巽", houTianWei:"坎", jieSha:"酉", yaoSha:"卯", wuXing:"土", classicalRef:"《天玉经》：「坤山艮向，先天在巽后天在坎。」" },
  "申": { gua:"坤", xianTianWei:"巽", houTianWei:"坎", jieSha:"酉", yaoSha:"卯", wuXing:"金", classicalRef:"《催官篇》：「申山属坤，与未坤同局。」" },
  "庚": { gua:"兑", xianTianWei:"坎", houTianWei:"巽", jieSha:"巳", yaoSha:"卯", wuXing:"金", classicalRef:"《催官篇》：「庚山属兑，先天坎后天巽。」" },
  "酉": { gua:"兑", xianTianWei:"坎", houTianWei:"巽", jieSha:"巳", yaoSha:"卯", wuXing:"金", classicalRef:"《天玉经》：「酉山卯向，先天在坎后天在巽。」" },
  "辛": { gua:"兑", xianTianWei:"坎", houTianWei:"巽", jieSha:"巳", yaoSha:"卯", wuXing:"金", classicalRef:"《催官篇》：「辛山属兑，与酉庚同局。」" },
  "戌": { gua:"乾", xianTianWei:"艮", houTianWei:"离", jieSha:"午", yaoSha:"酉", wuXing:"土", classicalRef:"《催官篇》：「戌山属乾，先天艮后天离。」" },
  "乾": { gua:"乾", xianTianWei:"艮", houTianWei:"离", jieSha:"午", yaoSha:"酉", wuXing:"金", classicalRef:"《天玉经》：「乾山巽向，先天在艮后天在离。」" },
  "亥": { gua:"乾", xianTianWei:"艮", houTianWei:"离", jieSha:"午", yaoSha:"酉", wuXing:"水", classicalRef:"《催官篇》：「亥山属乾，与戌乾同局。」" },
};

// 来水去水吉凶判断
const WATER_RULES: Record<string, { condition: string; jiXiong: string; desc: string }> = {
  "xianTianLai": { condition:"来水在先天位", jiXiong:"大吉", desc:"先天水朝堂，主人丁兴旺，子孙昌盛，是最吉的水局。先天为体，得先天水则根基稳固。" },
  "houTianLai": { condition:"来水在后天位", jiXiong:"上吉", desc:"后天水朝堂，主财运亨通，事业发达，财源广进。后天为用，得后天水则财利丰盈。" },
  "jieShaQu": { condition:"去水在劫煞位", jiXiong:"大凶", desc:"劫煞方出水，主损丁破财、血光之灾。劫煞为最凶之水口，犯之必有大祸。" },
  "yaoShaQu": { condition:"去水在曜煞位", jiXiong:"凶", desc:"曜煞方出水，主官非口舌、疾病缠身。曜煞次凶，亦需尽力避免。" },
  "wuGuanShui": { condition:"来水在天劫/地刑位", jiXiong:"凶", desc:"天劫地刑方来水，主是非不断、家宅不宁。宜去不宜来。" },
};

export function calculateLongMenBaju(input: Record<string, unknown>): LongMenBajuResult {
  const zuoShan = (input.zuoShan as string) || "子山";
  const laiShui = (input.laiShui as string) || "";
  const quShui = (input.quShui as string) || "";

  const zuoGua = zuoShan[0] || "子";
  const bagua = SHAN_BA_JU[zuoGua] || SHAN_BA_JU["子"];

  let jiXiong = "吉";
  const descParts: string[] = [];
  descParts.push(`坐山${zuoShan}属${bagua.gua}卦（${bagua.wuXing}），先天位在${bagua.xianTianWei}，后天位在${bagua.houTianWei}。`);

  if (laiShui) {
    const laiZhi = laiShui[0] || "";
    const laiInfo = SHAN_BA_JU[laiZhi];
    const laiGua = laiInfo?.gua;
    if (laiGua === bagua.xianTianWei) {
      jiXiong = "大吉";
      descParts.push(WATER_RULES["xianTianLai"]?.desc || "");
    } else if (laiGua === bagua.houTianWei) {
      if (jiXiong !== "大吉") jiXiong = "上吉";
      descParts.push(WATER_RULES["houTianLai"]?.desc || "");
    } else {
      descParts.push(`来水${laiShui}（${laiInfo?.gua || "未知"}卦）不在先后天水方位，水局一般。`);
    }
  }

  if (quShui) {
    const quZhi = quShui[0] || "";
    const quInfo = SHAN_BA_JU[quZhi];
    const quGua = quInfo?.gua;
    if (quGua === bagua.jieSha) {
      jiXiong = "大凶";
      descParts.push(WATER_RULES["jieShaQu"]?.desc || "");
    } else if (quGua === bagua.yaoSha) {
      if (jiXiong !== "大凶") jiXiong = "凶";
      descParts.push(WATER_RULES["yaoShaQu"]?.desc || "");
    }
  }

  const desc = descParts.join("");
  const jiLabel = jiXiong === "大吉" ? "★★★" : jiXiong === "上吉" ? "★★" : jiXiong === "凶" ? "⚠" : jiXiong === "大凶" ? "☠" : "·";

  const summary = [
    `┌─ 龙门八局：${zuoShan} ─────────────────`,
    `│ 坐山：${zuoShan}（${bagua.gua}卦·${bagua.wuXing}）`,
    `│ 先天位：${bagua.xianTianWei}方（来水旺丁）`,
    `│ 后天位：${bagua.houTianWei}方（来水旺财）`,
    `│ 劫煞位：${bagua.jieSha}方（出水大凶！忌来水去水皆凶）`,
    `│ 曜煞位：${bagua.yaoSha}方（出水凶！忌来水）`,
    `│ 综合吉凶：${jiLabel} ${jiXiong}`,
    ``,
    `├─ 水法判断 ─────────────────`,
    `│ ${laiShui ? `来水：${laiShui} — ${desc}` : "未提供来水信息"}`,
    `│ ${quShui ? `去水：${quShui} — ${desc}` : "未提供去水信息"}`,
    ``,
    `├─ 龙门八局要诀 ─────────────────`,
    `│ 1. 先天水宜来不宜去 — 来则旺丁，去则损丁`,
    `│ 2. 后天水宜来不宜去 — 来则旺财，去则破财`,
    `│ 3. 劫煞曜煞宜去不宜来 — 去则消灾，来则招祸`,
    `│ 4. 八局各有天劫/地刑/案劫三方，俱宜去水`,
    ``,
    `├─ 古籍出处 ─────────────────`,
    `│ ${bagua.classicalRef}`,
    `│ 《青囊奥语》：「先天为体，后天为用。」`,
    `│ 《天玉经》：「识得阴阳两路行，富贵达京城。」`,
    `│ 《催官篇》：「龙门八局，水法之宗。」`,
    ``,
    `└─ 综合判断 ─────────────────`,
    `   ${jiXiong === "大吉" || jiXiong === "上吉" ? "水法合局，来水得位，家宅兴旺可期。" : jiXiong === "凶" || jiXiong === "大凶" ? "水法犯煞，须实地勘察后以风水布局化解。严重者建议改水口方向。" : `坐山${zuoShan}，${bagua.gua}卦局。须结合来水去水实地测量后综合判断。`}`,
    `   龙门八局以水法为纲，然峦头为本理气为末，`,
    `   须山水兼看方能得全功。`,
  ].join("\n");

  return {
    analysis: {
      juType: `${bagua.gua}卦局`,
      xianTianShui: `${bagua.xianTianWei}方来水（旺丁）`,
      houTianShui: `${bagua.houTianWei}方来水（旺财）`,
      jieSha: `${bagua.jieSha}方（劫煞出水大凶）`,
      yaoSha: `${bagua.yaoSha}方（曜煞出水凶）`,
      jiXiong,
      description: desc,
    },
    summary,
  };
}
