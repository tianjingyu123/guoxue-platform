import { Resolver, Query, Args } from "@nestjs/graphql";
import { PrismaService } from "../../prisma/prisma.service";
import { Circle, Post } from "../models";
import { CircleFilter } from "../dto/query.dto";

@Resolver(() => Circle)
export class CircleResolver {
  constructor(private prisma: PrismaService) {}

  @Query(() => [Circle], { description: "圈子列表" })
  async circles(@Args("filter", { nullable: true }) filter?: CircleFilter) {
    const { page = 1, pageSize = 10, stationId } = filter ?? {};
    const where: Record<string, unknown> = { status: "ACTIVE" };
    if (stationId) where.stationId = stationId;

    return this.prisma.circle.findMany({
      where,
      skip: (page - 1) * pageSize,
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
    return this.prisma.post.findMany({
      where: { circleId, status: "PUBLISHED" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ isTop: "desc" }, { createdAt: "desc" }],
    });
  }
}
