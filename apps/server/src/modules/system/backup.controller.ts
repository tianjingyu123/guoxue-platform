import { Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
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
  triggerBackup() {
    return this.svc.triggerBackup();
  }

  @Get("list")
  @ApiOperation({ summary: "列出备份文件" })
  listBackups() {
    return this.svc.listBackups();
  }

  @Get("latest")
  @ApiOperation({ summary: "最新备份状态" })
  getLatestBackup() {
    return this.svc.getLatestBackup();
  }

  @Post("upload-cos")
  @ApiOperation({ summary: "上传备份到COS" })
  uploadToCos() {
    return this.svc.uploadLatestToCos();
  }
}
