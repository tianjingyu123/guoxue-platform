const fs = require("fs");

// Read extracted text
const text = fs.readFileSync("C:/Users/Administrator/Desktop/guoxue-platform/temp_ditianshui.txt", "utf8");
const start = text.indexOf("欲识三元万法宗");
const main = text.substring(start);
const parts = main.split(/\n\s*(?=[一二三四五六七八九十]+\s*[、，])/);

// Chapter name mapping
const shang = ["天道","地道","人道","知命","理气","配合","天干","地支","干支总论","形象","方局","八格","体用","精神","月令","生时","衰旺","中和","源流","通关","官杀","伤官","清气","浊气","真神","假神","刚柔","顺逆","寒暖","燥湿","隐显","众寡","震兑","坎离"];
const xia = ["夫妻","子女","父母","兄弟","何知章","女命章","小儿","才德","奋郁","恩怨","闲神","从象","化象","假从","假化","顺局","反局","战局","合局","君象","臣象","母象","子象","性情","疾病","出身","地位","岁运","贞元"];

function esc(s) {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "");
}

function trim(s, max) {
  s = s.trim();
  return s.length <= max ? s : s.substring(0, max) + "...";
}

// Build chapters
const chapters = [];
for (let i = 0; i < parts.length; i++) {
  let name;
  if (i <= 33) {
    name = shang[i] || "第" + (i + 1) + "章";
  } else {
    const xi = i - 34;
    name = (xi < xia.length ? xia[xi] : null) || "第" + (i + 1) + "章";
  }

  const raw = trim(parts[i], 2000);

  const tags = ["滴天髓"];
  tags.push(i <= 33 ? "通神论" : "六亲论");
  if (raw.includes("官杀") || raw.includes("官星")) { tags.push("十神:正官"); tags.push("十神:七杀"); }
  if (raw.includes("伤官")) tags.push("十神:伤官");
  if (raw.includes("财神") || raw.includes("财星")) tags.push("十神:正财");
  if (raw.includes("印绶") || raw.includes("枭神")) tags.push("十神:正印");
  if (raw.includes("食神")) tags.push("十神:食神");
  if (raw.includes("比劫") || raw.includes("劫财")) tags.push("十神:劫财");

  chapters.push({ title: name, content: raw, tags });
}

// Build TS file
let out = `import { BaziBookSeed } from "../classic-bazi-seeder.service";

/**
 * 《滴天髓》— 宋·京图 撰 / 明·刘基 注 / 清·任铁樵 疏
 *
 * 中国传统命理学最重要的典籍，分上篇《通神论》34章、下篇《六亲论》29章。
 * 原文为京图所撰，刘伯温作注，任铁樵增注大量命例。
 */
const ditianshui: BaziBookSeed = {
  title: "滴天髓",
  author: "京图（撰）/ 刘基·伯温（注）/ 任铁樵（疏）",
  dynasty: "宋-明-清",
  intro:
    "中国传统命理学最重要的典籍。相传原文为宋人京图所撰，明代刘基（刘伯温）作注，清代道光年间任铁樵结合一生命理实践分篇增注，阐微发隐。分上篇《通神论》34章论命理法则，下篇《六亲论》29章论人事百态，附大量实战命例。",
  source: "殆知阁藏本 / 任铁樵《滴天髓阐微》",
  chapters: [
`;

for (const ch of chapters) {
  out += `    {
      title: "${esc(ch.title)}",
      content:
        "${esc(ch.content)}",
      tags: ${JSON.stringify(ch.tags)},
    },
`;
}

out += `  ],
};

export default ditianshui;
`;

const outPath = "C:/Users/Administrator/Desktop/guoxue-platform/apps/server/src/modules/classic/bazi-books/ditianshui.ts";
fs.writeFileSync(outPath, out);
console.log("Written:", outPath);
console.log("Size:", out.length, "chars");
console.log("Chapters:", chapters.length);
