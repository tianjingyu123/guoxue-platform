import { Body, Controller, Delete, Get, HttpCode, Optional, Param, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from "class-validator";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { StrictThrottleGuard, ThrottleGuard } from "../../common/throttle.guard";
import { VoiceDeviceService } from "./voice-device.service";
import { VoiceSessionService } from "./voice-session.service";
import { HANDOFF_SCENES, VoiceDeviceHandoffService } from "./voice-device-handoff.service";
import { XiaozhiLinkService } from "./xiaozhi/xiaozhi-link.service";

/** 场景接续：在 App 里选好场景，让硬件接着聊 */
export class DeviceHandoffDto {
  @IsIn(HANDOFF_SCENES as unknown as string[]) scene: "report_dialogue" | "classic_companion" | "circle_assistant" | "plaza" | "content_guide";
  @IsOptional() @IsString() @MaxLength(64) contextId?: string;
  @IsOptional() @IsString() @MaxLength(32) sectionId?: string;
  @IsOptional() @IsString() @MaxLength(500) selectedText?: string;
  @IsOptional() @IsIn(["explain", "ask"]) intent?: "explain" | "ask";
}

export class BindDeviceDto {
  @IsString() @MinLength(10) @MaxLength(40) bindCode: string;
}
export class AcceptTransferDto {
  @IsString() @MinLength(10) @MaxLength(40) transferCode: string;
}
export class StartDeviceSessionDto {
  @IsString() @MinLength(8) @MaxLength(64) @Matches(/^[A-Za-z0-9_-]+$/) clientRequestId: string;
}
export class RegisterDeviceDto {
  @IsString() @MinLength(6) @MaxLength(64) serial: string;
  @IsString() @MinLength(1) @MaxLength(64) productSku: string;
  @IsOptional() @IsString() @MaxLength(64) circleId?: string;
  @IsOptional() @IsString() @MaxLength(64) agentProfileId?: string;
}
export class RegisterDeviceBatchDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(500) @IsString({ each: true }) @MaxLength(64, { each: true }) serials: string[];
  @IsString() @MinLength(1) @MaxLength(64) productSku: string;
  @IsOptional() @IsString() @MaxLength(64) circleId?: string;
  @IsOptional() @IsString() @MaxLength(64) agentProfileId?: string;
}
export class DisableDeviceDto {
  @IsString() @MinLength(1) @MaxLength(200) reason: string;
}
export class ListDevicesQuery {
  @IsOptional() @IsIn(["unbound", "bound", "transfer_pending", "disabled"]) status?: string;
  @IsOptional() @IsString() @MaxLength(64) circleId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number;
}

/** 用户侧：我的设备、绑定、解绑、转赠、设备历史（S09） */
@ApiTags("小卜·硬件设备")
@Controller("voice/devices")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VoiceDeviceController {
  constructor(
    private readonly devices: VoiceDeviceService,
    private readonly sessions: VoiceSessionService,
    private readonly handoff: VoiceDeviceHandoffService,
    @Optional() private readonly link?: XiaozhiLinkService,
  ) {}

  @Get()
  @ApiOperation({ summary: "我的设备（含最近联网时间、固件版本、是否正在对话）" })
  async mine(@Req() req: Request) {
    const rows = await this.devices.myDevices((req as any).user.id);
    // 设备平时不保持长连接：只给「最近联网」与「对话中」，不伪造实时在线；状态查询失败不影响列表
    const st = await this.link?.terminalStatus(rows.map((r) => r.id)).catch(() => ({}) as Record<string, never>);
    return rows.map((r) => ({ ...r, terminal: st?.[r.id] ?? { lastSeenAt: null, firmwareVersion: null, talking: false } }));
  }

  @Post("bind")
  @HttpCode(200)
  @UseGuards(StrictThrottleGuard)
  @ApiOperation({ summary: "扫码绑定设备（一次性绑定码）" })
  bind(@Req() req: Request, @Body() dto: BindDeviceDto) {
    return this.devices.bind((req as any).user.id, dto.bindCode);
  }

  @Post("transfer/accept")
  @HttpCode(200)
  @UseGuards(StrictThrottleGuard)
  @ApiOperation({ summary: "接收转赠的设备" })
  accept(@Req() req: Request, @Body() dto: AcceptTransferDto) {
    return this.devices.acceptTransfer((req as any).user.id, dto.transferCode);
  }

  @Post(":id/unbind")
  @HttpCode(200)
  unbind(@Req() req: Request, @Param("id") id: string) {
    return this.devices.unbind((req as any).user.id, id);
  }

  @Post(":id/transfer")
  @HttpCode(200)
  @UseGuards(ThrottleGuard)
  @ApiOperation({ summary: "发起转赠（返回一次性转赠码）" })
  transfer(@Req() req: Request, @Param("id") id: string) {
    return this.devices.initiateTransfer((req as any).user.id, id);
  }

  @Post(":id/transfer/cancel")
  @HttpCode(200)
  cancelTransfer(@Req() req: Request, @Param("id") id: string) {
    return this.devices.cancelTransfer((req as any).user.id, id);
  }

  @Put(":id/handoff")
  @UseGuards(ThrottleGuard)
  @ApiOperation({ summary: "在硬件上继续：把当前场景（报告/古籍/圈子…）交给这台设备，2 小时内按键即接着聊" })
  setHandoff(@Req() req: Request, @Param("id") id: string, @Body() dto: DeviceHandoffDto) {
    return this.handoff.set((req as any).user.id, id, dto);
  }

  @Get(":id/handoff")
  @ApiOperation({ summary: "这台设备当前的接续场景" })
  getHandoff(@Req() req: Request, @Param("id") id: string) {
    return this.handoff.get((req as any).user.id, id);
  }

  @Delete(":id/handoff")
  @ApiOperation({ summary: "清除接续场景（回到普通硬件对话）" })
  clearHandoff(@Req() req: Request, @Param("id") id: string) {
    return this.handoff.clear((req as any).user.id, id);
  }

  @Get(":id/history")
  @ApiOperation({ summary: "设备语音历史（仅当前绑定代次、仅本人）" })
  history(@Req() req: Request, @Param("id") id: string) {
    return this.devices.history((req as any).user.id, id);
  }

  @Post(":id/sessions")
  @UseGuards(ThrottleGuard)
  @ApiOperation({ summary: "从设备发起语音会话（商业能力未接通时返回待开通）" })
  start(@Req() req: Request, @Param("id") id: string, @Body() dto: StartDeviceSessionDto) {
    return this.sessions.startForDevice((req as any).user.id, id, dto.clientRequestId);
  }
}

/** 平台侧设备台账：登记、生成绑定码、停用、恢复。客服只读 */
@ApiTags("小卜·硬件设备（后台）")
@Controller("admin/xiaobu/devices")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class VoiceDeviceAdminController {
  constructor(private readonly devices: VoiceDeviceService) {}

  @Get()
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "CUSTOMER_SERVICE")
  list(@Query() q: ListDevicesQuery) {
    return this.devices.listForAdmin(q);
  }

  @Post()
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  register(@Req() req: Request, @Body() dto: RegisterDeviceDto) {
    return this.devices.register((req as any).user.id, dto);
  }

  @Post("batch")
  @HttpCode(200)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "批量登记（出厂/入库，每行一个序列号或 MAC，最多 500 台，逐条回报）" })
  registerBatch(@Req() req: Request, @Body() dto: RegisterDeviceBatchDto) {
    return this.devices.registerBatch((req as any).user.id, dto);
  }

  @Post(":id/bind-code")
  @HttpCode(200)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  bindCode(@Param("id") id: string) {
    return this.devices.issueBindCode(id);
  }

  @Post(":id/disable")
  @HttpCode(200)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  disable(@Req() req: Request, @Param("id") id: string, @Body() dto: DisableDeviceDto) {
    return this.devices.disable((req as any).user.id, id, dto.reason);
  }

  @Post(":id/enable")
  @HttpCode(200)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  enable(@Req() req: Request, @Param("id") id: string) {
    return this.devices.enable((req as any).user.id, id);
  }
}
