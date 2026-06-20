import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, Res, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { EbookService } from "./ebook.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { SkipFormat } from "../../common/skip-format.decorator";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { MemberGuard } from "../../common/member.guard";
import {
  CreateCategoryDto, CreateEbookDto, UpdateEbookDto, EbookListQueryDto,
  CreateChapterDto, UpdateChapterDto, UpdateProgressDto,
  CreateBookmarkDto, CreateNoteDto, UpdateNoteDto, PurchaseEbookDto,
  TranslateEbookDto, LookupWordDto,
  CreateReviewDto, RecordReadingDto,
} from "./ebook.dto";

@ApiTags("电子书")
@Controller("ebook")
export class EbookController {
  constructor(private svc: EbookService) {}

  // ── 分类（公开） ──
  @Get("categories")
  @ApiOperation({ summary: "获取分类列表" })
  @ApiResponse({ status: 200, description: "成功" })
  listCategories() {
    return this.svc.listCategories();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @Post("categories")
  @ApiOperation({ summary: "创建分类" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.svc.createCategory(dto);
  }

  // ── 电子书（公开） ──
  @Get("books")
  @ApiOperation({ summary: "获取电子书列表" })
  @ApiResponse({ status: 200, description: "成功" })
  listBooks(@Query() query: EbookListQueryDto) {
    return this.svc.listBooks(query);
  }

  @Get("books/:id")
  @ApiOperation({ summary: "获取电子书详情" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getBook(@Param("id") id: string, @Req() req: Request) {
    return this.svc.getBook(id, req.user?.id);
  }

  // ── 章节（公开） ──
  @Get("chapters/:id")
  @UseGuards(JwtAuthGuard, MemberGuard)
  @ApiOperation({ summary: "获取章节内容（需会员）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  getChapter(@Param("id") id: string, @Req() req: Request) {
    return this.svc.getChapter(id, req.user?.id);
  }

  // ── 电子书管理（需管理员） ──
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @Post("books")
  @ApiOperation({ summary: "创建电子书" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  createEbook(@Body() dto: CreateEbookDto) {
    return this.svc.createEbook(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @Put("books/:id")
  @ApiOperation({ summary: "更新电子书" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  updateEbook(@Param("id") id: string, @Body() dto: UpdateEbookDto) {
    return this.svc.updateEbook(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @Delete("books/:id")
  @ApiOperation({ summary: "删除电子书" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  deleteEbook(@Param("id") id: string) {
    return this.svc.deleteEbook(id);
  }

  // ── 章节管理 ──
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @Post("books/:ebookId/chapters")
  @ApiOperation({ summary: "创建章节" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  createChapter(@Param("ebookId") ebookId: string, @Body() dto: CreateChapterDto) {
    return this.svc.createChapter(ebookId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @Put("chapters/:id")
  @ApiOperation({ summary: "更新章节" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  updateChapter(@Param("id") id: string, @Body() dto: UpdateChapterDto) {
    return this.svc.updateChapter(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @Delete("chapters/:id")
  @ApiOperation({ summary: "删除章节" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  deleteChapter(@Param("id") id: string) {
    return this.svc.deleteChapter(id);
  }

  // ── 购买 ──
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("purchase/:ebookId")
  @ApiOperation({ summary: "购买电子书" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  purchase(@Req() req: Request, @Param("ebookId") ebookId: string, @Body() _dto: PurchaseEbookDto) {
    return this.svc.purchase(req.user.id, ebookId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("purchases")
  @ApiOperation({ summary: "我的购买列表" })
  @ApiResponse({ status: 200, description: "成功" })
  getMyPurchases(@Req() req: Request, @Query("page") page?: number, @Query("pageSize") pageSize?: number) {
    return this.svc.getMyPurchases(req.user.id, page, pageSize);
  }

  // ── 阅读进度 ──
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("progress/:ebookId")
  @ApiOperation({ summary: "获取阅读进度" })
  @ApiResponse({ status: 200, description: "成功" })
  getProgress(@Req() req: Request, @Param("ebookId") ebookId: string) {
    return this.svc.getProgress(req.user.id, ebookId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put("progress/:ebookId")
  @ApiOperation({ summary: "更新阅读进度" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  updateProgress(@Req() req: Request, @Param("ebookId") ebookId: string, @Body() dto: UpdateProgressDto) {
    return this.svc.updateProgress(req.user.id, ebookId, dto);
  }

  // ── 书签 ──
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("bookmarks")
  @ApiOperation({ summary: "获取书签列表" })
  @ApiResponse({ status: 200, description: "成功" })
  listBookmarks(@Req() req: Request, @Query("ebookId") ebookId?: string, @Query("page") page?: number, @Query("pageSize") pageSize?: number) {
    return this.svc.listBookmarks(req.user.id, { ebookId, page, pageSize });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("bookmarks/:ebookId")
  @ApiOperation({ summary: "创建书签" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  createBookmark(@Req() req: Request, @Param("ebookId") ebookId: string, @Body() dto: CreateBookmarkDto) {
    return this.svc.createBookmark(req.user.id, ebookId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete("bookmarks/:id")
  @ApiOperation({ summary: "删除书签" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  deleteBookmark(@Param("id") id: string) {
    return this.svc.deleteBookmark(id);
  }

  // ── 笔记 ──
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("notes")
  @ApiOperation({ summary: "获取笔记列表" })
  @ApiResponse({ status: 200, description: "成功" })
  listNotes(@Req() req: Request, @Query("ebookId") ebookId?: string, @Query("page") page?: number, @Query("pageSize") pageSize?: number) {
    return this.svc.listNotes(req.user.id, { ebookId, page, pageSize });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("notes/:ebookId")
  @ApiOperation({ summary: "创建笔记" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  createNote(@Req() req: Request, @Param("ebookId") ebookId: string, @Body() dto: CreateNoteDto) {
    return this.svc.createNote(req.user.id, ebookId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put("notes/:id")
  @ApiOperation({ summary: "更新笔记" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  updateNote(@Param("id") id: string, @Body() dto: UpdateNoteDto) {
    return this.svc.updateNote(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete("notes/:id")
  @ApiOperation({ summary: "删除笔记" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  deleteNote(@Param("id") id: string) {
    return this.svc.deleteNote(id);
  }

  // ── AI 翻译 ──
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("translate")
  @ApiOperation({ summary: "段落AI翻译（古文→现代/外文）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  translateText(@Body() dto: TranslateEbookDto) {
    return this.svc.translateText(dto);
  }

  // ── 古文查词 ──
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("lookup")
  @ApiOperation({ summary: "古文查词（选中文本→释义）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  lookupWord(@Body() dto: LookupWordDto) {
    return this.svc.lookupWord(dto);
  }

  // ── 下载 ──
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("books/:id/download")
  @ApiOperation({ summary: "生成电子书下载链接（含DRM token）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  downloadBook(@Param("id") ebookId: string, @Req() req: Request) {
    return this.svc.generateDownloadUrl(ebookId, req.user.id);
  }

  @Get("books/:id/file")
  @SkipFormat()
  @ApiOperation({ summary: "下载电子书文件（token校验）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiQuery({ name: "token", required: true })
  async downloadFile(@Param("id") ebookId: string, @Query("token") token: string, @Res() res: any) {
    const result = await this.svc.verifyAndGetDownloadContent(ebookId, token);
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(result.title)}.txt"`);
    res.send(result.content);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("downloads")
  @ApiOperation({ summary: "我的下载记录" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "pageSize", required: false })
  getDownloads(@Req() req: Request, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.getDownloads(req.user.id, +page, +pageSize);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("downloads/:id/status")
  @ApiOperation({ summary: "下载进度查询" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getDownloadStatus(@Param("id") downloadId: string) {
    return this.svc.getDownloadStatus(downloadId);
  }

  // ── 评价 ──
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("books/:ebookId/reviews")
  @ApiOperation({ summary: "发布书评" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  createReview(@Req() req: Request, @Param("ebookId") ebookId: string, @Body() dto: CreateReviewDto) {
    return this.svc.createReview(req.user.id, ebookId, dto);
  }

  @Get("books/:ebookId/reviews")
  @ApiOperation({ summary: "获取书评列表" })
  @ApiResponse({ status: 200, description: "成功" })
  listReviews(@Param("ebookId") ebookId: string, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.listReviews(ebookId, +page, +pageSize);
  }

  @Get("books/:ebookId/rating")
  @ApiOperation({ summary: "获取评分统计" })
  @ApiResponse({ status: 200, description: "成功" })
  getEbookRating(@Param("ebookId") ebookId: string) {
    return this.svc.getEbookRating(ebookId);
  }

  // ── 阅读统计 ──
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("reading-session")
  @ApiOperation({ summary: "上报阅读时长" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  recordReadingSession(@Req() req: Request, @Body() dto: RecordReadingDto) {
    return this.svc.recordReadingSession(req.user.id, dto.ebookId, dto.duration, dto.pages);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("reading-stats")
  @ApiOperation({ summary: "我的阅读统计" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "days", required: false })
  getReadingStats(@Req() req: Request, @Query("days") days = 7) {
    return this.svc.getReadingStats(req.user.id, +days);
  }

  @Get("reading-ranking")
  @ApiOperation({ summary: "阅读排行榜" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "limit", required: false })
  getReadingRanking(@Query("limit") limit = 20) {
    return this.svc.getReadingRanking(+limit);
  }

  // ── 管理端 ──

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("admin/purchases")
  @ApiOperation({ summary: "管理端-所有购买记录" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "pageSize", required: false })
  @ApiQuery({ name: "ebookId", required: false })
  @ApiQuery({ name: "userId", required: false })
  getAdminPurchases(
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
    @Query("ebookId") ebookId?: string,
    @Query("userId") userId?: string,
  ) {
    return this.svc.getAllPurchases({ page: +page, pageSize: +pageSize, ebookId, userId });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete("admin/reviews/:id")
  @ApiOperation({ summary: "管理端-删除书评" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  deleteReview(@Param("id") id: string) {
    return this.svc.deleteReview(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("admin/reading-stats")
  @ApiOperation({ summary: "管理端-平台阅读统计概览" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "days", required: false })
  getAdminReadingStats(@Query("days") days = 30) {
    return this.svc.getPlatformReadingStats(+days);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("admin/notes")
  @ApiOperation({ summary: "管理端-所有公开笔记" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "pageSize", required: false })
  @ApiQuery({ name: "ebookId", required: false })
  getAdminNotes(
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
    @Query("ebookId") ebookId?: string,
  ) {
    return this.svc.getAllNotes({ page: +page, pageSize: +pageSize, ebookId });
  }
}
