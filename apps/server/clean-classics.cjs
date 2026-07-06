// 古籍章节正文清洗：去除 Kanripo/mandoku 数字化残留（org-mode 元数据头 / <pb:> 页码标记 /
// HTML 标签 / 最后修改时间戳 / 导航面包屑），保留纯正文。
// 用法：node clean-classics.cjs          # DRY-RUN（打印前3章对比+统计，不写库）
//       node clean-classics.cjs apply    # 实际写库
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function clean(content) {
  let c = content || "";
  c = c.replace(/^#.*$/gm, "");                                      // 所有 # 开头行(Kanripo元数据:mode头/#+PROPERTY/# src:来源引证/# dating:断代/译音注音)
  c = c.replace(/^(mode|title|property|src|dating|author|editor|date)\s*:.*$/gim, ""); // 漏网的无#前缀元数据行
  c = c.replace(/^.*\b(github|daizhige|ctext|kanripo|chinese text project|mandoku)\b.*$/gim, ""); // 来源/工具署名行
  c = c.replace(/Xi Shi Du Liu Studio[\s\S]*?欢迎\s*提交/g, "");     // 殆知阁开源署名块
  c = c.replace(/^.*(殆知阁|友情维护|外部数据库|开源项目).*$/gm, ""); // 数据来源署名/引用标题行
  c = c.replace(/\bctp:\S+|\bCBETA:\s*\S+/g, "");                    // ctext/CBETA 外部数据库引用
  c = c.replace(/\[[^\]]*\b(above|below|left|right)\b[^\]]*\]/g, ""); // 校勘位置标记 [齊above合]
  c = c.replace(/<pb:[^>]*>/g, "");                                   // Kanripo 页码标记
  c = c.replace(/<[^>]+>/g, "");                                      // 其余 HTML/XML 标签
  c = c.replace(/¶/g, "");                                            // Kanripo 段落符（行尾标记·特殊符号）
  c = c.replace(/^\*+[ \t　]+/gm, "");                                // org-mode 标题星号（** 1 紀 → 1 紀）
  c = c.replace(/最后修改：[\s\S]*?\(Coordinated Universal Time\)/g, ""); // 爬取残留修改时间块
  c = c.replace(/^.*\bGMT[+-]\d{4}\b.*$/gm, "");                      // 残留 GMT 时间行
  c = c.replace(/^[ \t　]*目录[ \t　]*$/gm, "");                       // 单独"目录"行
  c = c.replace(/^[ \t　]*>[ \t　]*$/gm, "");                          // 面包屑分隔的孤立 ">" 行
  c = c.replace(/^[ \t　]+$/gm, "");                                  // 纯空白行归零
  c = c.replace(/\n{3,}/g, "\n\n");                                   // 压缩连续空行
  return c.trim();
}

(async () => {
  const apply = process.argv[2] === "apply";
  const rows = await prisma.classicChapter.findMany({ select: { id: true, content: true } });
  let changed = 0, shown = 0, emptied = 0;
  for (const r of rows) {
    const cleaned = clean(r.content);
    if (cleaned !== (r.content || "")) {
      changed++;
      if (cleaned.length === 0) emptied++;
      if (!apply && shown < 3) {
        shown++;
        console.log(`\n===== BEFORE [${r.id}] (${(r.content||"").length}字) =====`);
        console.log((r.content || "").slice(0, 260));
        console.log(`----- AFTER (${cleaned.length}字) -----`);
        console.log(cleaned.slice(0, 260));
      }
      // 清洗后为空的（纯元数据/目录页）跳过，避免清空正文
      if (apply && cleaned.length > 0) await prisma.classicChapter.update({ where: { id: r.id }, data: { content: cleaned } });
    }
  }
  console.log(`\n${apply ? "✅已清洗" : "DRY-RUN 将清洗"} ${changed}/${rows.length} 章` +
    (emptied ? ` ⚠️其中${emptied}章清洗后为空(需人工核查勿apply)` : "（无清空）"));
  await prisma.$disconnect();
})();
