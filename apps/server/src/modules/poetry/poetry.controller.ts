import { Controller, Get, Post, Put, Delete, Param, Query, Body, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Request } from "express";
import { PoetryService } from "./poetry.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { OptionalAuthGuard } from "../../common/optional-auth.guard";
import { ThrottleGuard } from "../../common/throttle.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import {
  CategoryDto,
  CollectionItemDto,
  HomeResponseDto,
  PoemDetailResponseDto,
  PoemItemDto,
  PoetDetailResponseDto,
  LikeResultDto,
  CollectResultDto,
  AskPoemDto,
  AppreciationResultDto,
  CreatePoemCommentDto,
  PoemCommentDto,
  CommentLikeResultDto,
} from "./poetry.dto";
import { Auditable } from "../../common/audit.decorator";

@ApiTags("诗词雅集")
@Controller("poetry")
export class PoetryController {
  constructor(private readonly poetry: PoetryService) {}

  @Get("home")
  @ApiOperation({ summary: "诗词首页", description: "返回每日一首 + 热门诗词 + 热门诗人" })
  @ApiResponse({ status: 200, type: HomeResponseDto })
  getHome(): Promise<HomeResponseDto> {
    return this.poetry.getHome();
  }

  @Get("categories")
  @ApiOperation({ summary: "诗词分类列表", description: "返回全部诗词分类及作品数量" })
  @ApiResponse({ status: 200, type: [CategoryDto] })
  getCategories(): Promise<CategoryDto[]> {
    return this.poetry.getCategories();
  }

  @Get("collections")
  @ApiOperation({ summary: "诗词合集列表", description: "返回已发布的诗词合集/收藏集" })
  @ApiResponse({ status: 200, type: [CollectionItemDto] })
  getCollections(): Promise<CollectionItemDto[]> {
    return this.poetry.getCollections();
  }

  // 注意：以下静态/多段路由必须声明在通配 @Get(":id") 之前，否则会被当作诗词ID

  @Get("search")
  @ApiOperation({ summary: "搜索诗词", description: "按标题/作者/正文模糊搜索" })
  @ApiQuery({ name: "keyword", required: true, description: "关键词" })
  @ApiResponse({ status: 200, type: [PoemItemDto] })
  search(@Query("keyword") keyword: string): Promise<PoemItemDto[]> {
    return this.poetry.search(keyword);
  }

  @Get("poet/:name")
  @ApiOperation({ summary: "诗人详情", description: "按作者聚合该诗人的小传与作品列表" })
  @ApiParam({ name: "name", description: "诗人姓名" })
  @ApiResponse({ status: 200, type: PoetDetailResponseDto })
  getPoet(@Param("name") name: string): Promise<PoetDetailResponseDto> {
    return this.poetry.getPoet(decodeURIComponent(name));
  }

  // ── 互动写操作（需登录） ──

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(":id/like")
  @ApiOperation({ summary: "点赞/取消点赞诗词" })
  @ApiResponse({ status: 201, type: LikeResultDto })
  toggleLike(@Req() req: Request, @Param("id") id: string): Promise<LikeResultDto> {
    return this.poetry.toggleLike(req.user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(":id/collect")
  @ApiOperation({ summary: "收藏/取消收藏诗词" })
  @ApiResponse({ status: 201, type: CollectResultDto })
  toggleCollect(@Req() req: Request, @Param("id") id: string): Promise<CollectResultDto> {
    return this.poetry.toggleCollect(req.user.id, id);
  }

  @UseGuards(JwtAuthGuard, ThrottleGuard)
  @ApiBearerAuth()
  @Post(":id/ai-appreciation")
  @ApiOperation({ summary: "AI 实时深度赏析（需登录）" })
  @ApiResponse({ status: 201, type: AppreciationResultDto })
  appreciate(@Param("id") id: string, @Body() dto: AskPoemDto): Promise<AppreciationResultDto> {
    return this.poetry.appreciate(id, dto.question);
  }

  // ── 诗词品评（评论） ──

  @UseGuards(OptionalAuthGuard)
  @Get(":id/comments")
  @ApiOperation({ summary: "诗词品评列表", description: "登录时附带当前用户的点赞/归属标记" })
  @ApiResponse({ status: 200, type: [PoemCommentDto] })
  listComments(@Req() req: Request, @Param("id") id: string): Promise<PoemCommentDto[]> {
    return this.poetry.listComments(id, req.user?.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(":id/comments")
  @ApiOperation({ summary: "发表诗词品评（需登录）" })
  @ApiResponse({ status: 201, type: PoemCommentDto })
  createComment(@Req() req: Request, @Param("id") id: string, @Body() dto: CreatePoemCommentDto): Promise<PoemCommentDto> {
    return this.poetry.createComment(req.user.id, id, dto.content, dto.parentId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("comments/:commentId/like")
  @ApiOperation({ summary: "点赞/取消点赞品评（需登录）" })
  @ApiResponse({ status: 201, type: CommentLikeResultDto })
  likeComment(@Req() req: Request, @Param("commentId") commentId: string): Promise<CommentLikeResultDto> {
    return this.poetry.likeComment(req.user.id, commentId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete("comments/:commentId")
  @ApiOperation({ summary: "删除自己的品评（需登录）" })
  @ApiResponse({ status: 200, description: "删除成功" })
  deleteComment(@Req() req: Request, @Param("commentId") commentId: string): Promise<{ success: boolean }> {
    return this.poetry.deleteComment(req.user.id, commentId);
  }

  // ── 管理端 CRUD（需 SUPER_ADMIN/OPERATION_ADMIN，须声明在通配 :id 之前） ──

  @Get("admin/poems")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "管理端诗词列表（分页+筛选）" })
  adminListPoems(
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("status") status?: string,
    @Query("categoryId") categoryId?: string,
    @Query("dynasty") dynasty?: string,
    @Query("keyword") keyword?: string,
  ) {
    return this.poetry.adminListPoems({ page: page ? +page : 1, pageSize: pageSize ? +pageSize : 20, status, categoryId, dynasty, keyword });
  }

  @Post("admin/poems")
  @Auditable({ action: "新建诗词", targetType: "POETRY" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "新建诗词" })
  adminCreatePoem(@Body() dto: any) {
    return this.poetry.adminCreatePoem(dto);
  }

  @Put("admin/poems/:id")
  @Auditable({ action: "编辑诗词", targetType: "POETRY" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "编辑诗词" })
  adminUpdatePoem(@Param("id") id: string, @Body() dto: any) {
    return this.poetry.adminUpdatePoem(id, dto);
  }

  @Delete("admin/poems/:id")
  @Auditable({ action: "删除诗词", targetType: "POETRY" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "删除诗词" })
  adminDeletePoem(@Param("id") id: string) {
    return this.poetry.adminDeletePoem(id);
  }

  @Get("admin/categories")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "管理端分类列表（含作品数）" })
  adminListCategories() {
    return this.poetry.adminListCategories();
  }

  @Post("admin/categories")
  @Auditable({ action: "新建诗词分类", targetType: "POETRY" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "新建诗词分类" })
  adminCreateCategory(@Body() dto: any) {
    return this.poetry.adminCreateCategory(dto);
  }

  @Put("admin/categories/:id")
  @Auditable({ action: "编辑诗词分类", targetType: "POETRY" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "编辑诗词分类" })
  adminUpdateCategory(@Param("id") id: string, @Body() dto: any) {
    return this.poetry.adminUpdateCategory(id, dto);
  }

  @Delete("admin/categories/:id")
  @Auditable({ action: "删除诗词分类", targetType: "POETRY" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "删除诗词分类" })
  adminDeleteCategory(@Param("id") id: string) {
    return this.poetry.adminDeleteCategory(id);
  }

  @Get("admin/collections")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "管理端诗单/合集列表" })
  adminListCollections(
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("status") status?: string,
  ) {
    return this.poetry.adminListCollections({ page: page ? +page : 1, pageSize: pageSize ? +pageSize : 20, status });
  }

  @Post("admin/collections")
  @Auditable({ action: "新建诗单", targetType: "POETRY" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "新建诗单/合集" })
  adminCreateCollection(@Body() dto: any) {
    return this.poetry.adminCreateCollection(dto);
  }

  @Put("admin/collections/:id")
  @Auditable({ action: "编辑诗单", targetType: "POETRY" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "编辑诗单/合集" })
  adminUpdateCollection(@Param("id") id: string, @Body() dto: any) {
    return this.poetry.adminUpdateCollection(id, dto);
  }

  @Delete("admin/collections/:id")
  @Auditable({ action: "删除诗单", targetType: "POETRY" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "删除诗单/合集" })
  adminDeleteCollection(@Param("id") id: string) {
    return this.poetry.adminDeleteCollection(id);
  }

  // ── 详情（通配，必须最后） ──

  @UseGuards(OptionalAuthGuard)
  @Get(":id")
  @ApiOperation({ summary: "诗词详情", description: "返回诗词正文、赏析、注释、相关诗词及逐句译文；登录时附带点赞/收藏状态" })
  @ApiParam({ name: "id", description: "诗词ID" })
  @ApiResponse({ status: 200, type: PoemDetailResponseDto })
  getDetail(@Req() req: Request, @Param("id") id: string): Promise<PoemDetailResponseDto> {
    return this.poetry.getDetail(id, req.user?.id);
  }
}
