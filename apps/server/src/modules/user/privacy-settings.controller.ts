import { Controller, Get, Put, Body, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsBoolean } from "class-validator";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { Auditable } from "../../common/audit.decorator";
import { PrivacySettingsService } from "./privacy-settings.service";

export class UpdatePrivacySettingsDto {
  @ApiPropertyOptional({ description: "个性化推荐与兴趣画像（P1）" })
  @IsOptional() @IsBoolean()
  personalizedRecommend?: boolean;

  @ApiPropertyOptional({ description: "记录浏览/搜索历史（P2）" })
  @IsOptional() @IsBoolean()
  browseHistory?: boolean;

  @ApiPropertyOptional({ description: "产品改进用的可选分析埋点（P3）" })
  @IsOptional() @IsBoolean()
  optionalAnalytics?: boolean;

  @ApiPropertyOptional({ description: "产品体验询问（AI 评价 / 课程满意度是否出现）" })
  @IsOptional() @IsBoolean()
  experienceSurvey?: boolean;
}

/**
 * 隐私偏好：**只有用户本人**的读写接口，没有任何管理端写接口。
 *
 * 偏好是用户的意思表示，只能由用户本人改变。运营看得到的只有聚合口径下的
 * 「P3 开启用户占比」（用于判断比率类指标的可信度），拿不到也改不了个人取值。
 *
 * 变更会写 AuditLog（操作人即用户本人），便于日后核对「是谁在什么时候改的」。
 */
@ApiTags("隐私偏好")
@ApiBearerAuth()
@Controller("users/privacy-settings")
@UseGuards(JwtAuthGuard)
export class PrivacySettingsController {
  constructor(private readonly svc: PrivacySettingsService) {}

  @Get()
  @ApiOperation({ summary: "读取本人隐私偏好（未设置过则返回默认值）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  get(@Req() req: Request) {
    return this.svc.get(req.user.id);
  }

  @Put()
  @Auditable({ action: "更新隐私偏好", targetType: "USER_PRIVACY" })
  @ApiOperation({
    summary: "更新本人隐私偏好（部分更新：只覆盖传入的键）",
    description:
      "未传入的键保持原值，便于客户端新增开关时老版本不会把未知开关重置掉。" +
      "读取当前值失败时整个更新会失败且不写入，避免把用户的开关误关。",
  })
  @ApiResponse({ status: 200, description: "成功，返回更新后的完整偏好" })
  @ApiResponse({ status: 401, description: "未登录" })
  update(@Req() req: Request, @Body() dto: UpdatePrivacySettingsDto) {
    return this.svc.update(req.user.id, dto);
  }
}
