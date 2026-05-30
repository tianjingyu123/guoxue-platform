/**
 * ctext 元数据应用脚本
 *
 * 将 ctext 学术元数据（朝代/版本/标签）写入数据库
 *
 * 用法:
 *   npx ts-node --transpile-only scripts/apply-ctext-metadata.ts
 */

import { NestFactory } from "@nestjs/core";
import * as fs from "fs";
import * as path from "path";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

interface EnrichedEntry {
  title: string;
  dynasty: string;
  category: string;
  ctext_urn: string;
  ctext_edition: string;
  ctext_tags: string[];
  dz_source: string;
}

async function main() {
  console.log("启动 NestJS...");
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  // 加载增强元数据
  const metaFile = path.resolve(process.cwd(), "../../temp_enriched_metadata.json");
  if (!fs.existsSync(metaFile)) {
    console.log("增强元数据文件不存在，请先运行 ctext-match-enrich.py");
    await app.close();
    return;
  }

  const enriched: EnrichedEntry[] = JSON.parse(fs.readFileSync(metaFile, "utf-8"));
  console.log(`共 ${enriched.length} 条增强元数据`);

  let updatedDynasty = 0;
  let updatedSource = 0;
  let notFound = 0;
  let skipped = 0;

  for (const entry of enriched) {
    // 按书名查找
    const book = await prisma.classicBook.findFirst({
      where: { title: entry.title },
    });

    if (!book) {
      notFound++;
      continue;
    }

    const updates: Record<string, string> = {};

    // 补充朝代（如果数据库中没有或ctext有更准确的值）
    if (entry.dynasty && (!book.dynasty || book.dynasty.length < 2)) {
      updates.dynasty = entry.dynasty;
      updatedDynasty++;
    }

    // 补充版本来源
    if (entry.ctext_edition && !book.source) {
      updates.source = entry.ctext_edition;
      updatedSource++;
    } else if (entry.dynasty && !book.source) {
      // 至少标记来源
      updates.source = `ctext.org ${entry.ctext_urn}`;
      updatedSource++;
    }

    if (Object.keys(updates).length > 0) {
      await prisma.classicBook.update({
        where: { id: book.id },
        data: updates,
      });
    } else {
      skipped++;
    }
  }

  console.log(`\n完成:`);
  console.log(`  更新朝代: ${updatedDynasty} 部`);
  console.log(`  更新来源: ${updatedSource} 部`);
  console.log(`  跳过（已有数据）: ${skipped} 部`);
  console.log(`  未找到: ${notFound} 部`);

  await app.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
