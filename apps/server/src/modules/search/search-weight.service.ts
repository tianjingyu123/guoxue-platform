import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class SearchWeightService {
  constructor(private prisma: PrismaService) {}

  async list(entityType?: string) {
    const where = entityType ? { entityType } : {};
    return this.prisma.searchWeight.findMany({ where, orderBy: [{ entityType: "asc" }, { fieldName: "asc" }] });
  }

  async upsert(data: { entityType: string; fieldName: string; weight: number; enabled?: boolean }) {
    return this.prisma.searchWeight.upsert({
      where: { entityType_fieldName: { entityType: data.entityType, fieldName: data.fieldName } },
      create: data,
      update: { weight: data.weight, enabled: data.enabled ?? true },
    });
  }

  async delete(id: string) {
    return this.prisma.searchWeight.delete({ where: { id } });
  }

  /** 获取所有启用的权重，按 entityType 分组 */
  async getWeightMap(): Promise<Map<string, number>> {
    const rows = await this.prisma.searchWeight.findMany({ where: { enabled: true } });
    const map = new Map<string, number>();
    for (const r of rows) {
      map.set(`${r.entityType}:${r.fieldName}`, r.weight);
    }
    return map;
  }

  /** 批量初始化默认权重 */
  async seedDefaults() {
    const defaults: { entityType: string; fieldName: string; weight: number }[] = [
      { entityType: "article", fieldName: "title", weight: 2.0 },
      { entityType: "article", fieldName: "excerpt", weight: 1.0 },
      { entityType: "course", fieldName: "title", weight: 2.0 },
      { entityType: "course", fieldName: "intro", weight: 1.2 },
      { entityType: "product", fieldName: "title", weight: 2.0 },
      { entityType: "product", fieldName: "intro", weight: 1.0 },
      { entityType: "circle", fieldName: "name", weight: 2.5 },
      { entityType: "circle", fieldName: "intro", weight: 1.5 },
      { entityType: "video", fieldName: "title", weight: 2.0 },
      { entityType: "user", fieldName: "nickname", weight: 1.5 },
      { entityType: "classic", fieldName: "title", weight: 3.0 },
      { entityType: "classic", fieldName: "author", weight: 2.0 },
      { entityType: "classic", fieldName: "intro", weight: 1.0 },
      { entityType: "content", fieldName: "title", weight: 2.5 },
      { entityType: "content", fieldName: "author", weight: 1.5 },
      { entityType: "content", fieldName: "excerpt", weight: 1.0 },
    ];
    for (const d of defaults) {
      await this.prisma.searchWeight.upsert({
        where: { entityType_fieldName: { entityType: d.entityType, fieldName: d.fieldName } },
        create: d,
        update: { weight: d.weight },
      });
    }
    return { seeded: defaults.length };
  }
}
