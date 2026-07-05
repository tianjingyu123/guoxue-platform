import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";

/**
 * 课程-相关推荐域（从 course.service 拆出·纯搬家不改逻辑）。
 * 职责：按标签+品类匹配的相关课程推荐、AI 语义重排序。
 */
@Injectable()
export class CourseRecommendService {
  private readonly logger = new Logger(CourseRecommendService.name);

  constructor(
    private prisma: PrismaService,
    private aiGateway: AiGatewayService,
  ) {}

  /** 获取相关课程（按标签+品类匹配） */
  async getRelatedCourses(courseId: string, limit = 6, useAi = false) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true, intro: true, tags: true, categoryLevel1: true, categoryLevel2: true },
    });
    if (!course) throw new BusinessException(ErrorCode.COURSE_NOT_FOUND, "课程不存在");

    const where: Prisma.CourseWhereInput = {
      id: { not: courseId },
      auditStatus: "APPROVED",
    };
    if (course.tags.length > 0) where.tags = { hasSome: course.tags };
    else if (course.categoryLevel1) where.categoryLevel1 = course.categoryLevel1;

    const fetchCount = useAi ? Math.min(limit * 3, 20) : limit;
    let related = await this.prisma.course.findMany({
      where,
      select: { id: true, title: true, cover: true, type: true, price: true, studentCount: true },
      take: fetchCount,
      orderBy: { studentCount: "desc" },
    });

    // 不足时用同类热门补充
    if (related.length < limit && course.categoryLevel1) {
      const existingIds = [courseId, ...related.map(r => r.id)];
      const fallback = await this.prisma.course.findMany({
        where: { id: { notIn: existingIds }, auditStatus: "APPROVED", categoryLevel1: course.categoryLevel1 },
        select: { id: true, title: true, cover: true, type: true, price: true, studentCount: true },
        take: limit - related.length,
        orderBy: { studentCount: "desc" },
      });
      related = [...related, ...fallback];
    }

    // AI 语义重排序
    if (useAi && related.length > limit) {
      try {
        related = await this.aiReRank(course as any, related as any, limit) as any;
      } catch (err: any) {
        this.logger.warn(`AI 推荐重排序失败，回退默认排序: ${err.message}`);
        related = related.slice(0, limit);
      }
    }

    return related;
  }

  /** AI 语义重排序：从候选课程中选出最相关的 topN */
  private async aiReRank(
    source: { id: string; title: string; intro?: string | null; tags?: string[]; categoryLevel1?: string | null; categoryLevel2?: string | null },
    candidates: { id: string; title: string; cover?: string | null; type: string; price: any; studentCount: number }[],
    topN: number,
  ) {
    const candidateList = candidates.map((c, i) => `${i + 1}. ${c.title}（${c.type || '课程'}）`).join("\n");
    const prompt = `你是国学学习推荐专家。当前学员在学习课程「${source.title}」${source.intro ? `，简介：「${source.intro.slice(0, 200)}」` : ''}。

请从以下候选课程中选出最相关的 ${topN} 门推荐。考虑因素：
- 知识体系的关联性
- 学习路径的递进关系
- 学员兴趣延展

候选课程列表：
${candidateList}

请只返回所选课程的序号（数字），用逗号分隔，例如：1,3,5,2,8。`;

    const result = await this.aiGateway.chat({
      scene: "course-recommend",
      messages: [
        { role: "system", content: "你是课程推荐专家。只返回数字序号，不返回其他内容。" },
        { role: "user", content: prompt },
      ],
      options: { temperature: 0.3, maxTokens: 100 },
    });

    // 解析 AI 返回的序号
    const indices = (result.content.match(/\d+/g) || []).map(Number).filter(n => n >= 1 && n <= candidates.length);
    const seen = new Set<number>();
    const reRanked = indices
      .filter(n => !seen.has(n) && seen.add(n))
      .map(n => candidates[n - 1])
      .filter(Boolean)
      .slice(0, topN);

    // 如果 AI 返回不足，用原始排序填充
    if (reRanked.length < topN) {
      for (const c of candidates) {
        if (reRanked.length >= topN) break;
        if (!reRanked.find(r => r.id === c.id)) reRanked.push(c);
      }
    }

    return reRanked;
  }
}
