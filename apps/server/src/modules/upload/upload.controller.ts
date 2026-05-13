import {
  Controller, Post, Delete, UseGuards, UseInterceptors,
  UploadedFile, UploadedFiles, BadRequestException, Param,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { UploadService } from "./upload.service";

@ApiTags("文件上传")
@ApiBearerAuth()
@Controller("upload")
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post("image")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "上传图片（单文件，最大10MB）" })
  @UseInterceptors(
    FileInterceptor("file", {
      storage: undefined as any,
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
          cb(new BadRequestException("仅支持图片文件"), false);
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
  @UseInterceptors(
    FilesInterceptor("files", 9, {
      storage: undefined as any,
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
          cb(new BadRequestException("仅支持图片文件"), false);
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
  @UseInterceptors(
    FileInterceptor("file", {
      storage: undefined as any,
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

  @Delete(":key")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "删除已上传的文件" })
  async deleteFile(@Param("key") key: string) {
    await this.uploadService.delete(key);
    return { success: true };
  }
}
