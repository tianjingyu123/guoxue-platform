/**
 * 数据充实脚本：将从殆知阁等源下载的古籍完整原文写入种子数据文件
 *
 * 用法: node scripts/enrich-bazi-books.js
 * 源文件: temp_ditianshui.txt, temp_yuanhai.txt, temp_qiongtong.txt, temp_sanming.html
 */
const fs = require("fs");
const path = require("path");

const BASE = "C:/Users/Administrator/Desktop/guoxue-platform";
const TEMP_DIR = BASE;
const BOOKS_DIR = path.join(BASE, "apps/server/src/modules/classic/bazi-books");

// 读取提取的文本文件
function readText(filename) {
  const filePath = path.join(TEMP_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
}

// 从 HTML 中提取文本
function extractFromHtml(filename) {
  const filePath = path.join(TEMP_DIR, filename);
  if (!fs.existsSync(filePath)) return "";
  let html = fs.readFileSync(filePath, "utf8");
  html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  const m = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (!m) return "";
  let text = m[1]
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&#?\w+;/g, "");
  return text.replace(/\n{3,}/g, "\n\n").replace(/[ \t]+/g, " ").trim();
}

// 限制内容长度（数据库字段有大小限制）
function truncate(str, maxLen = 5000) {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen) + "\n...（原文甚长，此处节录）";
}

// 将文本分割为指定长度的多章内容
function splitIntoChapters(text, titles, maxPerChapter = 3000) {
  const chapters = [];
  let remaining = text;

  for (const title of titles) {
    const idx = remaining.indexOf(title);
    if (idx < 0) continue;

    if (idx > 50) {
      // 前面有前言内容
      const preamble = remaining.substring(0, idx).trim();
      if (preamble.length > 100) {
        chapters.push({ title: "前言", content: truncate(preamble, maxPerChapter) });
      }
    }

    remaining = remaining.substring(idx);
    // 找到下一个标题
    let endIdx = remaining.length;
    for (const nextTitle of titles) {
      if (nextTitle === title) continue;
      const ni = remaining.substring(title.length).indexOf(nextTitle);
      if (ni >= 0 && ni + title.length < endIdx) {
        endIdx = ni + title.length;
      }
    }

    const content = remaining.substring(0, endIdx).trim();
    chapters.push({
      title: title,
      content: truncate(content, maxPerChapter),
    });
    remaining = remaining.substring(endIdx);
  }

  return chapters;
}

// ===== 更新 滴天髓 =====
console.log("=== 处理 滴天髓 ===");
const dtianshuiText = readText("temp_ditianshui.txt");
const dtianshuiChapters = [];

const ditianTitles_shang = [
  "一、天道", "二、地道", "三、人道", "四、知命", "五、理气",
  "六、配合", "七、天干", "八、地支", "九、干支总论", "十、形象",
  "十一、方局", "十二、八格", "十三、体用", "十四、精神", "十五、月令",
  "十六、生时", "十七、衰旺", "十八、中和", "十九、源流", "二十、通关",
  "二十一、官杀", "二十二、伤官", "二十三、清气", "二十四、浊气",
  "二十五、真神", "二十六、假神", "二十七、刚柔", "二十八、顺逆",
  "二十九、寒暖", "三十、燥湿", "三十一、隐显", "三十二、众寡",
  "三十三、震兑", "三十四、坎离",
];

const ditianTitles_xia = [
  "夫妻", "子女", "父母", "兄弟", "何知章", "女命章", "小儿",
  "才德", "奋郁", "恩怨", "闲神", "从象", "化象", "假从", "假化",
  "顺局", "反局", "战局", "合局", "君象", "臣象", "母象", "子象",
  "性情", "疾病", "出身", "地位", "岁运", "贞元",
];

// 从 TOC 之后开始提取
const dtMainStart = dtianshuiText.indexOf("欲识三元万法宗");
if (dtMainStart > 0) {
  const dtMain = dtianshuiText.substring(dtMainStart);
  console.log("滴天髓正文长度:", dtMain.length);

  // 用正则匹配所有章节头
  const allTitles = [...ditianTitles_shang, ...ditianTitles_xia];
  let chapterStarts = [];

  for (const title of allTitles) {
    const idx = dtMain.indexOf("\n" + title);
    if (idx >= 0) {
      chapterStarts.push({ title, start: idx + 1 });
    }
  }

  chapterStarts.sort((a, b) => a.start - b.start);

  for (let i = 0; i < chapterStarts.length; i++) {
    const ch = chapterStarts[i];
    const nextStart = i + 1 < chapterStarts.length ? chapterStarts[i + 1].start : dtMain.length;
    const content = dtMain.substring(ch.start, nextStart).trim();
    const shortContent = content.substring(0, 2000).trim();

    const tags = [];
    if (shortContent.includes("官杀") || shortContent.includes("官星")) tags.push("十神:正官", "十神:七杀");
    if (shortContent.includes("伤官")) tags.push("十神:伤官");
    if (shortContent.includes("印绶") || shortContent.includes("枭神")) tags.push("十神:正印");
    if (shortContent.includes("财星")) tags.push("十神:正财");

    dtianshuiChapters.push({
      title: ch.title,
      content: shortContent,
      tags,
    });
  }
}

console.log(`滴天髓: ${dtianshuiChapters.length} 章`);

// ===== 更新 穷通宝鉴 =====
console.log("\n=== 处理 穷通宝鉴 ===");
const qiongtongText = readText("temp_qiongtong.txt");
const qiongtongTitleIdx = qiongtongText.indexOf("穷通宝鉴");
const qiongtongMain = qiongtongTitleIdx > 0 ? qiongtongText.substring(qiongtongTitleIdx) : qiongtongText;

// 提取各部分
const sections = qiongtongMain.split(/\n(?=[论十甲乙丙丁戊己庚辛壬癸五])/).filter(s => s.trim().length > 100);

console.log(`穷通宝鉴: ${sections.length} 节`);
const qiongtongChapters = [];
const ganMap = { "甲": "甲木", "乙": "乙木", "丙": "丙火", "丁": "丁火", "戊": "戊土", "己": "己土", "庚": "庚金", "辛": "辛金", "壬": "壬水", "癸": "癸水" };

for (const sec of sections) {
  const lines = sec.trim().split("\n");
  let title = lines[0].trim();
  if (title.length > 40) title = title.substring(0, 40);
  const content = sec.trim().substring(0, 3000);

  const tags = [];
  for (const [gan, name] of Object.entries(ganMap)) {
    if (title.includes(gan)) { tags.push(name, "调候", "月令"); break; }
  }
  if (title.includes("五行")) tags.push("五行");
  if (title.includes("总论")) tags.push("总论");

  qiongtongChapters.push({ title, content, tags });
}

// ===== 输出摘要 =====
console.log("\n=== 统计 ===");
console.log(`滴天髓: ${dtianshuiChapters.length} 章`);
console.log(`穷通宝鉴: ${qiongtongChapters.length} 章`);

// 输出示例内容
if (dtianshuiChapters.length > 0) {
  console.log("\n滴天髓 第1章示例:");
  console.log("标题:", dtianshuiChapters[0].title);
  console.log("内容前200字:", dtianshuiChapters[0].content.substring(0, 200));
}

if (qiongtongChapters.length > 0) {
  console.log("\n穷通宝鉴 第1节示例:");
  console.log("标题:", qiongtongChapters[0].title);
  console.log("内容前200字:", qiongtongChapters[0].content.substring(0, 200));
}

// 保存中间结果
fs.writeFileSync(
  path.join(TEMP_DIR, "enrichment_result.json"),
  JSON.stringify({ dtianshuiChapters, qiongtongChapters }, null, 2)
);
console.log("\n中间结果已保存到 enrichment_result.json");
