import { Controller, Get, Post, Param, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { MemberService } from "./member.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { PurchaseMemberDto } from "./member.dto";

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
}
