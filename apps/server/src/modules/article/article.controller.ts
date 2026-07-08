import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards, UsePipes } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { ArticleService } from "./article.service";
import { CreateArticleDto, UpdateArticleDto, AddRecommendDto } from "./article.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { RedLineGate, RedLine } from "../../common/red-lines";
import { StationIsolationGuard } from "../../common/station-isolation.guard";
import { StationId } from "../../common/station-id.decorator";
import { RequireFeature } from "../../common/feature-flag.decorator";
import { FeatureFlagGuard } from "../../common/feature-flag.guard";
import { SanitizePipe } from "../../common/sanitize.pipe";
import { Request } from "express";

@ApiTags("文章")
@Controller("articles")
export class ArticleController {
  constructor(private article: ArticleService) {}

  // ───────── 文章 CRUD ─────────

  @Post("circles/:circleId")
  @UseGuards(JwtAuthGuard, FeatureFlagGuard)
  @RequireFeature("content_publish")
  @UsePipes(new SanitizePipe())
  @ApiOperation({ summary: "创建文章" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  create(@Param("circleId") circleId: string, @Req() req: Request, @Body() dto: CreateArticleDto) {
    return this.article.create(circleId, req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "获取文章列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页条数" })
  @ApiQuery({ name: "circleId", required: false, type: String, description: "圈子ID" })
  @ApiQuery({ name: "tag", required: false, type: String, description: "标签" })
  @ApiQuery({ name: "isPushHome", required: false, type: String, description: "是否推送首页" })
  list(
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
    @Query("circleId") circleId?: string,
    @Query("tag") tag?: string,
    @Query("isPushHome") isPushHome?: string,
    @StationId() stationId?: string,
  ) {
    return this.article.listArticles({
      page: +page,
      pageSize: +pageSize,
      circleId,
      tag,
      isPushHome: isPushHome === "true" ? true : isPushHome === "false" ? false : undefined,
      stationId,
    });
  }

  @Get("stats")
  @ApiOperation({ summary: "获取文章统计（管理端）" })
  @ApiResponse({ status: 200, description: "成功" })
  getStats() {
    return this.article.getStats();
  }

  @Get("feed")
  @ApiOperation({ summary: "获取首页动态" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页条数" })
  getHomeFeed(
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
    @Req() req?: Request,
  ) {
    return this.article.getHomeFeed({ page: +page, pageSize: +pageSize, userId: req?.user?.id });
  }

  @Get(":id/related")
  @ApiOperation({ summary: "获取相关文章" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getRelated(@Param("id") id: string) {
    return this.article.getRelated(id);
  }

  // ───────── 草稿管理 ─────────

  @Get("drafts")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取我的草稿列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  getMyDrafts(@Req() req: Request, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.article.getMyDrafts(req.user.id, +page, +pageSize);
  }

  @Get(":id")
  @UseGuards(StationIsolationGuard)
  @ApiOperation({ summary: "获取文章详情" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  detail(@Param("id") id: string) {
    return this.article.getDetail(id);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard)
  @UsePipes(new SanitizePipe())
  @ApiOperation({ summary: "更新文章" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  update(@Param("id") id: string, @Req() req: Request, @Body() dto: UpdateArticleDto) {
    return this.article.update(id, req.user.id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "删除文章" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  delete(@Param("id") id: string, @Req() req: Request) {
    return this.article.delete(id, req.user.id);
  }

  // ───────── 审核管理 ─────────

  @Put(":id/audit")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "审核文章" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  audit(@Param("id") id: string, @Body("status") status: string) {
    return this.article.auditArticle(id, status);
  }

  // ───────── 推荐卡片 ─────────

  @Post(":id/recommends")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "添加推荐" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  addRecommend(@Param("id") articleId: string, @Req() req: Request, @Body() dto: AddRecommendDto) {
    return this.article.addRecommend(articleId, req.user.id, dto);
  }

  @Delete(":id/recommends/:recId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "移除推荐" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  removeRecommend(@Param("recId") recId: string, @Req() req: Request) {
    return this.article.removeRecommend(recId, req.user.id);
  }

  @Post("drafts")
  @UseGuards(JwtAuthGuard)
  @UsePipes(new SanitizePipe())
  @ApiOperation({ summary: "保存草稿" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  saveDraft(@Req() req: Request, @Body() dto: CreateArticleDto) {
    return this.article.saveDraft(req.user.id, dto);
  }

  @Put("drafts/:id")
  @UseGuards(JwtAuthGuard)
  @UsePipes(new SanitizePipe())
  @ApiOperation({ summary: "更新草稿" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  updateDraft(@Param("id") id: string, @Req() req: Request, @Body() dto: UpdateArticleDto) {
    return this.article.updateDraft(id, req.user.id, dto);
  }

  @Delete("drafts/:id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "删除草稿" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  deleteDraft(@Param("id") id: string, @Req() req: Request) {
    return this.article.deleteDraft(id, req.user.id);
  }

  @Post("drafts/:id/publish")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "发布草稿" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  publishDraft(@Param("id") id: string, @Req() req: Request) {
    return this.article.publishDraft(id, req.user.id);
  }

  // ───────── 管理端草稿管理 ─────────

  @Get("admin/drafts")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "管理端-查看所有用户草稿" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  @ApiQuery({ name: "circleId", required: false, type: String })
  listAllDrafts(
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
    @Query("circleId") circleId?: string,
  ) {
    return this.article.listAllDrafts({ page: +page, pageSize: +pageSize, circleId });
  }

  @Delete("admin/drafts/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "管理端-删除任意草稿" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  adminDeleteDraft(@Param("id") id: string) {
    return this.article.adminDeleteDraft(id);
  }

  @Post("admin/drafts/:id/publish")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "管理端-代为发布草稿" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  adminPublishDraft(@Param("id") id: string) {
    return this.article.adminPublishDraft(id);
  }
}
