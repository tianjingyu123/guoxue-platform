/**
 * AI 内容公开覆盖率只读盘点。
 * 仅执行 count，不读取正文、用户信息，也不写库或调用 Embedding。
 * 须先核对目标数据库身份和只读账号，再执行：
 *   pnpm --filter @guoxue/server exec tsx scripts/audit-ai-content-coverage.ts --read-only
 */
import { Prisma, PrismaClient } from "@prisma/client";
import { PUBLIC_CLASSIC_BOOK_WHERE } from "../src/modules/classic/classic-publication-policy";

type Row = {
  type: string;
  total: number;
  publicEligible: number | null;
  missingTitle: number | null;
  missingSummary: number | null;
  missingCover: number | null;
  missingTags: number | null;
  note?: string;
};

export async function collectCoverage(prisma: PrismaClient): Promise<Row[]> {
  const article: Prisma.ArticleWhereInput = { auditStatus: "APPROVED", visibility: "PLATFORM", deletedAt: null };
  const course: Prisma.CourseWhereInput = { auditStatus: "APPROVED", visibility: "PLATFORM", deletedAt: null };
  const video: Prisma.VideoWhereInput = { status: "PUBLISHED", auditStatus: "APPROVED", visibility: "PLATFORM", isPrivate: false };
  const product: Prisma.ProductWhereInput = { status: "ON_SALE", deletedAt: null };
  const circle: Prisma.CircleWhereInput = { status: "ACTIVE", deletedAt: null };
  const content: Prisma.ContentWhereInput = { status: "PUBLISHED", deletedAt: null };
  const classic = PUBLIC_CLASSIC_BOOK_WHERE;

  const [
    articleTotal, articlePublic, articleTitle, articleSummary, articleCover, articleTags,
    courseTotal, coursePublic, courseTitle, courseSummary, courseCover, courseTags,
    videoTotal, videoPublic, videoTitle, videoSummary, videoCover, videoTags,
    productTotal, productPublic, productTitle, productSummary, productCover, productTags,
    circleTotal, circlePublic, circleTitle, circleSummary, circleCover, circleTags,
    contentTotal, contentPublic, contentTitle, contentSummary, contentCover, contentTags,
    classicTotal, classicPublic, classicTitle, classicSummary, classicCover,
    postTotal, liveTotal,
  ] = await Promise.all([
    prisma.article.count(), prisma.article.count({ where: article }),
    prisma.article.count({ where: { AND: [article, { title: "" }] } }),
    prisma.article.count({ where: { AND: [article, { OR: [{ excerpt: null }, { excerpt: "" }] }] } }),
    prisma.article.count({ where: { AND: [article, { OR: [{ cover: null }, { cover: "" }] }] } }),
    prisma.article.count({ where: { AND: [article, { tags: { isEmpty: true } }] } }),
    prisma.course.count(), prisma.course.count({ where: course }),
    prisma.course.count({ where: { AND: [course, { title: "" }] } }),
    prisma.course.count({ where: { AND: [course, { OR: [{ intro: null }, { intro: "" }] }] } }),
    prisma.course.count({ where: { AND: [course, { OR: [{ cover: null }, { cover: "" }] }] } }),
    prisma.course.count({ where: { AND: [course, { tags: { isEmpty: true } }] } }),
    prisma.video.count(), prisma.video.count({ where: video }),
    prisma.video.count({ where: { AND: [video, { OR: [{ title: null }, { title: "" }] }] } }),
    prisma.video.count({ where: { AND: [video, { OR: [{ description: null }, { description: "" }] }] } }),
    prisma.video.count({ where: { AND: [video, { OR: [{ coverUrl: null }, { coverUrl: "" }] }] } }),
    prisma.video.count({ where: { AND: [video, { tags: { isEmpty: true } }] } }),
    prisma.product.count(), prisma.product.count({ where: product }),
    prisma.product.count({ where: { AND: [product, { title: "" }] } }),
    prisma.product.count({ where: { AND: [product, { OR: [{ intro: null }, { intro: "" }] }] } }),
    prisma.product.count({ where: { AND: [product, { images: { isEmpty: true } }] } }),
    prisma.product.count({ where: { AND: [product, { tags: { isEmpty: true } }] } }),
    prisma.circle.count(), prisma.circle.count({ where: circle }),
    prisma.circle.count({ where: { AND: [circle, { name: "" }] } }),
    prisma.circle.count({ where: { AND: [circle, { intro: "" }] } }),
    prisma.circle.count({ where: { AND: [circle, { OR: [{ cover: null }, { cover: "" }] }] } }),
    prisma.circle.count({ where: { AND: [circle, { tags: { isEmpty: true } }] } }),
    prisma.content.count(), prisma.content.count({ where: content }),
    prisma.content.count({ where: { AND: [content, { title: "" }] } }),
    prisma.content.count({ where: { AND: [content, { OR: [{ excerpt: null }, { excerpt: "" }] }] } }),
    prisma.content.count({ where: { AND: [content, { OR: [{ cover: null }, { cover: "" }] }] } }),
    prisma.content.count({ where: { AND: [content, { tags: { isEmpty: true } }] } }),
    prisma.classicBook.count(), prisma.classicBook.count({ where: classic }),
    prisma.classicBook.count({ where: { AND: [classic, { title: "" }] } }),
    prisma.classicBook.count({ where: { AND: [classic, { OR: [{ intro: null }, { intro: "" }] }] } }),
    prisma.classicBook.count({ where: { AND: [classic, { OR: [{ cover: null }, { cover: "" }] }] } }),
    prisma.post.count(), prisma.liveRoom.count(),
  ]);

  return [
    { type: "ARTICLE", total: articleTotal, publicEligible: articlePublic, missingTitle: articleTitle, missingSummary: articleSummary, missingCover: articleCover, missingTags: articleTags },
    { type: "COURSE", total: courseTotal, publicEligible: coursePublic, missingTitle: courseTitle, missingSummary: courseSummary, missingCover: courseCover, missingTags: courseTags },
    { type: "VIDEO", total: videoTotal, publicEligible: videoPublic, missingTitle: videoTitle, missingSummary: videoSummary, missingCover: videoCover, missingTags: videoTags },
    { type: "PRODUCT", total: productTotal, publicEligible: productPublic, missingTitle: productTitle, missingSummary: productSummary, missingCover: productCover, missingTags: productTags },
    { type: "CIRCLE", total: circleTotal, publicEligible: circlePublic, missingTitle: circleTitle, missingSummary: circleSummary, missingCover: circleCover, missingTags: circleTags },
    { type: "CONTENT", total: contentTotal, publicEligible: contentPublic, missingTitle: contentTitle, missingSummary: contentSummary, missingCover: contentCover, missingTags: contentTags },
    { type: "CLASSIC", total: classicTotal, publicEligible: classicPublic, missingTitle: classicTitle, missingSummary: classicSummary, missingCover: classicCover, missingTags: null },
    { type: "POST", total: postTotal, publicEligible: null, missingTitle: null, missingSummary: null, missingCover: null, missingTags: null, note: "尚无全局公开权限字段；只统计总量，不推断可推荐数量" },
    { type: "LIVE", total: liveTotal, publicEligible: null, missingTitle: null, missingSummary: null, missingCover: null, missingTags: null, note: "直播/回放权限和时效需分别定义；只统计总量" },
  ];
}

async function main() {
  if (!process.argv.includes("--read-only") || !process.env.DATABASE_URL) {
    throw new Error("需先核对目标数据库身份和只读账号，再传 --read-only 运行");
  }
  const prisma = new PrismaClient();
  try {
    const rows = await collectCoverage(prisma);
    process.stdout.write(JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 2) + "\n");
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error: Error) => {
    process.stderr.write(`只读盘点失败：${error.message}\n`);
    process.exitCode = 1;
  });
}
