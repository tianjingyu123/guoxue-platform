import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { BaziKnowledgeService } from "./bazi-knowledge.service";
import { BaziKnowledgeSeeder } from "./bazi-knowledge-seeder.service";
import { CreateBaziKnowledgeDto, UpdateBaziKnowledgeDto } from "./bazi-knowledge.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("八字·知识库")
@Controller("bazi/knowledge")
export class BaziKnowledgeController {
  constructor(
    private readonly svc: BaziKnowledgeService,
    private readonly seeder: BaziKnowledgeSeeder,
  ) {}

  @Get("stats")
  @ApiOperation({ summary: "知识库统计概览" })
  @ApiResponse({ status: 200, description: "成功" })
  getStats() {
    return this.svc.stats();
  }

  @Get("search")
  @ApiOperation({ summary: "搜索八字知识" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "keyword", required: true })
  @ApiQuery({ name: "category", required: false })
  search(@Query("keyword") keyword: string, @Query("category") category?: string) {
    return this.svc.search(keyword, category);
  }

  /**
   * 按当前八字检索古籍 —— 八字结果页「古籍参考」用（公开：看盘不必登录）。
   * 每条返回 matchedOn，说得出为什么推它；一条都命中不了就返回空数组
   * （宁可不显示，也不塞一段不相干的原文冒充「参考」）。
   */
  @Post("for-bazi")
  @ApiOperation({ summary: "按当前八字检索相关古籍（格局/用神/日主/月令/神煞打分排序）" })
  @ApiResponse({ status: 200, description: "成功" })
  forBazi(
    @Body()
    dto: {
      dayGan?: string;
      dayZhi?: string;
      monthZhi?: string;
      geju?: string;
      yongshen?: string;
      shenSha?: string[];
      wuxing?: string;
      limit?: number;
    },
  ) {
    return this.svc.forBazi(dto ?? {});
  }

  @Get("category/:category")
  @ApiOperation({ summary: "按分类列出知识条目" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  listByCategory(
    @Param("category") category: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.listByCategory(category, +page, +pageSize);
  }

  @Get(":id")
  @ApiOperation({ summary: "获取知识条目详情" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getById(@Param("id") id: string) {
    return this.svc.getById(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "创建知识条目" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  create(@Body() dto: CreateBaziKnowledgeDto) {
    return this.svc.create(dto);
  }

  @Put(":id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "更新知识条目" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  update(@Param("id") id: string, @Body() dto: UpdateBaziKnowledgeDto) {
    return this.svc.update(id, dto);
  }

  @Delete(":id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "删除知识条目" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  delete(@Param("id") id: string) {
    return this.svc.delete(id);
  }

  @Post("admin/seed")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "填充八字知识库种子数据" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  seed() {
    return this.seeder.seed();
  }

  @Post("admin/vectorize")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "向量化未索引的知识" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  vectorizeUnindexed() {
    return this.svc.vectorizeUnindexed(50);
  }
}
