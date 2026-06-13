import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, Req, Res, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { ClassicService } from "./classic.service";
import { ClassicLibrarySeeder } from "./classic-library-seeder.service";
import { ClassicDaizhigeSeeder } from "./classic-daizhige-seeder.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { ThrottleGuard } from "../../common/throttle.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { CreateBookDto, UpdateBookDto, CreateChapterDto, UpdateChapterDto, UpdateProgressDto, CreateBookmarkDto, UpdateBookmarkDto, BookListQueryDto, DictionaryLookupDto, TranslateDto, ContinueReadingQueryDto, CreateAnnotationDto, CreateNoteDto, UpdateNoteDto } from "./classic.dto";

@ApiTags("经典")
@Controller("classic")
export class ClassicController {
  constructor(
    private svc: ClassicService,
    private seeder: ClassicLibrarySeeder,
    private daizhigeSeeder: ClassicDaizhigeSeeder,
  ) {}

  // ── 书籍（公开） ──
  @Get("books")
  @ApiOperation({ summary: "获取书籍列表（支持多维度排序）" })
  @ApiResponse({ status: 200, description: "成功" })
  listBooks(@Query() query: BookListQueryDto) {
    return this.svc.listBooks(query);
  }

  @Get("books/:id")
  @ApiOperation({ summary: "获取书籍详情" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getBook(@Param("id") id: string) {
    return this.svc.getBook(id);
  }

  // ── 章节（公开） ──
  @Get("chapters/:id")
  @ApiOperation({ summary: "获取章节内容" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getChapter(@Param("id") id: string) {
    return this.svc.getChapter(id);
  }

  @Get("chapters/:id/content")
  @ApiOperation({ summary: "按字符范围获取章节内容片段（长文本分段加载）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiQuery({ name: "start", required: false, type: Number, description: "起始字符位置" })
  @ApiQuery({ name: "end", required: false, type: Number, description: "结束字符位置" })
  getChapterContentSlice(
    @Param("id") id: string,
    @Query("start") start?: string,
    @Query("end") end?: string,
  ) {
    return this.svc.getChapterContentSlice(id, start ? +start : 0, end ? +end : 2000);
  }

  // ── 书籍管理（需管理员） ──
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @Post("books")
  @ApiOperation({ summary: "创建书籍" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  createBook(@Body() dto: CreateBookDto) {
    return this.svc.createBook(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @Put("books/:id")
  @ApiOperation({ summary: "更新书籍" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  updateBook(@Param("id") id: string, @Body() dto: UpdateBookDto) {
    return this.svc.updateBook(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @Delete("books/:id")
  @ApiOperation({ summary: "删除书籍" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  deleteBook(@Param("id") id: string) {
    return this.svc.deleteBook(id);
  }

  // ── 章节管理 ──
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("books/:bookId/chapters")
  @ApiOperation({ summary: "获取书籍章节列表" })
  @ApiResponse({ status: 200, description: "成功" })
  listChaptersByBook(@Param("bookId") bookId: string) {
    return this.svc.listChaptersByBook(bookId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @Post("books/:bookId/chapters")
  @ApiOperation({ summary: "创建章节" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  createChapter(@Param("bookId") bookId: string, @Body() dto: CreateChapterDto) {
    return this.svc.createChapter(bookId, dto);
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

  // ── 阅读进度 ──
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("my-progress")
  @ApiOperation({ summary: "获取我的所有阅读进度" })
  @ApiResponse({ status: 200, description: "成功" })
  getMyProgresses(@Req() req: Request) {
    return this.svc.getMyProgresses(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("progress/:bookId")
  @ApiOperation({ summary: "获取阅读进度" })
  @ApiResponse({ status: 200, description: "成功" })
  getProgress(@Req() req: Request, @Param("bookId") bookId: string) {
    return this.svc.getProgress(req.user.id, bookId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put("progress/:bookId")
  @ApiOperation({ summary: "更新阅读进度" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  updateProgress(@Req() req: Request, @Param("bookId") bookId: string, @Body() dto: UpdateProgressDto) {
    return this.svc.updateProgress(req.user.id, bookId, dto);
  }

  // ── 书签 ──
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("bookmarks")
  @ApiOperation({ summary: "获取书签列表（分页）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "bookId", required: false, type: String, description: "书籍ID" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页数量" })
  listBookmarks(
    @Req() req: Request,
    @Query("bookId") bookId?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.listBookmarks(req.user.id, bookId, +page, +pageSize);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("bookmarks/:bookId")
  @ApiOperation({ summary: "创建书签" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  createBookmark(@Req() req: Request, @Param("bookId") bookId: string, @Body() dto: CreateBookmarkDto) {
    return this.svc.createBookmark(req.user.id, bookId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put("bookmarks/:id")
  @ApiOperation({ summary: "更新书签（位置/笔记）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  updateBookmark(@Param("id") id: string, @Req() req: Request, @Body() dto: UpdateBookmarkDto) {
    return this.svc.updateBookmark(id, req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete("bookmarks/:id")
  @ApiOperation({ summary: "删除书签" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  deleteBookmark(@Param("id") id: string, @Req() req: Request) {
    return this.svc.deleteBookmark(id, req.user?.id);
  }

  // ── 下载 ──
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("books/:id/download")
  @ApiOperation({ summary: "生成古籍下载链接（含DRM token）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  downloadBook(@Param("id") bookId: string, @Req() req: Request) {
    return this.svc.generateDownloadUrl(bookId, req.user.id);
  }

  @Get("books/:id/file")
  @ApiOperation({ summary: "下载古籍文件（token校验）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiQuery({ name: "token", required: true })
  async downloadFile(@Param("id") bookId: string, @Query("token") token: string, @Res() res: any) {
    const result = await this.svc.verifyAndGetDownloadContent(bookId, token);
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

  // ── 字典查询 ──
  @UseGuards(JwtAuthGuard, ThrottleGuard)
  @ApiBearerAuth()
  @Post("dictionary/lookup")
  @ApiOperation({ summary: "古籍字典查询（AI，需登录）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async dictionaryLookup(@Body() dto: DictionaryLookupDto) {
    return this.svc.dictionaryLookup(dto.word);
  }

  // ── 白话翻译 ──
  @UseGuards(JwtAuthGuard, ThrottleGuard)
  @ApiBearerAuth()
  @Post("translate")
  @ApiOperation({ summary: "文言→白话翻译（AI，需登录）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async translate(@Body() dto: TranslateDto) {
    return this.svc.translateClassical(dto);
  }

  // ── 继续阅读 ──
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("continue-reading")
  @ApiOperation({ summary: "获取继续阅读列表" })
  @ApiResponse({ status: 200, description: "成功" })
  async getContinueReading(@Req() req: Request, @Query() query: ContinueReadingQueryDto) {
    return this.svc.getContinueReading(req.user.id, query.limit || 10);
  }

  // ── 阅读统计 ──
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("reading-stats")
  @ApiOperation({ summary: "获取阅读统计" })
  @ApiResponse({ status: 200, description: "成功" })
  async getReadingStats(@Req() req: Request) {
    return this.svc.getReadingStats(req.user.id);
  }

  // ── 经典原文库种子管理 ──
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiBearerAuth()
  @Post("admin/seed")
  @ApiOperation({ summary: "初始化经典原文库种子数据（幂等，仅超级管理员）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async seedLibrary() {
    return this.seeder.seed();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiBearerAuth()
  @Post("admin/sync-knowledge")
  @ApiOperation({ summary: "同步经典章节到知识库（分块入库，仅超级管理员）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async syncToKnowledge() {
    const synced = await this.seeder.syncToKnowledge();
    return { synced };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiBearerAuth()
  @Post("admin/vectorize")
  @ApiOperation({ summary: "向量化未索引的知识条目（仅超级管理员）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async vectorizeUnindexed() {
    const count = await this.seeder.vectorizeUnindexed(50);
    return { vectorized: count };
  }

  // ── 读书笔记 ──
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("notes")
  @ApiOperation({ summary: "获取我的读书笔记" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "bookId", required: false })
  @ApiQuery({ name: "chapterId", required: false })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "pageSize", required: false })
  listMyNotes(
    @Req() req: Request,
    @Query("bookId") bookId?: string,
    @Query("chapterId") chapterId?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.listMyNotes(req.user.id, bookId, chapterId, +page, +pageSize);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("notes/:bookId")
  @ApiOperation({ summary: "创建读书笔记" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  createNote(@Req() req: Request, @Param("bookId") bookId: string, @Body() dto: CreateNoteDto) {
    return this.svc.createNote(req.user.id, bookId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put("notes/:id")
  @ApiOperation({ summary: "更新读书笔记" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  updateNote(@Req() req: Request, @Param("id") id: string, @Body() dto: UpdateNoteDto) {
    return this.svc.updateNote(id, req.user.id, dto.content);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete("notes/:id")
  @ApiOperation({ summary: "删除读书笔记" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  deleteNote(@Req() req: Request, @Param("id") id: string) {
    return this.svc.deleteNote(id, req.user.id);
  }

  // ── 注疏标记 ──
  @Get("books/:id/annotations")
  @ApiOperation({ summary: "获取书籍注疏/批注标记" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiQuery({ name: "chapterId", required: false })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "pageSize", required: false })
  listAnnotations(
    @Param("id") bookId: string,
    @Query("chapterId") chapterId?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.listAnnotations(bookId, chapterId, +page, +pageSize);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @Post("annotations")
  @ApiOperation({ summary: "创建注疏标记（管理员）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  createAnnotation(@Body() dto: CreateAnnotationDto) {
    return this.svc.createAnnotation(dto.bookId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @Delete("annotations/:id")
  @ApiOperation({ summary: "删除注疏标记（管理员）" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  deleteAnnotation(@Param("id") id: string) {
    return this.svc.deleteAnnotation(id);
  }

  // ── 版本管理 ──
  @Get("books/:id/versions")
  @ApiOperation({ summary: "获取同书其他版本" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getBookVersions(@Param("id") bookId: string) {
    return this.svc.getBookVersions(bookId);
  }

  @Get("books/:id/cite")
  @ApiOperation({ summary: "生成古籍引用（支持 GB/T 7714/Chicago/MLA/APA）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiQuery({ name: "style", required: false, type: String, description: "引用格式：gbt7714/chicago/mla/apa/all" })
  @ApiQuery({ name: "chapterId", required: false })
  @ApiQuery({ name: "startPos", required: false, type: Number })
  @ApiQuery({ name: "endPos", required: false, type: Number })
  getCitation(
    @Param("id") bookId: string,
    @Query("style") style?: string,
    @Query("chapterId") chapterId?: string,
    @Query("startPos") startPos?: string,
    @Query("endPos") endPos?: string,
  ) {
    return this.svc.generateCitation(
      bookId, style || "gbt7714",
      chapterId,
      startPos ? +startPos : undefined,
      endPos ? +endPos : undefined,
    );
  }

  // ── 管理端工具 ──
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @Get("admin/stats")
  @ApiOperation({ summary: "管理仪表盘统计（书籍/章节/图像/注解概览）" })
  @ApiResponse({ status: 200, description: "成功" })
  getAdminStats() {
    return this.svc.getAdminStats();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiBearerAuth()
  @Post("admin/clear-cache")
  @ApiOperation({ summary: "清除经典模块 Redis 缓存（书籍列表+章节内容）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  clearCache() {
    return this.svc.clearCache();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @Patch("books/:id/status")
  @ApiOperation({ summary: "切换书籍发布状态（DRAFT/PUBLISHED）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiQuery({ name: "status", required: true, type: String, description: "目标状态" })
  setBookStatus(@Param("id") id: string, @Query("status") status: string) {
    return this.svc.setBookStatus(id, status);
  }

  // ── 管理端笔记/书签/阅读数据 ──

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @Get("admin/notes")
  @ApiOperation({ summary: "管理端-所有读书笔记" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "bookId", required: false })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "pageSize", required: false })
  getAllNotes(
    @Query("bookId") bookId?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.getAllNotes({ bookId, page: +page, pageSize: +pageSize });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @Get("admin/bookmarks")
  @ApiOperation({ summary: "管理端-所有书签" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "bookId", required: false })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "pageSize", required: false })
  getAllBookmarks(
    @Query("bookId") bookId?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.getAllBookmarks({ bookId, page: +page, pageSize: +pageSize });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @Get("admin/reading-stats")
  @ApiOperation({ summary: "管理端-平台阅读统计概览" })
  @ApiResponse({ status: 200, description: "成功" })
  getPlatformReadingStats() {
    return this.svc.getPlatformReadingStats();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @Delete("admin/notes/:id")
  @ApiOperation({ summary: "管理端-删除任意笔记" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  adminDeleteNote(@Param("id") id: string) {
    return this.svc.adminDeleteNote(id);
  }

  // ── 殆知阁古籍批量导入 ──
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiBearerAuth()
  @Get("admin/daizhige-stats")
  @ApiOperation({ summary: "查看殆知阁种子文件统计（仅超级管理员）" })
  @ApiResponse({ status: 200, description: "成功" })
  daizhigeStats() {
    return this.daizhigeSeeder.getSeedStats();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiBearerAuth()
  @Post("admin/daizhige-import")
  @ApiOperation({ summary: "从殆知阁种子文件批量导入古籍（仅超级管理员）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiQuery({ name: "max", required: false, type: Number, description: "最大导入数量" })
  @ApiQuery({ name: "category", required: false, type: String, description: "分类筛选" })
  async daizhigeImport(@Query("max") max?: string, @Query("category") category?: string) {
    return this.daizhigeSeeder.importFromJson({
      maxBooks: max ? parseInt(max) : undefined,
      categoryFilter: category,
    });
  }
}
