/**
 * 全站内容向量化 —— 手动批量任务（内容理解内核·NestJS standalone runner）
 *
 * 🔴 前置：需董事长先在后台『AI → 腾讯混元 Embedding』配好密钥（或复用腾讯云通用密钥）并「启用=true」。
 *          未开通时脚本自动 no-op（不产生任何调用费用）。
 *
 * 用法：
 *   npx ts-node --transpile-only scripts/vectorize-all-content.ts            # 增量对账（补缺 + 清理下架，控成本）
 *   npx ts-node --transpile-only scripts/vectorize-all-content.ts --rebuild  # 全量重建（清空重算所有审核通过内容）
 *   npx ts-node --transpile-only scripts/vectorize-all-content.ts --max 1000 # 增量对账，单轮最多新算 N 条
 *
 * 成本：分批(≤50/请求) + 限流(≤5 QPS) + 两级缓存 均由 HunyuanEmbeddingService 内部保证；
 *       只对「审核通过/已上架」且尚未入库的内容计费，重复运行不重复计费（幂等）。
 */
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../src/app.module";
import { ContentVectorizeService } from "../src/modules/recommend/services/content-vectorize.service";

async function main() {
  const args = process.argv.slice(2);
  const rebuild = args.includes("--rebuild");
  const maxIdx = args.indexOf("--max");
  const maxNew = maxIdx >= 0 ? parseInt(args[maxIdx + 1], 10) : 500;

  console.log("正在启动 NestJS 应用上下文...");
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ["log", "warn", "error"] });
  const svc = app.get(ContentVectorizeService);

  if (!svc.isEnabled) {
    console.log("⚠️ 腾讯混元 Embedding 未启用（后台未配密钥或 enabled≠true）。脚本空转退出，不产生费用。");
    await app.close();
    return;
  }

  if (rebuild) {
    console.log("模式：全量重建（清空重算）...");
    const r = await svc.rebuildAll();
    console.log(`✅ 全量重建完成：向量库共 ${r.total} 条。`);
  } else {
    console.log(`模式：增量对账（单轮最多新算 ${maxNew} 条）...`);
    const r = await svc.reconcile(maxNew);
    console.log(`✅ 对账完成：新增 ${r.added}，清理 ${r.removed}，库存 ${r.total} 条。`);
    if (r.added >= maxNew) console.log("ℹ️ 已达单轮上限，重复运行本命令可继续补齐剩余内容。");
  }

  await app.close();
}

main().catch((err) => {
  console.error("向量化任务失败:", err);
  process.exit(1);
});
