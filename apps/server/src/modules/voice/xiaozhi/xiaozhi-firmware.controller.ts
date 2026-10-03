import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";
import { Type } from "class-transformer";
import { Request, Response } from "express";
import { SkipFormat } from "../../../common/skip-format.decorator";
import { JwtAuthGuard } from "../../../common/jwt-auth.guard";
import { RolesGuard } from "../../../common/roles.guard";
import { Roles } from "../../../common/roles.decorator";
import { XiaozhiFirmwareService } from "./xiaozhi-firmware.service";

/** 设备下载固件（OTA 回应里的签名地址，无登录态；签名 1 小时有效） */
@ApiTags("小卜·小智协议终端")
@Controller("xiaozhi/firmware")
export class XiaozhiFirmwareDownloadController {
  constructor(private readonly fw: XiaozhiFirmwareService) {}

  @Get(":file")
  @SkipFormat()
  @ApiOperation({ summary: "设备下载固件（签名地址）" })
  async download(@Param("file") file: string, @Query("exp") exp: string, @Query("sig") sig: string, @Res() res: Response) {
    const id = String(file || "").replace(/\.bin$/, "");
    const r = await this.fw.download(id, Number(exp), String(sig || ""));
    if (!r) throw new NotFoundException("固件不存在或链接已失效");
    res.set({
      "Content-Type": "application/octet-stream",
      "Content-Length": String(r.body.length),
      "Cache-Control": "no-store",
      "X-Firmware-Sha256": r.sha256,
    });
    res.end(r.body);
  }
}

export class CreateFirmwareDto {
  @ApiProperty({ description: "目标板型（设备上报的 board.name，如 xmini-c3-rebu-test）" })
  @IsString() @MinLength(2) @MaxLength(64) boardName: string;
  @ApiPropertyOptional({ description: "更新说明" })
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class RolloutDto {
  @ApiProperty({ description: "灰度比例 1—100" })
  @Type(() => Number) @IsInt() @Min(1) @Max(100) percent: number;
}

/** 后台：固件发布、灰度、暂停与统计 */
@ApiTags("小卜·硬件设备（后台）")
@Controller("admin/xiaobu/firmware")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "OPERATION_ADMIN")
@ApiBearerAuth()
export class XiaozhiFirmwareAdminController {
  constructor(private readonly fw: XiaozhiFirmwareService) {}

  @Get()
  @ApiOperation({ summary: "固件发布列表（含推送成功/失败统计）" })
  list() {
    return this.fw.list();
  }

  @Post()
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "上传固件（版本号从镜像自带描述读出），生成草稿发布" })
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 8 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => (/\.bin$/i.test(file.originalname || "") ? cb(null, true) : cb(new BadRequestException("请上传 .bin 固件文件"), false)),
    }),
  )
  create(@Req() req: Request, @UploadedFile() file: Express.Multer.File, @Body() dto: CreateFirmwareDto) {
    return this.fw.create((req as any).user.id, { boardName: dto.boardName, notes: dto.notes, file: file?.buffer });
  }

  @Post(":id/rollout")
  @ApiOperation({ summary: "开始或调整灰度比例（同板型同时只能有一个进行中的发布）" })
  rollout(@Req() req: Request, @Param("id") id: string, @Body() dto: RolloutDto) {
    return this.fw.rollout((req as any).user.id, id, dto.percent);
  }

  @Post(":id/pause")
  @ApiOperation({ summary: "暂停推送（已升级的设备不受影响）" })
  pause(@Req() req: Request, @Param("id") id: string) {
    return this.fw.setStatus((req as any).user.id, id, "paused");
  }

  @Post(":id/archive")
  @ApiOperation({ summary: "归档（不再推送、下载链接失效）" })
  archive(@Req() req: Request, @Param("id") id: string) {
    return this.fw.setStatus((req as any).user.id, id, "archived");
  }
}
