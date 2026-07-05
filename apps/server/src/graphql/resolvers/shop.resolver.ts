import { Resolver, Query, Args } from "@nestjs/graphql";
import { PrismaService } from "../../prisma/prisma.service";
import { safePagination } from "../../common/pagination";
import { Course, Product } from "../models";
import { CourseFilter, ProductFilter } from "../dto/query.dto";

@Resolver()
export class ShopResolver {
  constructor(private prisma: PrismaService) {}

  @Query(() => [Course], { description: "课程列表" })
  async courses(@Args("filter", { nullable: true }) filter?: CourseFilter) {
    const { circleId, stationId } = filter ?? {};
    const { pageSize, skip } = safePagination(filter?.page ?? 1, filter?.pageSize ?? 10);
    const where: Record<string, unknown> = { auditStatus: "APPROVED" };
    if (circleId) where.circleId = circleId;
    if (stationId) where.stationId = stationId;

    return this.prisma.course.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    });
  }

  @Query(() => Course, { nullable: true, description: "课程详情" })
  async course(@Args("id") id: string) {
    return this.prisma.course.findUnique({ where: { id } });
  }

  @Query(() => [Product], { description: "商品列表" })
  async products(@Args("filter", { nullable: true }) filter?: ProductFilter) {
    const { categoryId, stationId } = filter ?? {};
    const { pageSize, skip } = safePagination(filter?.page ?? 1, filter?.pageSize ?? 10);
    const where: Record<string, unknown> = { status: "ON_SALE" };
    if (categoryId) where.categoryId = categoryId;
    if (stationId) where.stationId = stationId;

    return this.prisma.product.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    });
  }

  @Query(() => Product, { nullable: true, description: "商品详情" })
  async product(@Args("id") id: string) {
    return this.prisma.product.findUnique({ where: { id } });
  }
}
