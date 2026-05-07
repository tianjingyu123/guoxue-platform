import {
  Controller, Post, UseGuards, UseInterceptors,
  UploadedFile, BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { diskStorage } from "multer";
import { extname, join } from "path";
import { randomUUID } from "crypto";

@ApiTags("文件上传")
@Controller("upload")
export class UploadController {
  @Post("image")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "上传图片" })
  @ApiBearerAuth()
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: join(__dirname, "..", "..", "..", "uploads"),
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname) || ".png";
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
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
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException("未选择文件");
    return { url: `/uploads/${file.filename}` };
  }
}
