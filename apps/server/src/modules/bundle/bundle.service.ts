import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateBundleDto, UpdateBundleDto, BundleQueryDto } from "./bundle.dto";
import { Prisma } from "@prisma/client";
import { safePagination, NO_PAGE_LIMIT } from "../../common/pagination";

@Injectable()
export class BundleService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateBundleDto) {
    const { items, ...data } = dto;
    return this.prisma.courseBundle.create({
      data: {
        ...data,
        items: items?.length
          ? { create: items.map((it) => ({ itemType: it.itemType, itemId: it.itemId, sortOrder: it.sortOrder ?? 0 })) }
          : undefined,
      },
      include: { items: true },
    });
  }

  async list(query: BundleQueryDto) {
    const { page, pageSize, skip } = safePagination(query.page, query.pageSize, NO_PAGE_LIMIT);
    const where: Prisma.CourseBundleWhereInput = {};
    if (query.type) where.type = query.type;
    if (query.target) where.target = query.target;
    if (query.status) where.status = query.status;
    if (query.keyword) where.name = { contains: query.keyword };

    const [bundles, total] = await Promise.all([
      this.prisma.courseBundle.findMany({
        where,
        include: { _count: { select: { items: true, stationAccess: true } } },
        skip,
        take: pageSize,
        orderBy: { sortOrder: "asc" },
      }),
      this.prisma.courseBundle.count({ where }),
    ]);
    return { bundles, total, page, pageSize };
  }

  async getById(id: string) {
    const bundle = await this.prisma.courseBundle.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!bundle) throw new BusinessException(ErrorCode.NOT_FOUND, "组合包不存在");
    return bundle;
  }

  async update(id: string, dto: UpdateBundleDto) {
    const bundle = await this.prisma.courseBundle.findUnique({ where: { id } });
    if (!bundle) throw new BusinessException(ErrorCode.NOT_FOUND, "组合包不存在");

    const { items, ...data } = dto;

    // 如果传了 items，全量替换
    if (items) {
      await this.prisma.$transaction([
        this.prisma.courseBundleItem.deleteMany({ where: { bundleId: id } }),
        this.prisma.courseBundleItem.createMany({
          data: items.map((it) => ({ bundleId: id, itemType: it.itemType, itemId: it.itemId, sortOrder: it.sortOrder ?? 0 })),
        }),
      ]);
    }

    return this.prisma.courseBundle.update({
      where: { id },
      data,
      include: { items: true },
    });
  }

  async delete(id: string) {
    const bundle = await this.prisma.courseBundle.findUnique({ where: { id } });
    if (!bundle) throw new BusinessException(ErrorCode.NOT_FOUND, "组合包不存在");
    await this.prisma.courseBundle.delete({ where: { id } });
    return { success: true };
  }

  // ── 领取/访问记录 ──

  /** 分站领取免费赠送包 */
  async claimByStation(stationId: string, bundleId: string) {
    const bundle = await this.prisma.courseBundle.findUnique({ where: { id: bundleId } });
    if (!bundle) throw new BusinessException(ErrorCode.NOT_FOUND, "组合包不存在");

    const existing = await this.prisma.stationBundleAccess.findUnique({
      where: { bundleId_stationId: { bundleId, stationId } },
    });
    if (existing) throw new BusinessException(ErrorCode.BAD_REQUEST, "已领取过该组合包");

    return this.prisma.stationBundleAccess.create({
      data: { bundleId, stationId },
      include: { bundle: { include: { items: true } } },
    });
  }

  /** 运营商领取免费赠送包 */
  async claimByOperator(operatorId: string, bundleId: string) {
    const bundle = await this.prisma.courseBundle.findUnique({ where: { id: bundleId } });
    if (!bundle) throw new BusinessException(ErrorCode.NOT_FOUND, "组合包不存在");

    const existing = await this.prisma.stationBundleAccess.findUnique({
      where: { bundleId_operatorId: { bundleId, operatorId } },
    });
    if (existing) throw new BusinessException(ErrorCode.BAD_REQUEST, "已领取过该组合包");

    return this.prisma.stationBundleAccess.create({
      data: { bundleId, operatorId },
      include: { bundle: { include: { items: true } } },
    });
  }

  /** 分站查看自己已领取的组合包 */
  async getMyStationBundles(stationId: string) {
    const accesses = await this.prisma.stationBundleAccess.findMany({
      where: { stationId },
      include: { bundle: { include: { items: true } } },
      orderBy: { createdAt: "desc" },
    });
    return accesses.map((a) => a.bundle);
  }

  /** 运营商查看自己已领取的组合包 */
  async getMyOperatorBundles(operatorId: string) {
    const accesses = await this.prisma.stationBundleAccess.findMany({
      where: { operatorId },
      include: { bundle: { include: { items: true } } },
      orderBy: { createdAt: "desc" },
    });
    return accesses.map((a) => a.bundle);
  }
}
