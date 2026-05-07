import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ClassicService } from "./classic.service";
import { AuthGuard } from "@nestjs/passport";
import { CreateBookDto, UpdateBookDto, CreateChapterDto, UpdateChapterDto, UpdateProgressDto, CreateBookmarkDto, BookListQueryDto } from "./classic.dto";

@Controller("classic")
export class ClassicController {
  constructor(private svc: ClassicService) {}

  // ── 书籍（公开） ──
  @Get("books")
  listBooks(@Query() query: BookListQueryDto) {
    return this.svc.listBooks(query);
  }

  @Get("books/:id")
  getBook(@Param("id") id: string) {
    return this.svc.getBook(id);
  }

  // ── 章节（公开） ──
  @Get("chapters/:id")
  getChapter(@Param("id") id: string) {
    return this.svc.getChapter(id);
  }

  // ── 书籍管理（需登录） ──
  @UseGuards(AuthGuard("jwt"))
  @Post("books")
  createBook(@Body() dto: CreateBookDto) {
    return this.svc.createBook(dto);
  }

  @UseGuards(AuthGuard("jwt"))
  @Put("books/:id")
  updateBook(@Param("id") id: string, @Body() dto: UpdateBookDto) {
    return this.svc.updateBook(id, dto);
  }

  @UseGuards(AuthGuard("jwt"))
  @Delete("books/:id")
  deleteBook(@Param("id") id: string) {
    return this.svc.deleteBook(id);
  }

  // ── 章节管理 ──
  @UseGuards(AuthGuard("jwt"))
  @Post("books/:bookId/chapters")
  createChapter(@Param("bookId") bookId: string, @Body() dto: CreateChapterDto) {
    return this.svc.createChapter(bookId, dto);
  }

  @UseGuards(AuthGuard("jwt"))
  @Put("chapters/:id")
  updateChapter(@Param("id") id: string, @Body() dto: UpdateChapterDto) {
    return this.svc.updateChapter(id, dto);
  }

  @UseGuards(AuthGuard("jwt"))
  @Delete("chapters/:id")
  deleteChapter(@Param("id") id: string) {
    return this.svc.deleteChapter(id);
  }

  // ── 阅读进度 ──
  @UseGuards(AuthGuard("jwt"))
  @Get("progress/:bookId")
  getProgress(@Req() req: any, @Param("bookId") bookId: string) {
    return this.svc.getProgress(req.user.id, bookId);
  }

  @UseGuards(AuthGuard("jwt"))
  @Put("progress/:bookId")
  updateProgress(@Req() req: any, @Param("bookId") bookId: string, @Body() dto: UpdateProgressDto) {
    return this.svc.updateProgress(req.user.id, bookId, dto);
  }

  // ── 书签 ──
  @UseGuards(AuthGuard("jwt"))
  @Get("bookmarks")
  listBookmarks(@Req() req: any, @Query("bookId") bookId?: string) {
    return this.svc.listBookmarks(req.user.id, bookId);
  }

  @UseGuards(AuthGuard("jwt"))
  @Post("bookmarks/:bookId")
  createBookmark(@Req() req: any, @Param("bookId") bookId: string, @Body() dto: CreateBookmarkDto) {
    return this.svc.createBookmark(req.user.id, bookId, dto);
  }

  @UseGuards(AuthGuard("jwt"))
  @Delete("bookmarks/:id")
  deleteBookmark(@Param("id") id: string) {
    return this.svc.deleteBookmark(id);
  }
}
