/**
 * 课程演示数据增强（幂等，可重复运行）
 * - 章节补 duration(按内容篇幅)/freeTrial(首章)/mediaUrl(音视频课演示媒体)
 * - 为「易经入门」样板课注入演示 进度/作业/评价，使 player/chapters/work-review/detail 真实丰满
 * 运行：npx tsx scripts/enrich-course-demo.ts  （演示数据，可随时清理）
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DEMO_MEDIA: Record<string, string> = {
  VIDEO: "https://media.w3.org/2010/05/sintel/trailer.mp4",
  AUDIO: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
};

async function main() {
  // 1. 章节元数据增强
  const chapters = await prisma.courseChapter.findMany({
    include: { course: { select: { type: true } } },
  });
  let chN = 0;
  for (const ch of chapters) {
    const duration = ch.duration && ch.duration > 0
      ? ch.duration
      : Math.round(Math.min(1800, Math.max(480, (ch.content?.length ?? 900) / 1.4)));
    const mediaUrl = ch.course.type === "TEXT"
      ? null
      : (ch.mediaUrl || DEMO_MEDIA[ch.course.type] || DEMO_MEDIA.VIDEO);
    await prisma.courseChapter.update({
      where: { id: ch.id },
      data: { duration, freeTrial: ch.sortOrder === 0, mediaUrl },
    });
    chN++;
  }
  console.log(`✅ 章节增强: ${chN} 章`);

  // 2. 样板课注入演示 进度/作业/评价
  const sample = await prisma.course.findFirst({
    where: { title: { contains: "易经入门" } },
    include: { chapters: { orderBy: { sortOrder: "asc" } } },
  });
  if (!sample || sample.chapters.length === 0) {
    console.log("⚠️ 未找到样板课，跳过进度/作业/评价注入");
    return;
  }

  // 取若干学员（非课程作者）
  const students = await prisma.user.findMany({
    where: { id: { not: sample.userId } },
    take: 4,
    select: { id: true, nickname: true },
  });
  if (students.length === 0) { console.log("⚠️ 无学员用户，跳过"); return; }

  // 2a. 进度：第一个学员完成前两章、第三章学习中
  const learner = students[0];
  const progressPlan = sample.chapters.map((ch, i) => ({
    chapterId: ch.id,
    progress: i === 0 ? 100 : i === 1 ? 100 : i === 2 ? 45 : 0,
    completed: i < 2,
  }));
  for (const p of progressPlan) {
    await prisma.courseProgress.upsert({
      where: { userId_chapterId: { userId: learner.id, chapterId: p.chapterId } },
      create: { userId: learner.id, courseId: sample.id, chapterId: p.chapterId, progress: p.progress, completed: p.completed },
      update: { progress: p.progress, completed: p.completed },
    });
  }
  console.log(`✅ 进度: 学员 ${learner.nickname} ${progressPlan.length} 条`);

  // 2b. 作业：3 份（2 待批改 + 1 已评分），关联首章
  const firstCh = sample.chapters[0];
  const worksSeed = [
    { stu: students[0], content: "通过本章学习，我理解了易经『变易、简易、不易』三义。变易讲万物皆变，简易讲规律可循，不易讲规律本身恒常。结合工作，市场在变(变易)，但供需规律不变(不易)，抓住简易之道便能以不变应万变。", score: null as number | null, feedback: null as string | null },
    { stu: students[1] ?? students[0], content: "八卦取象练习：乾为天、坤为地、震为雷、巽为风、坎为水、离为火、艮为山、兑为泽。我对照口诀『乾三连，坤六断』记忆卦形，已能默写八卦。疑问：先天与后天八卦方位为何不同？", score: null, feedback: null },
    { stu: students[2] ?? students[0], content: "六十四卦由八卦两两相重而成，下卦为内、上卦为外。我尝试解读乾卦六爻：潜龙勿用→见龙在田→终日乾乾→或跃在渊→飞龙在天→亢龙有悔，体会到事物盛极而衰的规律。", score: 92, feedback: "解读到位，对乾卦六爻的递进理解准确，尤其『盛极而衰』点出了易理精髓。建议再结合坤卦『厚德载物』对照学习。" },
  ];
  // 清理旧的演示作业避免重复堆积（仅本样板课）
  await prisma.courseWork.deleteMany({ where: { courseId: sample.id } });
  for (const w of worksSeed) {
    await prisma.courseWork.create({
      data: { courseId: sample.id, chapterId: firstCh.id, userId: w.stu.id, content: w.content, score: w.score ?? undefined, feedback: w.feedback ?? undefined },
    });
  }
  console.log(`✅ 作业: ${worksSeed.length} 份`);

  // 2c. 评价：3 条
  const reviewsSeed = [
    { stu: students[0], rating: 5, content: "老师讲得深入浅出，从三义到八卦再到六十四卦，循序渐进。零基础也能跟上，案例结合现代生活很受用。" },
    { stu: students[1] ?? students[0], rating: 5, content: "课程结构清晰，每章都有口诀和练习。占断方法部分实用，『善易者不占』的心法点醒了我。" },
    { stu: students[2] ?? students[0], rating: 4, content: "内容扎实，希望能再多些卦例精讲。整体非常推荐给易经入门的同学。" },
  ];
  await prisma.courseReview.deleteMany({ where: { courseId: sample.id } });
  for (const r of reviewsSeed) {
    await prisma.courseReview.create({
      data: { courseId: sample.id, userId: r.stu.id, rating: r.rating, content: r.content },
    });
  }
  console.log(`✅ 评价: ${reviewsSeed.length} 条`);
  console.log(`\n样板课: ${sample.title} (${sample.id})`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
