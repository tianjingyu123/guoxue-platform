import { Injectable } from "@nestjs/common";

/**
 * 推荐-Prisma select 辅助域（从 recommend.service 拆出·纯搬家不改逻辑）。
 * 职责：集中提供各内容类型的 Prisma select 片段（article/course/product/circle/video）。
 * 叶子域·被 SceneService/InsertService/facade 三方共享，独立成叶子供注入。
 */
@Injectable()
export class RecommendSelectService {
  articleSelect() {
    return {
      id: true, title: true, cover: true, excerpt: true, tags: true,
      viewCount: true, likeCount: true, collectCount: true, createdAt: true,
      user: { select: { id: true, nickname: true, avatar: true } },
    } as const;
  }

  courseSelect() {
    return {
      id: true, title: true, cover: true, intro: true, tags: true,
      price: true, studentCount: true,
      user: { select: { id: true, nickname: true, avatar: true } },
    } as const;
  }

  productSelect() {
    return {
      id: true, title: true, images: true, intro: true, tags: true,
      price: true, salesCount: true,
    } as const;
  }

  circleSelect() {
    return {
      id: true, name: true, cover: true, intro: true, tags: true,
      memberCount: true,
    } as const;
  }

  videoSelect() {
    return {
      id: true, title: true, coverUrl: true, tags: true,
      viewCount: true, likeCount: true,
      user: { select: { id: true, nickname: true, avatar: true } },
    } as const;
  }
}
