import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class PromotionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 据当前用户反查其名下分站（防 IDOR 越权）：Station.userId 唯一，
   * 一个用户对应至多一个分站。找不到则视为非分站主，禁止操作。
   */
  private async getOwnedStationId(userId: string): Promise<string> {
    const station = await this.prisma.station.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!station) throw new ForbiddenException("仅分站主可操作推广素材");
    return station.id;
  }

  /**
   * 归属校验：传入的 stationId 必须属于当前用户。
   */
  private async assertStationOwner(stationId: string, userId: string) {
    const ownedStationId = await this.getOwnedStationId(userId);
    if (stationId !== ownedStationId) {
      throw new ForbiddenException("无权访问该分站的推广素材");
    }
  }

  /**
   * 素材归属校验：素材必须属于当前用户名下的分站，返回该素材。
   */
  private async assertMaterialOwner(id: string, userId: string) {
    const ownedStationId = await this.getOwnedStationId(userId);
    const material = await this.prisma.promotionMaterial.findUnique({ where: { id } });
    if (!material) throw new NotFoundException("素材不存在");
    if (material.stationId !== ownedStationId) {
      throw new ForbiddenException("无权操作该素材");
    }
    return material;
  }

  async listMaterials(stationId: string, userId: string, type?: string, tags?: string[]) {
    await this.assertStationOwner(stationId, userId);
    const where: any = { stationId };
    if (type) where.type = type;
    if (tags?.length) where.tags = { hasSome: tags };
    return this.prisma.promotionMaterial.findMany({ where, orderBy: { usageCount: "desc" } });
  }

  async create(userId: string, dto: { type: string; title: string; content?: string; imageUrl?: string; tags?: string[] }) {
    // stationId 据当前用户反查，不信任入参，防止向他人分站注入素材
    const stationId = await this.getOwnedStationId(userId);
    const { type, title, content, imageUrl, tags } = dto;
    return this.prisma.promotionMaterial.create({
      data: { stationId, type, title, content, imageUrl, tags },
    });
  }

  async delete(id: string, userId: string) {
    await this.assertMaterialOwner(id, userId);
    return this.prisma.promotionMaterial.delete({ where: { id } });
  }

  async getDetail(id: string, userId: string) {
    return this.assertMaterialOwner(id, userId);
  }

  async recordUse(id: string, userId: string) {
    await this.assertMaterialOwner(id, userId);
    return this.prisma.promotionMaterial.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    });
  }
}
