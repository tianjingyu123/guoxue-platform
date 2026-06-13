import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { ZiweiKnowledgeService } from "./ziwei-knowledge.service";
import { ZiweiKnowledgeSeeder } from "./ziwei-knowledge-seeder.service";
import { CreateZiweiKnowledgeDto, UpdateZiweiKnowledgeDto } from "./ziwei-knowledge.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("紫微知识库")
@Controller("ziwei/knowledge")
export class ZiweiKnowledgeController {
  constructor(
    private readonly svc: ZiweiKnowledgeService,
    private readonly seeder: ZiweiKnowledgeSeeder,
  ) {}

  @Post("admin/seed")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "填充紫微知识库种子数据（20条）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  seed() {
    return this.seeder.seed();
  }

  @Get("stats")
  @ApiOperation({ summary: "紫微知识库统计概览" })
  @ApiResponse({ status: 200, description: "成功" })
  getStats() {
    return this.svc.getStats();
  }

  @Get("search")
  @ApiOperation({ summary: "搜索紫微知识" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "keyword", required: false })
  @ApiQuery({ name: "category", required: false })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  search(
    @Query("keyword") keyword?: string,
    @Query("category") category?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.search(keyword || "", category, +page, +pageSize);
  }

  @Get("category/:category")
  @ApiOperation({ summary: "按分类列出紫微知识" })
  @ApiResponse({ status: 200, description: "成功" })
  getByCategory(@Param("category") category: string, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.getByCategory(category, +page, +pageSize);
  }

  @Get(":id")
  @ApiOperation({ summary: "获取紫微知识详情" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getById(@Param("id") id: string) {
    return this.svc.getById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "创建紫微知识条目" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  create(@Body() dto: CreateZiweiKnowledgeDto) {
    return this.svc.create(dto);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "更新紫微知识条目" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  update(@Param("id") id: string, @Body() dto: UpdateZiweiKnowledgeDto) {
    return this.svc.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "删除紫微知识条目" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  delete(@Param("id") id: string) {
    return this.svc.delete(id);
  }
}
