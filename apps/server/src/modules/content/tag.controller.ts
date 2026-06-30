import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
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
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async hotTags(@Query("limit") limit = 20) {
    // query 参数为字符串，Prisma take 需 number，未转换会触发运行时 500
    const takeN = Math.min(Math.max(Number(limit) || 20, 1), 50);
    return this.prisma.topicTag.findMany({
      where: { status: "ACTIVE" },
      orderBy: { postCount: "desc" },
      take: takeN,
    });
  }

  @Get("search")
  @ApiOperation({ summary: "搜索标签（公开）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "q", required: true })
  async search(@Query("q") q: string) {
    return this.prisma.topicTag.findMany({
      where: { name: { contains: q }, status: "ACTIVE" },
      take: 10,
    });
  }

  @Get(":name/posts")
  @ApiOperation({ summary: "标签下的内容聚合（公开）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  async tagPosts(@Param("name") name: string, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    // query 参数为字符串，分页计算/Prisma take 需 number
    const pageN = Math.max(Number(page) || 1, 1);
    const sizeN = Math.min(Math.max(Number(pageSize) || 20, 1), 100);
    const where = { tags: { has: name }, status: "PUBLISHED" };
    // 显式 select：DB 当前缺少 schema 中声明的 deletedAt 列，裸 findMany 全列查询会 500
    const [items, total] = await Promise.all([
      this.prisma.content.findMany({
        where,
        select: {
          id: true,
          title: true,
          type: true,
          author: true,
          dynasty: true,
          excerpt: true,
          cover: true,
          tags: true,
          viewCount: true,
          likeCount: true,
          createdAt: true,
        },
        skip: (pageN - 1) * sizeN,
        take: sizeN,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.content.count({ where }),
    ]);
    return { items, total, page: pageN, pageSize: sizeN };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "创建标签" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  adminCreate(@Body() dto: CreateTagDto) {
    return this.prisma.topicTag.create({ data: dto });
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "编辑标签" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  adminUpdate(@Param("id") id: string, @Body() dto: UpdateTagDto) {
    return this.prisma.topicTag.update({ where: { id }, data: dto });
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "删除标签" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  adminDelete(@Param("id") id: string) {
    return this.prisma.topicTag.delete({ where: { id } });
  }
}
