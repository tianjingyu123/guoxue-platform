import {
  Controller, Post, Param, UseGuards, UseInterceptors,
  UploadedFile, Req, BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiParam } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { ImportService } from "./import.service";
import { StationId } from "../../common/station-id.decorator";

@ApiTags("数据导入")
@Controller("system")
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post("import/:type")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "批量导入CSV数据", description: "支持 article/course/product/classic/user 类型" })
  @ApiBearerAuth()
  @ApiConsumes("multipart/form-data")
  @ApiParam({ name: "type", description: "导入类型", enum: ["article", "course", "product", "classic", "user"] })
  @UseInterceptors(FileInterceptor("file", {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (_req, file, cb) => {
      if (file.mimetype === "text/csv" || file.originalname?.endsWith(".csv")) {
        cb(null, true);
      } else {
        cb(new BadRequestException("仅支持 CSV 文件"), false);
      }
    },
  }))
  async importCsv(
    @Param("type") type: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
    @StationId() stationId?: string,
  ) {
    if (!file) throw new BadRequestException("请上传 CSV 文件");

    return this.importService.importCsv(type, file.buffer, {
      userId: req.user?.id || "system",
      stationId: stationId || req.headers?.["x-station-id"],
    });
  }
}
