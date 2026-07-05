import { Resolver, Query, Args } from "@nestjs/graphql";
import { PrismaService } from "../../prisma/prisma.service";
import { safePagination } from "../../common/pagination";
import { Circle, Post } from "../models";
import { CircleFilter } from "../dto/query.dto";

@Resolver(() => Circle)
export class CircleResolver {
  constructor(private prisma: PrismaService) {}

  @Query(() => [Circle], { description: "圈子列表" })
  async circles(@Args("filter", { nullable: true }) filter?: CircleFilter) {
    const { stationId } = filter ?? {};
    const { pageSize, skip } = safePagination(filter?.page ?? 1, filter?.pageSize ?? 10);
    const where: Record<string, unknown> = { status: "ACTIVE" };
    if (stationId) where.stationId = stationId;

    return this.prisma.circle.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { memberCount: "desc" },
    });
  }

  @Query(() => Circle, { nullable: true, description: "圈子详情" })
  async circle(@Args("id") id: string) {
    return this.prisma.circle.findUnique({ where: { id } });
  }

  @Query(() => [Post], { description: "圈子帖子" })
  async circlePosts(
    @Args("circleId") circleId: string,
    @Args("page", { defaultValue: 1 }) page: number,
    @Args("pageSize", { defaultValue: 10 }) pageSize: number,
  ) {
    const { pageSize: ps, skip } = safePagination(page, pageSize);
    return this.prisma.post.findMany({
      where: { circleId, status: "PUBLISHED" },
      skip,
      take: ps,
      orderBy: [{ isTop: "desc" }, { createdAt: "desc" }],
    });
  }
}
