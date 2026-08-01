import {
  Controller, Post, Delete, UseGuards, UseInterceptors,
  UploadedFile, UploadedFiles, BadRequestException, Param,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { UploadService } from "./upload.service";

@ApiTags("文件上传")
@ApiBearerAuth()
@Controller("upload")
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post("image")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "上传图片（单文件，最大10MB）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        // 禁止 SVG（可含XSS）和 HTML 伪装成图片
        if (!file.mimetype.startsWith("image/") || file.mimetype.includes("svg")) {
          cb(new BadRequestException("仅支持图片文件（JPEG/PNG/GIF/WebP）"), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    this.uploadService.validateImage(file);
    return this.uploadService.upload(file);
  }

  @Post("images")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "批量上传图片（最多9张）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @UseInterceptors(
    FilesInterceptor("files", 9, {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        // 禁止 SVG（可含XSS）和 HTML 伪装成图片
        if (!file.mimetype.startsWith("image/") || file.mimetype.includes("svg")) {
          cb(new BadRequestException("仅支持图片文件（JPEG/PNG/GIF/WebP）"), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async uploadImages(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) throw new BadRequestException("未选择文件");
    return this.uploadService.uploadMany(files);
  }

  @Post("audio")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "上传音频（最大50MB）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith("audio/")) {
          cb(new BadRequestException("仅支持音频文件"), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async uploadAudio(@UploadedFile() file: Express.Multer.File) {
    this.uploadService.validateAudio(file);
    return this.uploadService.upload(file);
  }

  @Post("video")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "上传视频（最大200MB）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 200 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith("video/")) {
          cb(new BadRequestException("仅支持视频文件"), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async uploadVideo(@UploadedFile() file: Express.Multer.File) {
    this.uploadService.validateVideo(file);
    return this.uploadService.upload(file);
  }

  @Post("file")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "上传文档附件（PDF/Word/Excel/PPT/TXT/ZIP，最大50MB·帖子文件卡用）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        // 白名单精确校验在 service（MIME+魔数），此处先拦明显的可执行/标记类型
        if (/html|svg|javascript|xhtml/i.test(file.mimetype)) {
          cb(new BadRequestException("不支持的文件类型"), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async uploadDocument(@UploadedFile() file: Express.Multer.File) {
    this.uploadService.validateDocument(file);
    return this.uploadService.upload(file);
  }

  @Delete(":key")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "删除已上传的文件（仅管理员）" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  async deleteFile(@Param("key") key: string) {
    await this.uploadService.delete(key);
    return { success: true };
  }
}
