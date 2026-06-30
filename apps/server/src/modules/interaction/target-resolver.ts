import { PrismaService } from "../../prisma/prisma.service";

/**
 * 互动目标多态批量解析
 * ─────────────────────────────────────────────
 * 点赞/评论的目标是多态的（targetType + targetId 指向不同业务表）。
 * 本模块把一批 (targetType, targetId) 引用按类型分组，**每种类型仅一次
 * findMany(where id in [...])** 批量查询，组装出标题/封面/作者，绝不 N+1。
 *
 * 真实模型字段（已核对 schema.prisma）：
 *   - Article : title / cover        / user(nickname,avatar)
 *   - Course  : title / cover        / user(nickname,avatar)
 *   - Video   : title? / coverUrl    / user(nickname,avatar)
 *   - Product : title / images[]     （无 user 关系 → 无作者）
 *   - Post    : title? / content / images[] / user(nickname,avatar)
 *   - Comment : content              / user(nickname,avatar)
 */

export interface TargetRef {
  targetType: string;
  targetId: string;
}

export interface TargetDetail {
  id: string;
  /** 前端小写类型：article/course/video/product/circle_post/comment */
  type: string;
  title: string;
  cover?: string;
  author?: { nickname: string; avatar: string };
}

/** 规范化 targetType → 解析桶（POST 与 CIRCLE_POST 都归 POST 表） */
function bucket(targetType: string): string {
  const t = String(targetType || "").toUpperCase();
  return t === "CIRCLE_POST" ? "POST" : t;
}

/** 生成结果 Map 的键，与 resolveTargets 内写入保持一致 */
export function targetKey(targetType: string, targetId: string): string {
  return `${bucket(targetType)}:${targetId}`;
}

/** 富文本去标签 + 截断，用于把帖子/评论正文当标题展示 */
function excerpt(s: string | null | undefined, n = 30): string {
  const txt = String(s || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return txt.length > n ? `${txt.slice(0, n)}…` : txt;
}

function toAuthor(
  user?: { nickname: string; avatar: string | null } | null,
): { nickname: string; avatar: string } | undefined {
  if (!user) return undefined;
  return { nickname: user.nickname, avatar: user.avatar ?? "" };
}

/**
 * 批量解析多态目标详情。
 * @returns Map<`${BUCKET}:${id}`, TargetDetail>；目标不存在（已删）则无对应键，调用方降级。
 */
export async function resolveTargets(
  prisma: PrismaService,
  refs: TargetRef[],
): Promise<Map<string, TargetDetail>> {
  const result = new Map<string, TargetDetail>();
  if (!refs.length) return result;

  // 按桶分组去重 ID
  const ids: Record<string, Set<string>> = {
    ARTICLE: new Set(),
    COURSE: new Set(),
    VIDEO: new Set(),
    PRODUCT: new Set(),
    POST: new Set(),
    COMMENT: new Set(),
  };
  for (const r of refs) {
    const b = bucket(r.targetType);
    if (ids[b]) ids[b].add(r.targetId);
  }

  const tasks: Promise<void>[] = [];

  const articleIds = [...ids.ARTICLE];
  if (articleIds.length) {
    tasks.push(
      prisma.article
        .findMany({
          where: { id: { in: articleIds } },
          select: { id: true, title: true, cover: true, user: { select: { nickname: true, avatar: true } } },
        })
        .then((rows) => {
          for (const a of rows) {
            result.set(`ARTICLE:${a.id}`, { id: a.id, type: "article", title: a.title, cover: a.cover ?? undefined, author: toAuthor(a.user) });
          }
        }),
    );
  }

  const courseIds = [...ids.COURSE];
  if (courseIds.length) {
    tasks.push(
      prisma.course
        .findMany({
          where: { id: { in: courseIds } },
          select: { id: true, title: true, cover: true, user: { select: { nickname: true, avatar: true } } },
        })
        .then((rows) => {
          for (const c of rows) {
            result.set(`COURSE:${c.id}`, { id: c.id, type: "course", title: c.title, cover: c.cover ?? undefined, author: toAuthor(c.user) });
          }
        }),
    );
  }

  const videoIds = [...ids.VIDEO];
  if (videoIds.length) {
    tasks.push(
      prisma.video
        .findMany({
          where: { id: { in: videoIds } },
          select: { id: true, title: true, coverUrl: true, user: { select: { nickname: true, avatar: true } } },
        })
        .then((rows) => {
          for (const v of rows) {
            result.set(`VIDEO:${v.id}`, { id: v.id, type: "video", title: v.title || "视频", cover: v.coverUrl ?? undefined, author: toAuthor(v.user) });
          }
        }),
    );
  }

  const productIds = [...ids.PRODUCT];
  if (productIds.length) {
    tasks.push(
      prisma.product
        .findMany({
          where: { id: { in: productIds } },
          select: { id: true, title: true, images: true },
        })
        .then((rows) => {
          for (const p of rows) {
            result.set(`PRODUCT:${p.id}`, { id: p.id, type: "product", title: p.title, cover: p.images?.[0] ?? undefined });
          }
        }),
    );
  }

  const postIds = [...ids.POST];
  if (postIds.length) {
    tasks.push(
      prisma.post
        .findMany({
          where: { id: { in: postIds } },
          select: { id: true, title: true, content: true, images: true, user: { select: { nickname: true, avatar: true } } },
        })
        .then((rows) => {
          for (const p of rows) {
            result.set(`POST:${p.id}`, { id: p.id, type: "circle_post", title: p.title || excerpt(p.content), cover: p.images?.[0] ?? undefined, author: toAuthor(p.user) });
          }
        }),
    );
  }

  const commentIds = [...ids.COMMENT];
  if (commentIds.length) {
    tasks.push(
      prisma.comment
        .findMany({
          where: { id: { in: commentIds } },
          select: { id: true, content: true, user: { select: { nickname: true, avatar: true } } },
        })
        .then((rows) => {
          for (const c of rows) {
            result.set(`COMMENT:${c.id}`, { id: c.id, type: "comment", title: excerpt(c.content), author: toAuthor(c.user) });
          }
        }),
    );
  }

  await Promise.all(tasks);
  return result;
}
