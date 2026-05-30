const fs = require("fs");

function esc(s) {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "");
}

function trim(s, max) {
  s = s.trim();
  return s.length <= max ? s : s.substring(0, max) + "\\n...（原文甚长，此处节录）";
}

// ========== 三命通会 ==========
console.log("=== 三命通会 ===");
const sanmingTxt = fs.readFileSync("C:/Users/Administrator/Desktop/guoxue-platform/temp_sanming.txt", "utf8");
const smStart = sanmingTxt.indexOf("三命通会");
const smMain = sanmingTxt.substring(smStart > 0 ? smStart : 0);

// Split by volume headers
const smVols = smMain.split(/\n(?=卷[一二三四五六七八九十]+)/).filter(s => s.trim().length > 200);
console.log("三命通会卷数:", smVols.length);

const smChapters = [];
const smVolNames = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二"];

for (let i = 0; i < smVols.length; i++) {
  let title = "卷" + smVolNames[i + 1];
  if (i >= smVolNames.length) title = "卷" + (i + 1);

  const text = smVols[i];
  // Extract volume title from first line
  const firstLine = text.trim().split("\n")[0];
  if (firstLine.length > 3 && firstLine.length < 60 && !firstLine.includes("目录") && !firstLine.includes("易藏")) {
    title = firstLine.substring(0, 60);
  }

  const content = trim(text, 3000);
  const tags = ["三命通会"];
  if (content.includes("纳音")) tags.push("纳音");
  if (content.includes("贵人")) tags.push("神煞:天乙贵人");
  if (content.includes("格局")) tags.push("格局");
  if (content.includes("十干") || content.includes("天干")) tags.push("天干");
  if (content.includes("十二支") || content.includes("地支")) tags.push("地支");

  smChapters.push({ title, content, tags });
}

console.log("三命通会 章节数:", smChapters.length);

// ========== 渊海子平 ==========
console.log("\n=== 渊海子平 ===");
const yuanhaiTxt = fs.readFileSync("C:/Users/Administrator/Desktop/guoxue-platform/temp_yuanhai.txt", "utf8");
const yhStart = yuanhaiTxt.indexOf("渊海子平");
const yhMain = yuanhaiTxt.substring(yhStart > 0 ? yhStart : 0);

// Split by major section headers
const yhSections = yhMain.split(/\n(?=[论基内外二五六十]|卷[一二三四五]|[一二三四五六七八九十]+[、.])/).filter(s => s.trim().length > 100);
console.log("渊海子平 节数:", yhSections.length);

const yhChapters = [];
for (const sec of yhSections) {
  const firstLine = sec.trim().split("\n")[0].trim();
  let title = firstLine.length > 50 ? firstLine.substring(0, 50) : firstLine;
  if (title.includes("目录") || title.includes("易藏") || title.includes("术数") || title.includes("殆知阁")) continue;
  if (sec.trim().length < 150) continue;

  const content = trim(sec, 2500);
  const tags = ["渊海子平"];
  if (content.includes("官杀") || content.includes("正官")) tags.push("十神:正官");
  if (content.includes("伤官")) tags.push("十神:伤官");
  if (content.includes("财星") || content.includes("正财")) tags.push("十神:正财");
  if (content.includes("印绶") || content.includes("倒食")) tags.push("十神:正印");
  if (content.includes("食神")) tags.push("十神:食神");
  if (content.includes("五行")) tags.push("五行");
  if (content.includes("格局")) tags.push("格局");

  yhChapters.push({ title, content, tags });
}

console.log("渊海子平 章节数:", yhChapters.length);

// ========== Write 三命通会 TS file ==========
let out = `import { BaziBookSeed } from "../classic-bazi-seeder.service";

/**
 * 《三命通会》— 明·万民英（育吾山人）
 *
 * 十二卷，四库全书著录，八字命理集大成之作。
 * 万民英（1522-1603），明嘉靖进士，号育吾山人。
 * 全书总汇子平之术，于官印财禄食伤之名义、用神之轻重、
 * 诸神煞所系之吉凶，皆能采撮群言，得其精要。
 */
const sanmingtonghui: BaziBookSeed = {
  title: "三命通会",
  author: "万民英（育吾山人）",
  dynasty: "明",
  intro:
    "八字命理集大成之作，明万民英撰，十二卷，收入《四库全书》子部术数类。自明以来四百余年，谈星命者皆以此本为总汇，几于家有其书。体系宏大，涵盖纳音、神煞、格局、十干十二支、六十甲子、富贵贫贱寿夭等全部命学范畴，是命理学史上篇幅最大、内容最全面的经典。",
  source: "钦定四库全书本 / 殆知阁藏本",
  chapters: [
`;

for (const ch of smChapters) {
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

export default sanmingtonghui;
`;

const smPath = "C:/Users/Administrator/Desktop/guoxue-platform/apps/server/src/modules/classic/bazi-books/sanmingtonghui.ts";
fs.writeFileSync(smPath, out);
console.log("\n三命通会 written:", smPath, out.length, "chars");

// ========== Write 渊海子平 TS file ==========
let out2 = `import { BaziBookSeed } from "../classic-bazi-seeder.service";

/**
 * 《渊海子平》— 宋·徐大升 编
 *
 * 八字命理开山之作，"子平术"即以此书得名。
 * 五卷，系统论述五行、干支、十神、格局、六亲、女命等。
 */
const yuanhaiziping: BaziBookSeed = {
  title: "渊海子平",
  author: "徐大升（编）",
  dynasty: "宋",
  intro:
    "八字命理开山之作，'子平术'即以此书得名。宋代徐大升据徐子平论命之法编纂而成，共五卷。系统论述五行起源、天干地支、十神定义、格局分类（正官/七杀/财格/印绶/食神/伤官等）、六亲关系、女命专论等，奠定了子平术的完整理论基础。后世所有八字论命书籍，无不从此书出。",
  source: "殆知阁藏本 / 故宫珍本丛刊",
  chapters: [
`;

for (const ch of yhChapters) {
  out2 += `    {
      title: "${esc(ch.title)}",
      content:
        "${esc(ch.content)}",
      tags: ${JSON.stringify(ch.tags)},
    },
`;
}

out2 += `  ],
};

export default yuanhaiziping;
`;

const yhPath = "C:/Users/Administrator/Desktop/guoxue-platform/apps/server/src/modules/classic/bazi-books/yuanhaiziping.ts";
fs.writeFileSync(yhPath, out2);
console.log("渊海子平 written:", yhPath, out2.length, "chars");
