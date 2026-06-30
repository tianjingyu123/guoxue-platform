/**
 * 阶段二只读自检：确认诗词数据就绪 + 通用 Like/Collect/Comment 表可按 targetType=POEM 查询。
 * 运行：npx tsx scripts/verify-poetry-stage2.ts （前台·dangerouslyDisableSandbox 直连 5433）
 */
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  const pub = await p.poetry.count({ where: { status: "PUBLISHED" } });
  const top = await p.poetry.findFirst({ where: { status: "PUBLISHED" }, orderBy: { likes: "desc" } });
  const today = await p.poetry.findFirst({ where: { status: "PUBLISHED", isToday: true } });
  const authors = await p.poetry.groupBy({
    by: ["author"],
    where: { status: "PUBLISHED" },
    _count: { _all: true },
  });
  // 取作品最多的作者，验证 getPoet 聚合可用
  const byCount = [...authors].sort((a, b) => b._count._all - a._count._all);
  const topAuthor = byCount[0];

  // 通用多态互动表按 POEM 维度可查询（结构存在 = 端点底层链路通）
  const poemLikes = await p.like.count({ where: { targetType: "POEM" } });
  const poemCollects = await p.collect.count({ where: { targetType: "POEM" } });
  const poemComments = await p.comment.count({ where: { targetType: "POEM" } });
  const commentLikes = await p.like.count({ where: { targetType: "POEM_COMMENT" } });

  console.log(
    JSON.stringify(
      {
        发布诗词数: pub,
        热门首篇: top ? `${top.title}·${top.author}（${top.likes}赞）` : null,
        每日一首: today ? `${today.title}·${today.author}` : "(未设置isToday，将退化为最高赞)",
        诗人聚合数: authors.length,
        作品最多诗人: topAuthor ? `${topAuthor.author}（${topAuthor._count._all}首）` : null,
        "POEM点赞数": poemLikes,
        "POEM收藏数": poemCollects,
        "POEM品评数": poemComments,
        "品评点赞数": commentLikes,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error("自检失败:", e.message);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
