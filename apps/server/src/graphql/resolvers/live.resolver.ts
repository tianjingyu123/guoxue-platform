import { Resolver, Query, Args } from "@nestjs/graphql";
import { PrismaService } from "../../prisma/prisma.service";
import { LiveRoom } from "../models";
import { LiveFilter } from "../dto/query.dto";

@Resolver(() => LiveRoom)
export class LiveResolver {
  constructor(private prisma: PrismaService) {}

  @Query(() => [LiveRoom], { description: "直播间列表" })
  async liveRooms(@Args("filter", { nullable: true }) filter?: LiveFilter) {
    const { page = 1, pageSize = 10, status } = filter ?? {};
    const where: any = {};
    if (status) where.status = status;

    return this.prisma.liveRoom.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    });
  }

  @Query(() => LiveRoom, { nullable: true, description: "直播间详情" })
  async liveRoom(@Args("id") id: string) {
    return this.prisma.liveRoom.findUnique({ where: { id } });
  }
}
