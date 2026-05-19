import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class PromotionService {
  constructor(private readonly prisma: PrismaService) {}

  async listMaterials(stationId: string, type?: string, tags?: string[]) {
    const where: any = { stationId };
    if (type) where.type = type;
    if (tags?.length) where.tags = { hasSome: tags };
    return this.prisma.promotionMaterial.findMany({ where, orderBy: { usageCount: "desc" } });
  }

  async create(dto: { stationId: string; type: string; title: string; content?: string; imageUrl?: string; tags?: string[] }) {
    return this.prisma.promotionMaterial.create({ data: dto });
  }

  async delete(id: string) {
    return this.prisma.promotionMaterial.delete({ where: { id } });
  }

  async getDetail(id: string) {
    return this.prisma.promotionMaterial.findUnique({ where: { id } });
  }

  async recordUse(id: string) {
    return this.prisma.promotionMaterial.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    });
  }
}
