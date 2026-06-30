import { Controller, Get, Put, Body, Param, Query, Req, UseGuards, Logger } from "@nestjs/common";
import { Request } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { TeacherService } from "./teacher.service";
import { ReviewCertificationDto } from "./teacher.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { SystemService } from "../system/system.service";

type AuthRequest = Omit<Request, "user"> & { user: { id: string; [key: string]: unknown } };

@ApiTags("讲师认证管理")
@Controller("teacher")
export class TeacherAdminController {
  private readonly logger = new Logger(TeacherAdminController.name);
  constructor(
    private teacher: TeacherService,
    private systemService: SystemService,
  ) {}

  @Get("certifications")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "讲师认证列表（管理员，可按状态过滤）" })
  @ApiBearerAuth()
  @ApiQuery({ name: "status", required: false, description: "PENDING / APPROVED / REJECTED" })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "pageSize", required: false })
  @ApiResponse({ status: 200, description: "成功返回认证列表" })
  list(@Query("status") status?: string, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.teacher.listCertifications(status, +page, +pageSize);
  }

  @Put("certifications/:id/review")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "审核讲师认证（通过 / 驳回）" })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: "审核成功" })
  @ApiResponse({ status: 400, description: "驳回未填原因" })
  @ApiResponse({ status: 404, description: "认证申请不存在" })
  async review(@Param("id") id: string, @Req() req: AuthRequest, @Body() dto: ReviewCertificationDto) {
    const result = await this.teacher.reviewCertification(id, dto.action, {
      verifiedTitle: dto.verifiedTitle,
      rejectReason: dto.rejectReason,
    });
    this.systemService.logAudit({
      userId: req.user?.id,
      action: dto.action === "APPROVE" ? "APPROVE" : "REJECT",
      targetType: "TEACHER_CERTIFICATION",
      targetId: id,
      detail: `讲师认证审核：${dto.action === "APPROVE" ? "通过" : "驳回"}${dto.rejectReason ? "（" + dto.rejectReason + "）" : ""}`,
      ip: req.ip,
    }).catch((err) => this.logger.warn("审计日志记录失败", err));
    return result;
  }
}
