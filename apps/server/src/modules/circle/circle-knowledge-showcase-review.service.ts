import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { CircleKnowledgeService } from "./circle-knowledge.service";

type IdRow = { id: string };
type ReviewPages = { sourcePage?: unknown; nodePage?: unknown; edgePage?: unknown };
const REVIEW_PAGE_SIZE = 50;

/** 圈外展示与圈内知识分离：圈管理者提草稿，平台运营确认公开权利后才能发布。 */
@Injectable()
export class CircleKnowledgeShowcaseReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly knowledge: CircleKnowledgeService,
  ) {}

  private shortText(value: unknown, field: string, max: number): string {
    if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
      throw new BadRequestException(`${field}须为 1—${max} 字`);
    }
    return value.trim();
  }

  private reviewPage(value: unknown): number {
    if (value === undefined) return 1;
    const page = Number(value);
    if (!Number.isSafeInteger(page) || page < 1 || page > 10000) {
      throw new BadRequestException("审核页码须为 1—10000 的整数");
    }
    return page;
  }

  async createNodeDraft(circleId: string, userId: string, body: { sourceKnowledgeId?: string; name?: string; summary?: string }) {
    await this.knowledge.assertManager(circleId, userId);
    return this.createNodeDraftAsAdmin(circleId, userId, body);
  }

  async createNodeDraftAsAdmin(circleId: string, userId: string, body: { sourceKnowledgeId?: string; name?: string; summary?: string }) {
    const sourceKnowledgeId = this.shortText(body.sourceKnowledgeId, "来源知识 ID", 100);
    const name = this.shortText(body.name, "知识点名称", 80);
    const summary = this.shortText(body.summary, "公开短摘要", 160);
    const id = randomUUID();
    const rows = await this.prisma.$queryRaw<IdRow[]>`
      INSERT INTO "CircleKnowledgeShowcaseNode" ("id", "circleId", "sourceKnowledgeId", "sourceContentHash", "name", "summary", "createdBy", "updatedAt")
      SELECT ${id}, ${circleId}, k."id", k."contentHash", ${name}, ${summary}, ${userId}, CURRENT_TIMESTAMP
      FROM "CircleKnowledge" k JOIN "Circle" c ON c."id" = k."circleId"
      WHERE k."id" = ${sourceKnowledgeId} AND k."circleId" = ${circleId}
        AND k."status" = 'active' AND c."status" = 'ACTIVE' AND c."deletedAt" IS NULL
      RETURNING "id"
    `;
    if (!rows.length) throw new NotFoundException("来源知识不存在或已失效");
    return { id, status: "DRAFT" };
  }

  async createEdgeDraft(circleId: string, userId: string, body: { fromId?: string; toId?: string; relation?: string }) {
    await this.knowledge.assertManager(circleId, userId);
    return this.createEdgeDraftAsAdmin(circleId, userId, body);
  }

  async createEdgeDraftAsAdmin(circleId: string, userId: string, body: { fromId?: string; toId?: string; relation?: string }) {
    const fromId = this.shortText(body.fromId, "起点 ID", 100);
    const toId = this.shortText(body.toId, "终点 ID", 100);
    if (fromId === toId) throw new BadRequestException("关系两端不能相同");
    const relation = this.shortText(body.relation, "关系说明", 80);
    const id = randomUUID();
    const rows = await this.prisma.$queryRaw<IdRow[]>`
      INSERT INTO "CircleKnowledgeShowcaseEdge" ("id", "circleId", "fromId", "toId", "relation", "createdBy", "updatedAt")
      SELECT ${id}, ${circleId}, a."id", b."id", ${relation}, ${userId}, CURRENT_TIMESTAMP
      FROM "CircleKnowledgeShowcaseNode" a
      JOIN "CircleKnowledgeShowcaseNode" b ON b."id" = ${toId} AND b."circleId" = a."circleId"
      WHERE a."id" = ${fromId} AND a."circleId" = ${circleId}
        AND a."status" <> 'REVOKED' AND b."status" <> 'REVOKED'
      RETURNING "id"
    `;
    if (!rows.length) throw new NotFoundException("关系节点不存在、跨圈或已撤回");
    return { id, status: "DRAFT" };
  }

  /** 平台审核列表只返回快照元数据和必要来源片段，不供圈外访问。 */
  async listForReview(circleId: string, pages: ReviewPages = {}) {
    const sourcePage = this.reviewPage(pages.sourcePage);
    const nodePage = this.reviewPage(pages.nodePage);
    const edgePage = this.reviewPage(pages.edgePage);
    const sourceOffset = (sourcePage - 1) * REVIEW_PAGE_SIZE;
    const nodeOffset = (nodePage - 1) * REVIEW_PAGE_SIZE;
    const edgeOffset = (edgePage - 1) * REVIEW_PAGE_SIZE;
    const sources = await this.prisma.$queryRaw<unknown[]>`
      SELECT "id", "sourceType", left("content", 120) AS "excerpt"
      FROM "CircleKnowledge"
      WHERE "circleId" = ${circleId} AND "status" = 'active'
      ORDER BY "addedAt" DESC, "id" DESC LIMIT ${REVIEW_PAGE_SIZE + 1} OFFSET ${sourceOffset}
    `;
    const nodes = await this.prisma.$queryRaw<unknown[]>`
      SELECT n."id", n."sourceKnowledgeId", n."name", n."summary", n."status", n."rightsNote", n."createdBy", n."reviewedBy",
        (k."contentHash" = n."sourceContentHash") AS "sourceUnchanged",
        left(k."content", 400) AS "sourceExcerpt"
      FROM "CircleKnowledgeShowcaseNode" n
      JOIN "CircleKnowledge" k ON k."id" = n."sourceKnowledgeId" AND k."circleId" = n."circleId"
      WHERE n."circleId" = ${circleId} AND n."status" IN ('DRAFT', 'PUBLISHED')
      ORDER BY n."createdAt" DESC, n."id" DESC LIMIT ${REVIEW_PAGE_SIZE + 1} OFFSET ${nodeOffset}
    `;
    const edges = await this.prisma.$queryRaw<unknown[]>`
      SELECT e."id", e."fromId", e."toId", a."name" AS "fromName", b."name" AS "toName",
        e."relation", e."status", e."evidenceNote", e."createdBy", e."reviewedBy"
      FROM "CircleKnowledgeShowcaseEdge" e
      JOIN "CircleKnowledgeShowcaseNode" a ON a."id" = e."fromId" AND a."circleId" = e."circleId"
      JOIN "CircleKnowledgeShowcaseNode" b ON b."id" = e."toId" AND b."circleId" = e."circleId"
      WHERE e."circleId" = ${circleId} AND e."status" IN ('DRAFT', 'PUBLISHED')
      ORDER BY e."createdAt" DESC, e."id" DESC LIMIT ${REVIEW_PAGE_SIZE + 1} OFFSET ${edgeOffset}
    `;
    return {
      sources: sources.slice(0, REVIEW_PAGE_SIZE),
      nodes: nodes.slice(0, REVIEW_PAGE_SIZE),
      edges: edges.slice(0, REVIEW_PAGE_SIZE),
      pageSize: REVIEW_PAGE_SIZE,
      pages: { sourcePage, nodePage, edgePage },
      hasMore: {
        sources: sources.length > REVIEW_PAGE_SIZE,
        nodes: nodes.length > REVIEW_PAGE_SIZE,
        edges: edges.length > REVIEW_PAGE_SIZE,
      },
    };
  }

  async publishNode(circleId: string, id: string, reviewerId: string, rightsNoteValue: unknown) {
    const rightsNote = this.shortText(rightsNoteValue, "公开授权依据", 1000);
    const rows = await this.prisma.$queryRaw<IdRow[]>`
      UPDATE "CircleKnowledgeShowcaseNode" n SET "status" = 'PUBLISHED',
        "rightsNote" = ${rightsNote}, "rightsApprovedAt" = CURRENT_TIMESTAMP,
        "reviewedBy" = ${reviewerId}, "reviewedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
      FROM "CircleKnowledge" k, "Circle" c
      WHERE n."id" = ${id} AND n."circleId" = ${circleId} AND n."status" = 'DRAFT'
        AND n."sourceKnowledgeId" = k."id" AND k."circleId" = n."circleId" AND k."status" = 'active'
        AND k."contentHash" = n."sourceContentHash"
        AND c."id" = n."circleId" AND c."status" = 'ACTIVE' AND c."deletedAt" IS NULL
      RETURNING n."id"
    `;
    if (!rows.length) throw new NotFoundException("草稿不存在或来源已失效");
    return { id, status: "PUBLISHED" };
  }

  async publishEdge(circleId: string, id: string, reviewerId: string, evidenceNoteValue: unknown) {
    const evidenceNote = this.shortText(evidenceNoteValue, "关系证据", 1000);
    const rows = await this.prisma.$queryRaw<IdRow[]>`
      UPDATE "CircleKnowledgeShowcaseEdge" e SET "status" = 'PUBLISHED',
        "evidenceNote" = ${evidenceNote}, "reviewedBy" = ${reviewerId},
        "reviewedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
      FROM "CircleKnowledgeShowcaseNode" a, "CircleKnowledgeShowcaseNode" b,
        "CircleKnowledge" ka, "CircleKnowledge" kb, "Circle" c
      WHERE e."id" = ${id} AND e."circleId" = ${circleId} AND e."status" = 'DRAFT'
        AND a."id" = e."fromId" AND b."id" = e."toId"
        AND a."circleId" = e."circleId" AND b."circleId" = e."circleId"
        AND a."status" = 'PUBLISHED' AND b."status" = 'PUBLISHED'
        AND a."revokedAt" IS NULL AND b."revokedAt" IS NULL
        AND ka."id" = a."sourceKnowledgeId" AND ka."circleId" = e."circleId"
        AND ka."status" = 'active' AND ka."contentHash" = a."sourceContentHash"
        AND kb."id" = b."sourceKnowledgeId" AND kb."circleId" = e."circleId"
        AND kb."status" = 'active' AND kb."contentHash" = b."sourceContentHash"
        AND c."id" = e."circleId" AND c."status" = 'ACTIVE' AND c."deletedAt" IS NULL
      RETURNING e."id"
    `;
    if (!rows.length) throw new NotFoundException("关系草稿不存在，或节点未公开/已撤回");
    return { id, status: "PUBLISHED" };
  }

  async revokeNode(circleId: string, id: string, reviewerId: string) {
    const rows = await this.prisma.$queryRaw<IdRow[]>`
      UPDATE "CircleKnowledgeShowcaseNode" SET "status" = 'REVOKED', "revokedAt" = CURRENT_TIMESTAMP,
        "revokedBy" = ${reviewerId},
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${id} AND "circleId" = ${circleId} AND "status" <> 'REVOKED'
      RETURNING "id"
    `;
    if (!rows.length) throw new NotFoundException("节点不存在或已经撤回");
    return { id, status: "REVOKED" };
  }

  async revokeEdge(circleId: string, id: string, reviewerId: string) {
    const rows = await this.prisma.$queryRaw<IdRow[]>`
      UPDATE "CircleKnowledgeShowcaseEdge" SET "status" = 'REVOKED', "revokedAt" = CURRENT_TIMESTAMP,
        "revokedBy" = ${reviewerId},
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${id} AND "circleId" = ${circleId} AND "status" <> 'REVOKED'
      RETURNING "id"
    `;
    if (!rows.length) throw new NotFoundException("关系不存在或已经撤回");
    return { id, status: "REVOKED" };
  }
}
