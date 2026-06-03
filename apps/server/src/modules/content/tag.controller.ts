import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { CreateTagDto, UpdateTagDto } from "./dto/tag.dto";

@ApiTags("话题标签")
@Controller("tags")
export class TagController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("hot")
  @ApiOperation({ summary: "热门标签（公开）" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async hotTags(@Query("limit") limit = 20) {
    return this.prisma.topicTag.findMany({
      where: { status: "ACTIVE" },
      orderBy: { postCount: "desc" },
      take: limit,
    });
  }

  @Get("search")
  @ApiOperation({ summary: "搜索标签（公开）" })
  @ApiQuery({ name: "q", required: true })
  async search(@Query("q") q: string) {
    return this.prisma.topicTag.findMany({
      where: { name: { contains: q }, status: "ACTIVE" },
      take: 10,
    });
  }

  @Get(":name/posts")
  @ApiOperation({ summary: "标签下的内容聚合（公开）" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  async tagPosts(@Param("name") name: string, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    const where = { tags: { has: name }, status: "PUBLISHED" };
    const [items, total] = await Promise.all([
      this.prisma.content.findMany({
        where: { ...where, status: { not: "DRAFT" } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.content.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "创建标签" })
  adminCreate(@Body() dto: CreateTagDto) {
    return this.prisma.topicTag.create({ data: dto });
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "编辑标签" })
  adminUpdate(@Param("id") id: string, @Body() dto: UpdateTagDto) {
    return this.prisma.topicTag.update({ where: { id }, data: dto });
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "删除标签" })
  adminDelete(@Param("id") id: string) {
    return this.prisma.topicTag.delete({ where: { id } });
  }
}
