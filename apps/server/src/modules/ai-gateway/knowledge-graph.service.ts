import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AiGatewayService } from "./ai-gateway.service";

interface ExtractedEntity {
  name: string;
  type: string;
  aliases?: string[];
  summary?: string;
}

interface ExtractedEdge {
  fromName: string;
  toName: string;
  relation: string;
  evidence?: string;
}

/**
 * RAG Layer 3 — 知识图谱服务
 *
 * 从知识条目中提取实体和关系，构建国学知识图谱，
 * 支持实体查询、路径搜索和相关知识推荐。
 */
@Injectable()
export class KnowledgeGraphService {
  private readonly logger = new Logger(KnowledgeGraphService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiGatewayService,
  ) {}

  /** 从知识条目中提取实体和关系并入库 */
  async extractFromKnowledge(knowledgeId: string): Promise<{
    entities: number;
    edges: number;
  }> {
    const knowledge = await this.prisma.circleKnowledge.findUnique({
      where: { id: knowledgeId },
      select: { content: true },
    });
    if (!knowledge) return { entities: 0, edges: 0 };

    const text = knowledge.content.slice(0, 3000);
    const extracted = await this.callExtraction(text);
    if (!extracted) return { entities: 0, edges: 0 };

    let entities = 0;
    let edges = 0;

    for (const ent of extracted.entities) {
      try {
        await this.prisma.knowledgeEntity.upsert({
          where: { name_type: { name: ent.name, type: ent.type } },
          create: {
            name: ent.name,
            type: ent.type,
            aliases: ent.aliases ?? [],
            summary: ent.summary,
          },
          update: {
            aliases: ent.aliases ?? [],
            summary: ent.summary ?? undefined,
          },
        });
        entities++;
      } catch (err: any) {
        this.logger.warn(`实体入库失败 [${ent.name}]: ${err.message}`);
      }
    }

    for (const edge of extracted.edges) {
      try {
        const from = await this.prisma.knowledgeEntity.findUnique({
          where: { name_type: { name: edge.fromName, type: "concept" } },
        });
        const to = await this.prisma.knowledgeEntity.findUnique({
          where: { name_type: { name: edge.toName, type: "concept" } },
        });
        if (!from || !to) continue;

        await this.prisma.knowledgeEdge.create({
          data: {
            fromId: from.id,
            toId: to.id,
            relation: edge.relation,
            evidence: edge.evidence,
            knowledgeId,
          },
        });
        edges++;
      } catch (err: any) {
        this.logger.warn(`关系入库失败 [${edge.fromName}→${edge.toName}]: ${err.message}`);
      }
    }

    return { entities, edges };
  }

  /** 按名称和类型查询实体 */
  async getEntity(name: string, type?: string) {
    if (type) {
      return this.prisma.knowledgeEntity.findUnique({
        where: { name_type: { name, type } },
        include: {
          edgesFrom: { include: { toEntity: true } },
          edgesTo: { include: { fromEntity: true } },
        },
      });
    }
    return this.prisma.knowledgeEntity.findFirst({
      where: { name },
      include: {
        edgesFrom: { include: { toEntity: true } },
        edgesTo: { include: { fromEntity: true } },
      },
    });
  }

  /** 列出所有实体（分页） */
  async listEntities(type?: string, page = 1, pageSize = 20) {
    const where = type ? { type } : {};
    const [data, total] = await Promise.all([
      this.prisma.knowledgeEntity.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.knowledgeEntity.count({ where }),
    ]);
    return { items: data, total, page, pageSize };
  }

  /** 按实体类型统计 */
  async countByType() {
    return this.prisma.knowledgeEntity.groupBy({
      by: ["type"],
      _count: true,
      orderBy: { _count: { type: "desc" } },
    });
  }

  /** BFS 查询两个实体之间的最短路径（最多4跳） */
  async findPath(
    fromName: string,
    toName: string,
    maxDepth = 4,
  ): Promise<{ path: string[]; relations: string[] } | null> {
    const from = await this.prisma.knowledgeEntity.findFirst({ where: { name: fromName } });
    const to = await this.prisma.knowledgeEntity.findFirst({ where: { name: toName } });
    if (!from || !to) return null;

    const visited = new Set<string>();
    const queue: Array<{ id: string; path: string[]; relations: string[] }> = [
      { id: from.id, path: [from.name], relations: [] },
    ];
    visited.add(from.id);

    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (cur.path.length > maxDepth + 1) continue;

      if (cur.id === to.id) return { path: cur.path, relations: cur.relations };

      const edges = await this.prisma.knowledgeEdge.findMany({
        where: { fromId: cur.id },
        include: { toEntity: true },
        take: 50,
      });

      for (const edge of edges) {
        if (!visited.has(edge.toId)) {
          visited.add(edge.toId);
          queue.push({
            id: edge.toId,
            path: [...cur.path, edge.toEntity.name],
            relations: [...cur.relations, edge.relation],
          });
        }
      }
    }
    return null;
  }

  /** 获取与指定实体相关的扩展知识（1跳邻居） */
  async expandEntity(name: string): Promise<{
    entity: { name: string; type: string; summary?: string | null };
    related: Array<{ name: string; type: string; relation: string }>;
  } | null> {
    const entity = await this.getEntity(name);
    if (!entity) return null;

    const related: Array<{ name: string; type: string; relation: string }> = [];
    for (const edge of entity.edgesFrom) {
      related.push({
        name: edge.toEntity.name,
        type: edge.toEntity.type,
        relation: edge.relation,
      });
    }
    for (const edge of entity.edgesTo) {
      related.push({
        name: edge.fromEntity.name,
        type: edge.fromEntity.type,
        relation: edge.relation,
      });
    }

    return {
      entity: {
        name: entity.name,
        type: entity.type,
        summary: entity.summary,
      },
      related,
    };
  }

  /** 批量提取知识图谱（从知识库批量抽取） */
  async batchExtract(limit = 20): Promise<{ processed: number; entities: number; edges: number }> {
    const knowledgeItems = await this.prisma.circleKnowledge.findMany({
      where: { status: "active" },
      select: { id: true },
      orderBy: { addedAt: "desc" },
      take: limit,
    });

    let entities = 0;
    let edges = 0;
    for (const item of knowledgeItems) {
      const result = await this.extractFromKnowledge(item.id);
      entities += result.entities;
      edges += result.edges;
    }
    return { processed: knowledgeItems.length, entities, edges };
  }

  // ───────── 私有方法 ─────────

  private async callExtraction(
    text: string,
  ): Promise<{ entities: ExtractedEntity[]; edges: ExtractedEdge[] } | null> {
    const prompt = `你是国学知识图谱专家。请从以下文本中提取实体和关系。

要求：
1. 实体类型: person（人物）、book（典籍）、concept（概念）、dynasty（朝代）、event（事件）、place（地点）
2. 关系类型: mentions（提及）、explains（解释）、refutes（驳斥）、cites（引用）、extends（延伸）
3. 每个实体需提取 name（中文名）、type、aliases（别名，可选）、summary（一句话概括，可选）
4. 提取实体间的关系：fromName/toName 均使用中文名

输入文本：
---
${text.slice(0, 2500)}
---

请严格返回JSON格式（不要markdown代码块）：
{
  "entities": [
    {"name": "孔子", "type": "person", "aliases": ["孔丘", "仲尼"], "summary": "儒家学派创始人"}
  ],
  "edges": [
    {"fromName": "孔子", "toName": "论语", "relation": "cites", "evidence": "《论语》记载了孔子的言行"}
  ]
}

如果未发现明确的实体或关系，返回 {"entities": [], "edges": []}`;

    try {
      const result = await this.ai.chat({
        scene: "knowledge_graph",
        messages: [{ role: "user", content: prompt }],
        options: { temperature: 0.2, maxTokens: 2048 },
      });
      return this.parseJsonResponse(result.content);
    } catch (err: any) {
      this.logger.warn(`实体提取失败: ${err.message}`);
      return null;
    }
  }

  private parseJsonResponse(raw: string): {
    entities: ExtractedEntity[];
    edges: ExtractedEdge[];
  } | null {
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) return null;
      const parsed = JSON.parse(match[0]);
      return {
        entities: Array.isArray(parsed.entities) ? parsed.entities.slice(0, 20) : [],
        edges: Array.isArray(parsed.edges) ? parsed.edges.slice(0, 30) : [],
      };
    } catch (err) {
      this.logger.warn(`知识图谱 JSON 解析失败`, err);
      return null;
    }
  }
}
