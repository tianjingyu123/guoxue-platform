import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { ClassicImageService } from "./classic-image.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { CreateImageDto } from "./classic-image.dto";

@ApiTags("经典-原图对照")
@Controller("classic")
export class ClassicImageController {
  constructor(private imageSvc: ClassicImageService) {}

  // ── 图像（公开） ──
  @Get("books/:id/images")
  @ApiOperation({ summary: "获取书籍所有页面图像（支持分页）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "pageSize", required: false })
  listBookImages(
    @Param("id") bookId: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 100,
  ) {
    return this.imageSvc.listBookImages(bookId, +page, +pageSize);
  }

  @Get("books/:id/images/:page")
  @ApiOperation({ summary: "获取单页图像+OCR坐标数据" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getPageImage(@Param("id") bookId: string, @Param("page") page: string) {
    return this.imageSvc.getPageImage(bookId, +page);
  }

  @Get("books/:id/manifest")
  @ApiOperation({ summary: "获取 IIIF Presentation Manifest（可选文字叠加层）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getManifest(
    @Param("id") bookId: string,
    @Query("textOverlay") textOverlay?: string,
    @Req() req?: Request,
  ) {
    const baseUrl = req ? `${req.protocol}://${req.get("host")}` : "https://guoxue.local/api/v1";
    if (textOverlay === "true") {
      return this.imageSvc.generateManifestWithTextOverlay(bookId, baseUrl);
    }
    return this.imageSvc.generateManifest(bookId, baseUrl);
  }

  // ── 图文对照 ──
  @Get("chapters/:id/image-locations")
  @ApiOperation({ summary: "获取章节文字→图像位置映射（图文对照）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiQuery({ name: "page", required: false, description: "图像页码（指定单页以减少响应体积）" })
  getChapterImageMapping(@Param("id") chapterId: string, @Query("page") page?: string) {
    return this.imageSvc.getChapterImageMapping(chapterId, page ? +page : undefined);
  }

  @Get("books/:id/ocr-search")
  @ApiOperation({ summary: "全文搜索OCR文本坐标" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiQuery({ name: "keyword", required: true, description: "搜索关键词" })
  searchOcrText(@Param("id") bookId: string, @Query("keyword") keyword: string) {
    return this.imageSvc.searchOcrText(bookId, keyword);
  }

  // ── 图像管理（需登录） ──
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("books/:id/images")
  @ApiOperation({ summary: "添加书籍图像记录" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  createImage(@Param("id") bookId: string, @Body() dto: CreateImageDto) {
    return this.imageSvc.createImage(bookId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put("images/:id")
  @ApiOperation({ summary: "更新图像记录" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  updateImage(@Param("id") id: string, @Body() dto: CreateImageDto) {
    return this.imageSvc.updateImage(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete("images/:id")
  @ApiOperation({ summary: "删除图像记录" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  deleteImage(@Param("id") id: string) {
    return this.imageSvc.deleteImage(id);
  }
}
