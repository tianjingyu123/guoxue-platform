import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { ClassicCommentaryService } from "./classic-commentary.service";
import { ClassicCommentarySeeder } from "./classic-commentary-seeder.service";
import { CreateCommentaryDto, UpdateCommentaryDto } from "./classic-commentary.dto";
import { RedLineGate, RedLine } from "../../common/red-lines";

@ApiTags("经典·学术解释库")
@Controller("classic/commentaries")
export class ClassicCommentaryController {
  constructor(
    private readonly svc: ClassicCommentaryService,
    private readonly seeder: ClassicCommentarySeeder,
  ) {}

  @Get("stats")
  @ApiOperation({ summary: "注解统计概览" })
  @ApiResponse({ status: 200, description: "成功" })
  getStats() {
    return this.svc.stats();
  }

  @Get("search")
  @ApiOperation({ summary: "搜索注解（分页）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "keyword", required: false })
  @ApiQuery({ name: "school", required: false })
  @ApiQuery({ name: "type", required: false })
  @ApiQuery({ name: "bookId", required: false })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "pageSize", required: false })
  search(
    @Query("keyword") keyword?: string,
    @Query("school") school?: string,
    @Query("type") type?: string,
    @Query("bookId") bookId?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.search({ keyword, school, type, bookId }, +page, +pageSize);
  }

  @Get("book/:bookId")
  @ApiOperation({ summary: "获取经典的注解列表（分页）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "type", required: false })
  @ApiQuery({ name: "school", required: false })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "pageSize", required: false })
  listByBook(
    @Param("bookId") bookId: string,
    @Query("type") type?: string,
    @Query("school") school?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 50,
  ) {
    return this.svc.listByBook(bookId, { type, school }, +page, +pageSize);
  }

  @Get("chapter/:chapterId")
  @ApiOperation({ summary: "获取章节的注解" })
  @ApiResponse({ status: 200, description: "成功" })
  listByChapter(@Param("chapterId") chapterId: string) {
    return this.svc.listByChapter(chapterId);
  }

  @Get(":id")
  @ApiOperation({ summary: "获取注解详情" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getById(@Param("id") id: string) {
    return this.svc.getById(id);
  }

  @Post()
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "创建注解" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  create(@Body() dto: CreateCommentaryDto) {
    return this.svc.create(dto);
  }

  @Put(":id")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "更新注解" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  update(@Param("id") id: string, @Body() dto: UpdateCommentaryDto) {
    return this.svc.update(id, dto);
  }

  @Delete(":id")
  @RedLineGate(RedLine.IRREVERSIBLE)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "删除注解" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  delete(@Param("id") id: string) {
    return this.svc.delete(id);
  }

  @Post("admin/seed")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "填充经典注解种子数据（50+名家注解）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  seed() {
    return this.seeder.seed();
  }

  @Post("admin/vectorize")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "向量化未索引的注解" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  vectorizeUnindexed() {
    return this.svc.vectorizeUnindexed(50);
  }
}
