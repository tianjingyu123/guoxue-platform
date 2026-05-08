import {
  Controller, Post, UseGuards, UseInterceptors,
  UploadedFile, BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { UploadService } from "./upload.service";

@ApiTags("文件上传")
@ApiBearerAuth()
@Controller("upload")
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post("image")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "上传图片" })
  @ApiBearerAuth()
  @UseInterceptors(
    FileInterceptor("file", {
      storage: undefined as any, // 使用 memory storage
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
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
    if (!file) throw new BadRequestException("未选择文件");
    return this.uploadService.upload(file);
  }
}
