// ── 乾坤国宝（三元八卦水法） ──
// 算法参考：《青囊奥语》《天玉经》《催官篇》《阳宅十书》
// 乾坤国宝又名"三元八卦水法"，以坐山定天劫/地刑/宾位/客位四方
import type { GuoBaoResult } from "@guoxue/shared";

// 八卦水法属性
const GUA_SHUI_FA: Record<string, { tianJie: string; diJie: string; binWei: string; keWei: string; classicalRef: string; wuXing: string }> = {
  "坎": { tianJie: "离", diJie: "坤", binWei: "震", keWei: "兑", wuXing: "水", classicalRef: "《青囊奥语》：「坎离水火中天过，龙墀移帝座。」" },
  "坤": { tianJie: "震", diJie: "坎", binWei: "兑", keWei: "乾", wuXing: "土", classicalRef: "《催官篇》：「坤山属土，天劫在震。」" },
  "震": { tianJie: "乾", diJie: "离", binWei: "艮", keWei: "坤", wuXing: "木", classicalRef: "《天玉经》：「震为雷，天劫在乾。」" },
  "巽": { tianJie: "兑", diJie: "乾", binWei: "离", keWei: "艮", wuXing: "木", classicalRef: "《青囊奥语》：「巽山乾向，天劫在兑。」" },
  "乾": { tianJie: "震", diJie: "巽", binWei: "坤", keWei: "离", wuXing: "金", classicalRef: "《催官篇》：「乾山属金，天劫在震。」" },
  "兑": { tianJie: "巽", diJie: "艮", binWei: "乾", keWei: "坎", wuXing: "金", classicalRef: "《天玉经》：「兑为泽，天劫在巽。」" },
  "艮": { tianJie: "兑", diJie: "震", binWei: "离", keWei: "巽", wuXing: "土", classicalRef: "《青囊奥语》：「艮山坤向，天劫在兑。」" },
  "离": { tianJie: "坎", diJie: "兑", binWei: "坤", keWei: "震", wuXing: "火", classicalRef: "《催官篇》：「离山属火，天劫在坎。」" },
};

// 24山→八卦
const SHAN_TO_GUA: Record<string, string> = {
  "壬":"坎","子":"坎","癸":"坎",
  "丑":"艮","艮":"艮","寅":"艮",
  "甲":"震","卯":"震","乙":"震",
  "辰":"巽","巽":"巽","巳":"巽",
  "丙":"离","午":"离","丁":"离",
  "未":"坤","坤":"坤","申":"坤",
  "庚":"兑","酉":"兑","辛":"兑",
  "戌":"乾","乾":"乾","亥":"乾",
};

export function calculateQianKunGuoBao(input: Record<string, unknown>): GuoBaoResult {
  const zuoShan = (input.zuoShan as string) || "";
  const laiShui = (input.laiShui as string) || "";
  const quShui = (input.quShui as string) || "";

  const zuoGua = zuoShan ? SHAN_TO_GUA[zuoShan[0]] || "坎" : "坎";
  const fa = GUA_SHUI_FA[zuoGua] || GUA_SHUI_FA["坎"];

  let jiXiong = "吉";
  const descParts: string[] = [];
  descParts.push(`坐山${zuoShan || "未指定"}属${zuoGua}卦（${fa.wuXing}），天劫位在${fa.tianJie}方，地刑位在${fa.diJie}方。`);

  if (laiShui) {
    const laiGua = SHAN_TO_GUA[laiShui[0]] || "";
    if (laiGua === fa.tianJie) {
      jiXiong = "凶";
      descParts.push(`来水${laiShui}犯天劫位！天劫方来水为大凶，主损丁破财血光之灾。`);
    } else if (laiGua === fa.diJie) {
      if (jiXiong !== "凶") jiXiong = "小凶";
      descParts.push(`来水${laiShui}犯地刑位。地刑方来水为次凶，主官非口舌、家宅不宁。`);
    } else if (laiGua === fa.binWei) {
      descParts.push(`来水${laiShui}在宾位（${fa.binWei}方）。宾位来水为吉，主客方进益、外来助力。`);
    } else if (laiGua === fa.keWei) {
      descParts.push(`来水${laiShui}在客位（${fa.keWei}方）。客位来水为吉，主外方助益、财源自来。`);
    } else {
      descParts.push(`来水${laiShui}不在天劫地刑宾客之位，水局一般。`);
    }
  }

  if (quShui) {
    const quGua = SHAN_TO_GUA[quShui[0]] || "";
    if (quGua === fa.tianJie) {
      descParts.push(`去水${quShui}在天劫方出水为吉。天劫宜出不宜来，去水消灾解厄。`);
    } else if (quGua === fa.diJie) {
      descParts.push(`去水${quShui}在地刑方出水为吉。地刑宜出不宜来，去水化解官非。`);
    } else if (quGua === fa.binWei || quGua === fa.keWei) {
      descParts.push(`去水${quShui}在${quGua === fa.binWei ? "宾" : "客"}位出水。宾位客位来水为吉去水为平，需结合实地勘察。`);
    }
  }

  const desc = descParts.join("");
  const jiLabel = jiXiong === "吉" ? "★★★" : jiXiong === "小凶" ? "⚠" : jiXiong === "凶" ? "☠" : "·";

  const summary = [
    `┌─ 乾坤国宝·三元八卦水法 ─────────────────`,
    `│ 坐山：${zuoShan || "未指定"}（${zuoGua}卦·${fa.wuXing}）`,
    ``,
    `├─ 四方水法 ─────────────────`,
    `│ ☠ 天劫位：${fa.tianJie}方 — 忌来水！宜去水！最凶之位，犯之主损丁破财`,
    `│ ⚠ 地刑位：${fa.diJie}方 — 忌来水！宜去水！次凶，主官非口舌`,
    `│ ★ 宾位：${fa.binWei}方 — 宜来水！忌去水！吉位，主客方进益`,
    `│ ★ 客位：${fa.keWei}方 — 宜来水！忌去水！吉位，主外方助益`,
    ``,
    `├─ 水法判断 ─────────────────`,
    `│ ${laiShui ? `来水${laiShui}：${descParts.slice(1).join("")}` : "未提供来水信息"}`,
    `│ ${quShui ? `去水${quShui}：${descParts.slice(1).join("")}` : "未提供去水信息"}`,
    `│ 综合吉凶：${jiLabel} ${jiXiong}`,
    ``,
    `├─ 乾坤国宝要诀 ─────────────────`,
    `│ 1. 天劫方宜出不宜来 — 来则招灾，去则消祸`,
    `│ 2. 地刑方宜出不宜来 — 来则官非，去则化解`,
    `│ 3. 宾位方宜来不宜去 — 来则进益，去则损利`,
    `│ 4. 客位方宜来不宜去 — 来则助益，去则失援`,
    `│ 5. 辅卦/库池方位 — 宜蓄水聚财`,
    ``,
    `├─ 古籍出处 ─────────────────`,
    `│ ${fa.classicalRef}`,
    `│ 《青囊奥语》：「识得阴阳两路行，富贵达京城。」`,
    `│ 《天玉经》：「二十四山分五行，知得荣枯死与生。」`,
    ``,
    `└─ 综合判断 ─────────────────`,
    `   ${jiXiong === "吉" ? "水法合局，来水得位，家宅兴旺可期。" : jiXiong === "小凶" ? "水法犯地刑，虽非大凶亦需调整。" : jiXiong === "凶" ? "水法犯天劫！须实地勘察后以风水布局化解。严重者建议改水口方向。" : `坐山${zuoGua}卦局。须结合来水去水实地测量后综合判断。`}`,
    `   乾坤国宝水法以天劫地刑为核心，`,
    `   配以宾位客位辅卦，须实地勘察方得全功。`,
  ].join("\n");

  return {
    tianJie: `${fa.tianJie}方`,
    diJie: `${fa.diJie}方`,
    shuiLu: `宾位${fa.binWei}方来水/客位${fa.keWei}方来水`,
    jiXiong,
    description: desc,
    summary,
  } as GuoBaoResult & { summary: string };
}
