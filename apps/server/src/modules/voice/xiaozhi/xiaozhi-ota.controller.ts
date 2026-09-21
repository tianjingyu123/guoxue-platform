import { Body, Controller, Get, HttpCode, Param, Post, Req, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from "@nestjs/swagger";
import { IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";
import { Request, Response } from "express";
import { SkipFormat } from "../../../common/skip-format.decorator";
import { JwtAuthGuard } from "../../../common/jwt-auth.guard";
import { RolesGuard } from "../../../common/roles.guard";
import { Roles } from "../../../common/roles.decorator";
import { StrictThrottleGuard } from "../../../common/throttle.guard";
import { XiaozhiLinkService } from "./xiaozhi-link.service";

/**
 * 小智协议终端 · OTA 与激活（设备直接访问，无用户登录态；返回固件认识的原始 JSON，不做统一包装）
 * 设备 OTA 地址填：http(s)://<热卜地址>/api/v1/xiaozhi/ota/
 */
@ApiTags("小卜·小智协议终端")
@Controller("xiaozhi/ota")
export class XiaozhiOtaController {
  constructor(private readonly link: XiaozhiLinkService) {}

  @Post()
  @HttpCode(200)
  @SkipFormat()
  @ApiOperation({ summary: "设备 OTA 检查（下发激活码或连接地址与令牌；不推送固件）" })
  ota(@Req() req: Request, @Body() body: unknown) {
    return this.link.handleOta(req.headers as Record<string, unknown>, body, req.headers.host);
  }

  /** 固件在没有系统信息时会用 GET 检查 */
  @Get()
  @SkipFormat()
  @ApiOperation({ summary: "设备 OTA 检查（GET）" })
  otaGet(@Req() req: Request) {
    return this.link.handleOta(req.headers as Record<string, unknown>, {}, req.headers.host);
  }

  @Post("activate")
  @SkipFormat()
  @ApiOperation({ summary: "设备激活轮询：已绑定 200，等待用户输入激活码 202" })
  async activate(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { status } = await this.link.handleActivate(req.headers as Record<string, unknown>);
    res.status(status);
    return status === 200 ? { status: "activated" } : status === 202 ? { status: "pending" } : { status: "unavailable" };
  }
}

export class ActivateDeviceDto {
  @ApiProperty({ description: "设备播报的数字激活码" })
  @IsString() @Matches(/^\d{4,8}$/) activationCode: string;
}

/** 用户侧：输入设备播报的激活码绑定小智协议终端 */
@ApiTags("小卜·硬件设备")
@Controller("voice/devices")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class XiaozhiActivateController {
  constructor(private readonly link: XiaozhiLinkService) {}

  @Post("activate")
  @HttpCode(200)
  @UseGuards(StrictThrottleGuard)
  @ApiOperation({ summary: "输入设备播报的激活码完成绑定" })
  activate(@Req() req: Request, @Body() dto: ActivateDeviceDto) {
    return this.link.bindByActivationCode((req as any).user.id, dto.activationCode);
  }
}

export class RegisterSeenDto {
  @ApiProperty({ description: "公版硬件 SKU" })
  @IsString() @MinLength(1) @MaxLength(64) productSku: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64) circleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64) agentProfileId?: string;
}

/** 后台：核对上报过的终端（型号/芯片/固件），并把未登记的一键登记进台账 */
@ApiTags("小卜·硬件设备（后台）")
@Controller("admin/xiaobu/terminals")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "OPERATION_ADMIN")
@ApiBearerAuth()
export class XiaozhiTerminalAdminController {
  constructor(private readonly link: XiaozhiLinkService) {}

  @Get()
  @ApiOperation({ summary: "最近上报的小智协议终端（不含明文 MAC）" })
  list() {
    return this.link.listSeen(100);
  }

  @Post(":seenId/register")
  @ApiOperation({ summary: "把上报过的未登记终端登记进设备台账" })
  register(@Req() req: Request, @Param("seenId") seenId: string, @Body() dto: RegisterSeenDto) {
    return this.link.registerSeen((req as any).user.id, seenId, dto);
  }
}
