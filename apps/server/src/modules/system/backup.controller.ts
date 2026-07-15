import { Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import type { Request } from "express";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { BackupService } from "./backup.service";

@ApiTags("系统-数据库备份")
@Controller("system/backup")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN")
@ApiBearerAuth()
export class BackupController {
  constructor(private readonly svc: BackupService) {}

  @Post("manual")
  @ApiOperation({ summary: "手动触发数据库备份" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  triggerBackup(@Req() req?: Request) {
    return this.svc.triggerBackup(req?.user?.id);
  }

  @Get("list")
  @ApiOperation({ summary: "列出备份文件" })
  @ApiResponse({ status: 200, description: "成功" })
  listBackups() {
    return this.svc.listBackups();
  }

  @Get("latest")
  @ApiOperation({ summary: "最新备份状态" })
  @ApiResponse({ status: 200, description: "成功" })
  getLatestBackup() {
    return this.svc.getLatestBackup();
  }

  @Post("upload-cos")
  @ApiOperation({ summary: "上传备份到COS" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  uploadToCos() {
    return this.svc.uploadLatestToCos();
  }
}
