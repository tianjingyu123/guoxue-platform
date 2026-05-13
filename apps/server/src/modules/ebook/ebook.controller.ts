import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { EbookService } from "./ebook.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import {
  CreateCategoryDto, CreateEbookDto, UpdateEbookDto, EbookListQueryDto,
  CreateChapterDto, UpdateChapterDto, UpdateProgressDto,
  CreateBookmarkDto, CreateNoteDto, UpdateNoteDto, PurchaseEbookDto,
  TranslateEbookDto, LookupWordDto,
} from "./ebook.dto";

@ApiTags("电子书")
@Controller("ebook")
export class EbookController {
  constructor(private svc: EbookService) {}

  // ── 分类（公开） ──
  @Get("categories")
  @ApiOperation({ summary: "获取分类列表" })
  listCategories() {
    return this.svc.listCategories();
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("categories")
  @ApiOperation({ summary: "创建分类" })
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.svc.createCategory(dto);
  }

  // ── 电子书（公开） ──
  @Get("books")
  @ApiOperation({ summary: "获取电子书列表" })
  listBooks(@Query() query: EbookListQueryDto) {
    return this.svc.listBooks(query);
  }

  @Get("books/:id")
  @ApiOperation({ summary: "获取电子书详情" })
  getBook(@Param("id") id: string, @Req() req: Request) {
    return this.svc.getBook(id, req.user?.id);
  }

  // ── 章节（公开） ──
  @Get("chapters/:id")
  @ApiOperation({ summary: "获取章节内容" })
  getChapter(@Param("id") id: string, @Req() req: Request) {
    return this.svc.getChapter(id, req.user?.id);
  }

  // ── 电子书管理（需登录） ──
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("books")
  @ApiOperation({ summary: "创建电子书" })
  createEbook(@Body() dto: CreateEbookDto) {
    return this.svc.createEbook(dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put("books/:id")
  @ApiOperation({ summary: "更新电子书" })
  updateEbook(@Param("id") id: string, @Body() dto: UpdateEbookDto) {
    return this.svc.updateEbook(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete("books/:id")
  @ApiOperation({ summary: "删除电子书" })
  deleteEbook(@Param("id") id: string) {
    return this.svc.deleteEbook(id);
  }

  // ── 章节管理 ──
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("books/:ebookId/chapters")
  @ApiOperation({ summary: "创建章节" })
  createChapter(@Param("ebookId") ebookId: string, @Body() dto: CreateChapterDto) {
    return this.svc.createChapter(ebookId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put("chapters/:id")
  @ApiOperation({ summary: "更新章节" })
  updateChapter(@Param("id") id: string, @Body() dto: UpdateChapterDto) {
    return this.svc.updateChapter(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete("chapters/:id")
  @ApiOperation({ summary: "删除章节" })
  deleteChapter(@Param("id") id: string) {
    return this.svc.deleteChapter(id);
  }

  // ── 购买 ──
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("purchase/:ebookId")
  @ApiOperation({ summary: "购买电子书" })
  purchase(@Req() req: Request, @Param("ebookId") ebookId: string, @Body() _dto: PurchaseEbookDto) {
    return this.svc.purchase(req.user.id, ebookId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("purchases")
  @ApiOperation({ summary: "我的购买列表" })
  getMyPurchases(@Req() req: Request, @Query("page") page?: number, @Query("pageSize") pageSize?: number) {
    return this.svc.getMyPurchases(req.user.id, page, pageSize);
  }

  // ── 阅读进度 ──
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("progress/:ebookId")
  @ApiOperation({ summary: "获取阅读进度" })
  getProgress(@Req() req: Request, @Param("ebookId") ebookId: string) {
    return this.svc.getProgress(req.user.id, ebookId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put("progress/:ebookId")
  @ApiOperation({ summary: "更新阅读进度" })
  updateProgress(@Req() req: Request, @Param("ebookId") ebookId: string, @Body() dto: UpdateProgressDto) {
    return this.svc.updateProgress(req.user.id, ebookId, dto);
  }

  // ── 书签 ──
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("bookmarks")
  @ApiOperation({ summary: "获取书签列表" })
  listBookmarks(@Req() req: Request, @Query("ebookId") ebookId?: string, @Query("page") page?: number, @Query("pageSize") pageSize?: number) {
    return this.svc.listBookmarks(req.user.id, { ebookId, page, pageSize });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("bookmarks/:ebookId")
  @ApiOperation({ summary: "创建书签" })
  createBookmark(@Req() req: Request, @Param("ebookId") ebookId: string, @Body() dto: CreateBookmarkDto) {
    return this.svc.createBookmark(req.user.id, ebookId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete("bookmarks/:id")
  @ApiOperation({ summary: "删除书签" })
  deleteBookmark(@Param("id") id: string) {
    return this.svc.deleteBookmark(id);
  }

  // ── 笔记 ──
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("notes")
  @ApiOperation({ summary: "获取笔记列表" })
  listNotes(@Req() req: Request, @Query("ebookId") ebookId?: string, @Query("page") page?: number, @Query("pageSize") pageSize?: number) {
    return this.svc.listNotes(req.user.id, { ebookId, page, pageSize });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("notes/:ebookId")
  @ApiOperation({ summary: "创建笔记" })
  createNote(@Req() req: Request, @Param("ebookId") ebookId: string, @Body() dto: CreateNoteDto) {
    return this.svc.createNote(req.user.id, ebookId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put("notes/:id")
  @ApiOperation({ summary: "更新笔记" })
  updateNote(@Param("id") id: string, @Body() dto: UpdateNoteDto) {
    return this.svc.updateNote(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete("notes/:id")
  @ApiOperation({ summary: "删除笔记" })
  deleteNote(@Param("id") id: string) {
    return this.svc.deleteNote(id);
  }

  // ── AI 翻译 ──
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("translate")
  @ApiOperation({ summary: "段落AI翻译（古文→现代/外文）" })
  translateText(@Body() dto: TranslateEbookDto) {
    return this.svc.translateText(dto);
  }

  // ── 古文查词 ──
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("lookup")
  @ApiOperation({ summary: "古文查词（选中文本→释义）" })
  lookupWord(@Body() dto: LookupWordDto) {
    return this.svc.lookupWord(dto);
  }
}
