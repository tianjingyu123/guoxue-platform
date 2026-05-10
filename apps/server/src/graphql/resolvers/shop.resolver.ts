import { Resolver, Query, Args } from "@nestjs/graphql";
import { PrismaService } from "../../prisma/prisma.service";
import { Course, Product } from "../models";
import { CourseFilter, ProductFilter } from "../dto/query.dto";

@Resolver()
export class ShopResolver {
  constructor(private prisma: PrismaService) {}

  @Query(() => [Course], { description: "课程列表" })
  async courses(@Args("filter", { nullable: true }) filter?: CourseFilter) {
    const { page = 1, pageSize = 10, circleId, stationId } = filter ?? {};
    const where: any = { auditStatus: "APPROVED" };
    if (circleId) where.circleId = circleId;
    if (stationId) where.stationId = stationId;

    return this.prisma.course.findMany({
      where,
      skip: (page - 1) * pageSize,
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
    const { page = 1, pageSize = 10, categoryId, stationId } = filter ?? {};
    const where: any = { status: "ON_SALE" };
    if (categoryId) where.categoryId = categoryId;
    if (stationId) where.stationId = stationId;

    return this.prisma.product.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    });
  }

  @Query(() => Product, { nullable: true, description: "商品详情" })
  async product(@Args("id") id: string) {
    return this.prisma.product.findUnique({ where: { id } });
  }
}
