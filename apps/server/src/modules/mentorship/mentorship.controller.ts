import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { OptionalAuthGuard } from "../../common/optional-auth.guard";
import { AcceptMentorshipDto } from "./dto/mentorship.dto";
import { MentorshipService } from "./mentorship.service";

@ApiTags("师徒传承")
@Controller("mentorship")
export class MentorshipController {
  constructor(private readonly svc: MentorshipService) {}

  @Post("invite")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "生成拜师邀请链接（师父·token 7 天有效）" })
  invite(@Req() req: Request) {
    return this.svc.invite(req.user.id);
  }

  @Get("invite/:token")
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: "拜师邀请落地页：展示师父招徒卡（公开）" })
  getInvite(@Param("token") token: string) {
    return this.svc.getInvite(token);
  }

  @Post("accept")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "拜师（徒弟·无 ACTIVE 师父方可）" })
  accept(@Req() req: Request, @Body() dto: AcceptMentorshipDto) {
    return this.svc.accept(req.user.id, dto.token, dto.pledge);
  }

  @Get("my-mentor")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "我的师父（ACTIVE）" })
  myMentor(@Req() req: Request) {
    return this.svc.myMentor(req.user.id);
  }

  @Get("my-disciples")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "我的徒弟列表 + 传道值汇总（师父）" })
  myDisciples(@Req() req: Request) {
    return this.svc.myDisciples(req.user.id);
  }

  @Post("graduate")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "出师（徒弟自主·满学分条件）" })
  graduate(@Req() req: Request) {
    return this.svc.graduate(req.user.id);
  }

  @Get("ranking")
  @ApiOperation({ summary: "传道值荣誉榜 TOP20（公开·纯荣誉·不可兑换财物）" })
  ranking() {
    return this.svc.ranking();
  }
}
