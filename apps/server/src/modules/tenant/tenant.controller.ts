import { Controller, Get, Post, Body, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Request } from "express";
import { TenantService } from "./tenant.service";
import { TenantGuard } from "./tenant.guard";
import { TenantConsumeDto } from "./tenant.dto";

@ApiTags("SaaS租户（外部API）")
@Controller("tenant")
export class TenantController {
  constructor(private svc: TenantService) {}

  /** 验证 API Key（TenantGuard 已鉴权，此处直接返回租户信息） */
  @Post("verify")
  @UseGuards(TenantGuard)
  @ApiOperation({ summary: "验证 API Key 并返回租户信息" })
  verify(@Req() req: Request) {
    return (req as any).tenant;
  }

  /** 消耗配额（TenantGuard 鉴权 + 主动扣减） */
  @Post("consume")
  @UseGuards(TenantGuard)
  @ApiOperation({ summary: "扣减租户配额" })
  consume(@Req() req: Request, @Body() dto: TenantConsumeDto) {
    const tenant = (req as any).tenant;
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip;
    return this.svc.consume(tenant.id, dto, ip);
  }

  /** 查询剩余配额（TenantGuard 鉴权） */
  @Get("quota")
  @UseGuards(TenantGuard)
  @ApiOperation({ summary: "查询租户剩余配额" })
  getQuota(@Req() req: Request) {
    return this.svc.getQuota(((req as any).tenant).id);
  }
}
