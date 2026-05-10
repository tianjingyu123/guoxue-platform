import { Resolver, Query, Args, Int } from "@nestjs/graphql";
import { PrismaService } from "../../prisma/prisma.service";
import { Content, ClassicBook, PageInfo } from "../models";
import { ContentFilter, ClassicFilter } from "../dto/query.dto";

@Resolver(() => Content)
export class ContentResolver {
  constructor(private prisma: PrismaService) {}

  @Query(() => [Content], { description: "内容列表" })
  async contents(@Args("filter", { nullable: true }) filter?: ContentFilter) {
    const { page = 1, pageSize = 10, type, keyword, stationId } = filter ?? {};
    const where: any = { status: "PUBLISHED" };
    if (type) where.type = type;
    if (stationId) where.stationId = stationId;
    if (keyword) where.title = { contains: keyword };

    return this.prisma.content.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    });
  }

  @Query(() => Content, { nullable: true, description: "内容详情" })
  async content(@Args("id") id: string) {
    return this.prisma.content.findUnique({ where: { id } });
  }

  @Query(() => [ClassicBook], { description: "古籍列表" })
  async classicBooks(@Args("filter", { nullable: true }) filter?: ClassicFilter) {
    const { page = 1, pageSize = 10, category } = filter ?? {};
    const where: any = { status: "PUBLISHED" };
    if (category) where.category = category;

    return this.prisma.classicBook.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    });
  }

  @Query(() => ClassicBook, { nullable: true, description: "古籍详情" })
  async classicBook(@Args("id") id: string) {
    return this.prisma.classicBook.findUnique({ where: { id } });
  }

  @Query(() => Int, { description: "内容总数" })
  async contentCount(@Args("type", { nullable: true }) type?: string) {
    const where: any = { status: "PUBLISHED" };
    if (type) where.type = type;
    return this.prisma.content.count({ where });
  }
}
