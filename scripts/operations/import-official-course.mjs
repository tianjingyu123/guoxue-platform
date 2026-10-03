#!/usr/bin/env node

/** 幂等导入经过官方内容包审核的免费文字课程。 */

import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";

const require = createRequire(import.meta.url);

const input = process.argv[2];
if (!input) throw new Error("用法：node import-official-course.mjs <course.json>");

const payload = JSON.parse(await readFile(path.resolve(input), "utf8"));
if (payload.type !== "TEXT" || Number(payload.price) !== 0) {
  throw new Error("首发官方入门课必须是免费 TEXT 课程");
}
if (payload.auditStatus !== "APPROVED" || payload.visibility !== "PLATFORM") {
  throw new Error("课程必须经过审核并设置为全平台可见");
}
if (!Array.isArray(payload.chapters) || payload.chapters.length < 3) {
  throw new Error("课程至少需要 3 个完整章节");
}
for (const [index, chapter] of payload.chapters.entries()) {
  if (!chapter.title?.trim() || !chapter.content?.trim()) {
    throw new Error(`第 ${index + 1} 章缺少标题或正文`);
  }
}

const prismaClientPath = require.resolve("@prisma/client", {
  paths: [
    process.cwd(),
    path.resolve(process.cwd(), "apps/server"),
    path.resolve(process.cwd(), "apps/server/dist"),
  ],
});
const { PrismaClient } = require(prismaClientPath);
const prisma = new PrismaClient();

try {
  const owner = await prisma.user.upsert({
    where: { email: "official-content@rebugx.cn" },
    update: {
      nickname: "热卜国学官方",
      bio: "热卜国学平台官方内容账号",
      status: "ACTIVE",
      deletedAt: null,
    },
    create: {
      email: "official-content@rebugx.cn",
      nickname: "热卜国学官方",
      bio: "热卜国学平台官方内容账号",
      status: "ACTIVE",
    },
    select: { id: true, nickname: true },
  });

  const existing = await prisma.course.findFirst({
    where: { title: payload.title, deletedAt: null },
    select: {
      id: true,
      _count: { select: { progresses: true, reviews: true } },
    },
  });
  if (existing && (existing._count.progresses > 0 || existing._count.reviews > 0)) {
    throw new Error("同名课程已有真实学习或评价数据，拒绝覆盖");
  }

  const result = await prisma.$transaction(async (tx) => {
    let courseId;
    if (existing) {
      await tx.courseChapter.deleteMany({ where: { courseId: existing.id } });
      const course = await tx.course.update({
        where: { id: existing.id },
        data: {
          userId: owner.id,
          intro: payload.intro,
          type: payload.type,
          price: payload.price,
          originalPrice: payload.originalPrice,
          tags: payload.tags,
          categoryLevel1: payload.categoryLevel1,
          categoryLevel2: payload.categoryLevel2,
          auditStatus: payload.auditStatus,
          visibility: payload.visibility,
          memberFree: payload.memberFree,
          validityDays: payload.validityDays,
          studentCount: 0,
          scheduledAt: null,
          scheduledOnAt: null,
          scheduledOffAt: null,
        },
      });
      courseId = course.id;
    } else {
      const course = await tx.course.create({
        data: {
          userId: owner.id,
          title: payload.title,
          intro: payload.intro,
          type: payload.type,
          price: payload.price,
          originalPrice: payload.originalPrice,
          tags: payload.tags,
          categoryLevel1: payload.categoryLevel1,
          categoryLevel2: payload.categoryLevel2,
          auditStatus: payload.auditStatus,
          visibility: payload.visibility,
          memberFree: payload.memberFree,
          validityDays: payload.validityDays,
          studentCount: 0,
        },
      });
      courseId = course.id;
    }

    await tx.courseChapter.createMany({
      data: payload.chapters.map((chapter) => ({
        courseId,
        title: chapter.title,
        content: chapter.content,
        mediaUrl: null,
        duration: chapter.duration,
        sortOrder: chapter.sortOrder,
        freeTrial: true,
      })),
    });

    return { courseId, owner: owner.nickname, chapters: payload.chapters.length };
  });

  console.log(JSON.stringify({ status: "PUBLISHED", ...result, title: payload.title }));
} finally {
  await prisma.$disconnect();
}
