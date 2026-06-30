/**
 * 古籍伴读智能体后端自检：取真实章节 → 测引导问题端点（公开）+ chat 鉴权。
 * 运行：npx tsx scripts/probe-companion.ts（前台·dangerouslyDisableSandbox·连 5433+3000）
 */
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const BASE = "http://localhost:3000/api/v1";

async function main() {
  // 取一个有正文、且属于热门书的章节
  const ch = await p.classicChapter.findFirst({
    where: { content: { not: "" } },
    select: { id: true, title: true, book: { select: { title: true, viewCount: true } } },
    orderBy: { book: { viewCount: "desc" } },
  });
  if (!ch) {
    console.log("未找到章节");
    return;
  }
  console.log("样本章节:", ch.id, "|", ch.book?.title, "·", ch.title);

  // 1) 引导问题（公开端点·验证章节加载 + 模板）
  const r1 = await fetch(`${BASE}/classic/companion/prompts?chapterId=${ch.id}`);
  console.log("\n[prompts] HTTP", r1.status);
  console.log((await r1.text()).slice(0, 500));

  // 2) 伴读对话（需登录·无 token 应 401，验证 guard 生效与路由注册）
  const r2 = await fetch(`${BASE}/classic/companion/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chapterId: ch.id, question: "总结本章主要内容" }),
  });
  console.log("\n[chat 无token] HTTP", r2.status, "(期望 401 = 鉴权生效)");
  console.log((await r2.text()).slice(0, 200));
}

main()
  .catch((e) => {
    console.error("自检失败:", e.message);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
