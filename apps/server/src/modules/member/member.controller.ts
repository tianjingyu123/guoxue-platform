import { Controller, Get, Post, Param, Req, UseGuards, Body, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { MemberService } from "./member.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { GrantMemberDto } from "./member.dto";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("会员")
@Controller("member")
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @Get("plans")
  @ApiOperation({ summary: "获取会员套餐列表" })
  getPlans() {
    return this.memberService.getPlans();
  }

  @Post("purchase/:planId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "购买会员" })
  purchase(@Req() req: any, @Param("planId") planId: string) {
    return this.memberService.purchase(req.user.id, planId);
  }

  @Get("status")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "查询我的会员状态" })
  getStatus(@Req() req: any) {
    return this.memberService.getStatus(req.user.id);
  }

  @Post("renew/:planId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "续费会员" })
  renew(@Req() req: any, @Param("planId") planId: string) {
    return this.memberService.renew(req.user.id, planId);
  }

  @Get("benefits")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "获取当前会员权益" })
  getBenefits(@Req() req: any) {
    return this.memberService.getBenefits(req.user.id);
  }

  // ───────── 管理员端点 ─────────

  @Get("admin/purchases")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "管理员查看会员购买记录" })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "pageSize", required: false })
  getAdminPurchases(@Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.memberService.getAdminPurchases(+page, +pageSize);
  }

  @Get("admin/stats")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "会员统计" })
  getMemberStats() {
    return this.memberService.getMemberStats();
  }

  @Post("admin/grant")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "手动授予会员" })
  grantMember(@Body() dto: GrantMemberDto) {
    return this.memberService.grantMember(dto.userId, dto.level, dto.durationDays ?? 30);
  }

  @Post("admin/revoke/:userId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "撤销用户会员" })
  revokeMember(@Param("userId") userId: string) {
    return this.memberService.revokeMember(userId);
  }
}
