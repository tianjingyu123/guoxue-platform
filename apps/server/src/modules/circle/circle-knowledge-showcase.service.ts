import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

type ShowcaseNodeRow = { id: string; name: string; summary: string };
type ShowcaseEdgeRow = { id: string; fromId: string; toId: string; relation: string };

/** 圈外只读快照：查询条件在服务端执行，绝不把私有知识发给客户端再过滤。 */
@Injectable()
export class CircleKnowledgeShowcaseService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicGraph(circleId: string) {
    const nodes = await this.prisma.$queryRaw<ShowcaseNodeRow[]>`
      SELECT n."id", n."name", n."summary"
      FROM "CircleKnowledgeShowcaseNode" n
      JOIN "Circle" c ON c."id" = n."circleId"
      JOIN "CircleKnowledge" k ON k."id" = n."sourceKnowledgeId" AND k."circleId" = n."circleId"
      WHERE n."circleId" = ${circleId}
        AND c."status" = 'ACTIVE' AND c."deletedAt" IS NULL
        AND k."status" = 'active'
        AND k."contentHash" = n."sourceContentHash"
        AND n."status" = 'PUBLISHED' AND n."revokedAt" IS NULL
        AND n."rightsApprovedAt" IS NOT NULL AND n."reviewedAt" IS NOT NULL
        AND n."reviewedBy" IS NOT NULL AND nullif(btrim(n."rightsNote"), '') IS NOT NULL
      ORDER BY n."displayOrder" ASC, n."id" ASC
      LIMIT 40
    `;

    if (nodes.length === 0) return { nodes: [], links: [] };
    const ids = nodes.map((node) => node.id);
    const edges = await this.prisma.$queryRaw<ShowcaseEdgeRow[]>(Prisma.sql`
      SELECT e."id", e."fromId", e."toId", e."relation"
      FROM "CircleKnowledgeShowcaseEdge" e
      WHERE e."circleId" = ${circleId}
        AND e."status" = 'PUBLISHED' AND e."revokedAt" IS NULL
        AND e."reviewedAt" IS NOT NULL AND e."reviewedBy" IS NOT NULL
        AND nullif(btrim(e."evidenceNote"), '') IS NOT NULL
        AND e."fromId" IN (${Prisma.join(ids)})
        AND e."toId" IN (${Prisma.join(ids)})
      ORDER BY e."displayOrder" ASC, e."id" ASC
      LIMIT 80
    `);

    const selected = new Set(ids);
    return {
      nodes,
      links: edges
        .filter((edge) => selected.has(edge.fromId) && selected.has(edge.toId))
        .map((edge) => ({ id: edge.id, source: edge.fromId, target: edge.toId, relation: edge.relation })),
    };
  }
}
