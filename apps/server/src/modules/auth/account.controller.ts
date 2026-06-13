import { Controller, Post, Get, Put, Body, Req, UseGuards, Logger } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { AccountService } from "./account.service";
import { SystemService } from "../system/system.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";
import { DeleteAccountDto, ChangePhoneDto } from "./auth.dto";
import { maskPhone } from "../../common/crypto.util";

@ApiTags("账号管理")
@Controller("auth")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
export class AccountController {
  private readonly logger = new Logger(AccountController.name);
  constructor(
    private account: AccountService,
    private systemService: SystemService,
  ) {}

  @Post("delete-account")
  @ApiOperation({ summary: "申请注销账号（7天冷静期）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async requestDelete(@Req() req: Request, @Body() dto: DeleteAccountDto) {
    const result = await this.account.requestDelete(req.user.id, dto);
    this.systemService.logAudit({
      userId: req.user.id,
      action: "DELETE_ACCOUNT_REQUEST",
      detail: `申请注销账号`,
      ip: req.ip,
    }).catch((err) => this.logger.warn("审计日志失败", err));
    return result;
  }

  @Get("delete-account/status")
  @ApiOperation({ summary: "查询注销申请状态" })
  @ApiResponse({ status: 200, description: "成功" })
  getDeleteStatus(@Req() req: Request) {
    return this.account.getDeleteStatus(req.user.id);
  }

  @Post("delete-account/cancel")
  @ApiOperation({ summary: "撤销注销申请（冷静期内）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async cancelDelete(@Req() req: Request) {
    const result = await this.account.cancelDelete(req.user.id);
    this.systemService.logAudit({
      userId: req.user.id,
      action: "DELETE_ACCOUNT_CANCEL",
      detail: `撤销注销申请`,
      ip: req.ip,
    }).catch((err) => this.logger.warn("审计日志失败", err));
    return result;
  }

  @Put("phone")
  @ApiOperation({ summary: "更换绑定手机号" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async changePhone(@Req() req: Request, @Body() dto: ChangePhoneDto) {
    const result = await this.account.changePhone(req.user.id, dto);
    this.systemService.logAudit({
      userId: req.user.id,
      action: "CHANGE_PHONE",
      detail: `更换手机号为 ${maskPhone(dto.newPhone)}`,
      ip: req.ip,
    }).catch((err) => this.logger.warn("审计日志失败", err));
    return result;
  }
}
