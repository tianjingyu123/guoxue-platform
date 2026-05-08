import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { ClassicService } from "./classic.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { CreateBookDto, UpdateBookDto, CreateChapterDto, UpdateChapterDto, UpdateProgressDto, CreateBookmarkDto, BookListQueryDto } from "./classic.dto";

@ApiTags("经典")
@Controller("classic")
export class ClassicController {
  constructor(private svc: ClassicService) {}

  // ── 书籍（公开） ──
  @Get("books")
  @ApiOperation({ summary: "获取书籍列表" })
  listBooks(@Query() query: BookListQueryDto) {
    return this.svc.listBooks(query);
  }

  @Get("books/:id")
  @ApiOperation({ summary: "获取书籍详情" })
  getBook(@Param("id") id: string) {
    return this.svc.getBook(id);
  }

  // ── 章节（公开） ──
  @Get("chapters/:id")
  @ApiOperation({ summary: "获取章节内容" })
  getChapter(@Param("id") id: string) {
    return this.svc.getChapter(id);
  }

  // ── 书籍管理（需登录） ──
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("books")
  @ApiOperation({ summary: "创建书籍" })
  createBook(@Body() dto: CreateBookDto) {
    return this.svc.createBook(dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put("books/:id")
  @ApiOperation({ summary: "更新书籍" })
  updateBook(@Param("id") id: string, @Body() dto: UpdateBookDto) {
    return this.svc.updateBook(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete("books/:id")
  @ApiOperation({ summary: "删除书籍" })
  deleteBook(@Param("id") id: string) {
    return this.svc.deleteBook(id);
  }

  // ── 章节管理 ──
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("books/:bookId/chapters")
  @ApiOperation({ summary: "创建章节" })
  createChapter(@Param("bookId") bookId: string, @Body() dto: CreateChapterDto) {
    return this.svc.createChapter(bookId, dto);
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

  // ── 阅读进度 ──
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("progress/:bookId")
  @ApiOperation({ summary: "获取阅读进度" })
  getProgress(@Req() req: any, @Param("bookId") bookId: string) {
    return this.svc.getProgress(req.user.id, bookId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put("progress/:bookId")
  @ApiOperation({ summary: "更新阅读进度" })
  updateProgress(@Req() req: any, @Param("bookId") bookId: string, @Body() dto: UpdateProgressDto) {
    return this.svc.updateProgress(req.user.id, bookId, dto);
  }

  // ── 书签 ──
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("bookmarks")
  @ApiOperation({ summary: "获取书签列表" })
  @ApiQuery({ name: "bookId", required: false, type: String, description: "书籍ID" })
  listBookmarks(@Req() req: any, @Query("bookId") bookId?: string) {
    return this.svc.listBookmarks(req.user.id, bookId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("bookmarks/:bookId")
  @ApiOperation({ summary: "创建书签" })
  createBookmark(@Req() req: any, @Param("bookId") bookId: string, @Body() dto: CreateBookmarkDto) {
    return this.svc.createBookmark(req.user.id, bookId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete("bookmarks/:id")
  @ApiOperation({ summary: "删除书签" })
  deleteBookmark(@Param("id") id: string) {
    return this.svc.deleteBookmark(id);
  }
}
