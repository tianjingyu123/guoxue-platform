/**
 * 殆知阁古籍批量导入 - NestJS standalone runner
 *
 * 用法:
 *   npx ts-node --transpile-only scripts/import-daizhige-seeds.ts --all          # 按分类逐个导入全部
 *   npx ts-node --transpile-only scripts/import-daizhige-seeds.ts --stats        # 查看统计
 *   npx ts-node --transpile-only scripts/import-daizhige-seeds.ts --file temp_daizhige_seeds_史_000.json
 */

import { NestFactory } from "@nestjs/core";
import * as fs from "fs";
import * as path from "path";
import { AppModule } from "../src/app.module";
import { ClassicDaizhigeSeeder } from "../src/modules/classic/classic-daizhige-seeder.service";

async function importFile(seeder: ClassicDaizhigeSeeder, seedFile: string) {
  console.log(`\n--- 导入: ${seedFile} ---`);
  const result = await seeder.importFromJson({ seedFile, maxBooks: Infinity });
  console.log(`  新建 ${result.created}, 跳过 ${result.skipped}, 失败 ${result.errors}`);
  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const statsOnly = args.includes("--stats");
  const allFlag = args.includes("--all");
  const fileIdx = args.indexOf("--file");
  const seedFile = fileIdx >= 0 ? args[fileIdx + 1] : undefined;

  console.log("正在启动 NestJS 应用...");
  const app = await NestFactory.createApplicationContext(AppModule);
  const seeder = app.get(ClassicDaizhigeSeeder);

  const indexFile = path.resolve(process.cwd(), "../../temp_daizhige_seeds_index.json");

  if (statsOnly) {
    if (fs.existsSync(indexFile)) {
      const idx = JSON.parse(fs.readFileSync(indexFile, "utf-8"));
      console.log("\n分类种子统计:");
      let total = 0;
      for (const [cat, files] of Object.entries(idx) as [string, string[]][]) {
        const catTotal = files.length; // rough estimate
        console.log(`  ${cat}: ${files.length} 个文件`);
        total += files.length;
      }
      console.log(`  总计: ${total} 个分块文件`);
    } else {
      console.log("未找到分类索引文件");
    }
  } else if (allFlag) {
    if (!fs.existsSync(indexFile)) {
      console.log("未找到分类索引文件，尝试旧格式...");
      await importFile(seeder, "temp_daizhige_all_seeds.json");
    } else {
      const idx: Record<string, string[]> = JSON.parse(fs.readFileSync(indexFile, "utf-8"));
      let totalCreated = 0, totalSkipped = 0, totalErrors = 0;

      for (const [cat, files] of Object.entries(idx)) {
        console.log(`\n===== 分类: ${cat} (${files.length} 个文件) =====`);
        for (const fname of files) {
          const result = await importFile(seeder, fname);
          totalCreated += result.created;
          totalSkipped += result.skipped;
          totalErrors += result.errors;
        }
      }

      console.log(`\n===== 全部完成 =====`);
      console.log(`总计: 新建 ${totalCreated}, 跳过 ${totalSkipped}, 失败 ${totalErrors}`);
    }
  } else if (seedFile) {
    await importFile(seeder, seedFile);
  } else {
    console.log("请使用 --all 导入全部，或 --file <文件名> 导入指定文件");
  }

  await app.close();
  console.log("完成。");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
