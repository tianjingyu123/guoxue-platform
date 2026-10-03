import { Controller, Post, Get, Body, Param, Query, UseGuards, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { IdentityService } from "./identity.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { IdCardOcrDto, IdCardVerifyDto, FaceTokenDto, AuditIdentityDto } from "./identity.dto";
import { RedLineGate, RedLine } from "../../common/red-lines";

interface AuthRequest extends Request {
  user: { id: string; role: string };
}

@ApiTags("实名认证")
@ApiBearerAuth()
@Controller("identity")
@UseGuards(JwtAuthGuard)
export class IdentityController {
  constructor(private svc: IdentityService) {}

  @Post("ocr")
  @ApiOperation({ summary: "身份证OCR识别" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  ocr(@Req() req: AuthRequest, @Body() body: IdCardOcrDto) {
    return this.svc.idCardOcr(req.user.id, body);
  }

  @Post("verify")
  @ApiOperation({ summary: "身份证二要素核验（姓名+身份证号）— 仅限本人" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  verify(@Req() req: AuthRequest, @Body() body: IdCardVerifyDto) {
    return this.svc.idCardVerification(req.user.id, body.name, body.idCard);
  }

  @Post("face/token")
  @ApiOperation({ summary: "获取人脸核身URL" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  faceToken(@Req() req: AuthRequest, @Body() body: FaceTokenDto) {
    return this.svc.getFaceIdToken(req.user.id, body.name, body.idCard, body.returnUrl);
  }

  @Get("face/result/:token")
  @ApiOperation({ summary: "查询人脸核身结果" })
  @ApiResponse({ status: 200, description: "成功" })
  faceResult(@Req() req: AuthRequest, @Param("token") token: string) {
    return this.svc.getFaceIdResult(req.user.id, token);
  }

  // ───────── 审核管理 ─────────

  @Get("admin/audit-list")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "实名认证审核列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiQuery({ name: "status", required: false, type: String, description: "审核状态" })
  @ApiQuery({ name: "userId", required: false, type: String, description: "用户ID筛选" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页数量" })
  getAuditList(
    @Query("status") status?: string,
    @Query("userId") userId?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.getIdentityAuditList(+page, +pageSize, status, userId);
  }

  @Post("admin/approve/:id")
  @RedLineGate(RedLine.USER_DATA, RedLine.COMPLIANCE)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "通过实名认证" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  approveIdentity(@Param("id") id: string, @Body() dto: AuditIdentityDto) {
    return this.svc.approveIdentity(id, dto.remark);
  }

  @Post("admin/reject/:id")
  @RedLineGate(RedLine.USER_DATA, RedLine.COMPLIANCE)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "拒绝实名认证" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  rejectIdentity(@Param("id") id: string, @Body() dto: AuditIdentityDto) {
    return this.svc.rejectIdentity(id, dto.remark || "未通过审核");
  }
}
