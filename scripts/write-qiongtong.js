const fs = require("fs");

const text = fs.readFileSync("C:/Users/Administrator/Desktop/guoxue-platform/temp_qiongtong.txt", "utf8");

// Skip header, start from the actual content
const start = text.indexOf("穷通宝鉴\n");
const main = text.substring(start > 0 ? start : 0);

// Split on section headers
const sections = main.split(/\n(?=五行总论|论[甲乙丙丁戊己庚辛壬癸]|十干)/).filter(s => s.trim().length > 100);

function esc(s) {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "");
}

function trim(s, max) {
  s = s.trim();
  return s.length <= max ? s : s.substring(0, max) + "...";
}

const ganMap = { "甲": "甲木", "乙": "乙木", "丙": "丙火", "丁": "丁火", "戊": "戊土", "己": "己土", "庚": "庚金", "辛": "辛金", "壬": "壬水", "癸": "癸水" };

const chapters = [];
for (const sec of sections) {
  const firstLine = sec.trim().split("\n")[0].trim();
  let title = firstLine.length > 40 ? firstLine.substring(0, 40) : firstLine;

  // Skip header artifacts
  if (title.includes("目录") || title.includes("易藏") || title.includes("术数") || title.includes("殆知阁")) continue;
  if (sec.trim().length < 200) continue;

  const content = trim(sec, 3000);
  const tags = ["穷通宝鉴", "调候"];

  for (const [gan, name] of Object.entries(ganMap)) {
    if (title.includes(gan)) { tags.push(name, "月令"); break; }
  }
  if (title.includes("五行")) tags.push("五行");
  if (title.includes("总论")) tags.push("总论");

  chapters.push({ title, content, tags });
}

console.log("Chapters found:", chapters.length);

// Build TS file
let out = `import { BaziBookSeed } from "../classic-bazi-seeder.service";

/**
 * 《穷通宝鉴》— 明·余春台 整理
 *
 * 又名《拦江网》，明代江湖抄本，清余春台整理成书。
 * 以十天干配十二月令论调候用神，共120种组合。
 * 是八字推命中"调候法"的核心经典。
 */
const qiongtongbaojian: BaziBookSeed = {
  title: "穷通宝鉴",
  author: "余春台（整理）",
  dynasty: "明",
  intro:
    "八字命理'调候法'核心经典，又名《拦江网》。原为明代江湖抄本，清代余春台整理成书，后由徐乐吾评注发扬光大。以十天干配十二月令逐一论述调候用神，共120种组合，是推命论运最重要的工具书。核心主张：五行之气随月令而变化，必先调候然后论生克。",
  source: "殆知阁藏本 / 余春台整理本 / 徐乐吾评注本",
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

export default qiongtongbaojian;
`;

const outPath = "C:/Users/Administrator/Desktop/guoxue-platform/apps/server/src/modules/classic/bazi-books/qiongtongbaojian.ts";
fs.writeFileSync(outPath, out);
console.log("Written:", outPath);
console.log("Size:", out.length, "chars");
