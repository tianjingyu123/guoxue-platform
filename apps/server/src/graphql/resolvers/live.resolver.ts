import { Resolver, Query, Args } from "@nestjs/graphql";
import { PrismaService } from "../../prisma/prisma.service";
import { safePagination } from "../../common/pagination";
import { LiveRoom } from "../models";
import { LiveFilter } from "../dto/query.dto";

@Resolver(() => LiveRoom)
export class LiveResolver {
  constructor(private prisma: PrismaService) {}

  @Query(() => [LiveRoom], { description: "直播间列表" })
  async liveRooms(@Args("filter", { nullable: true }) filter?: LiveFilter) {
    const { status } = filter ?? {};
    const { pageSize, skip } = safePagination(filter?.page ?? 1, filter?.pageSize ?? 10);
    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    return this.prisma.liveRoom.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    });
  }

  @Query(() => LiveRoom, { nullable: true, description: "直播间详情" })
  async liveRoom(@Args("id") id: string) {
    return this.prisma.liveRoom.findUnique({ where: { id } });
  }
}
