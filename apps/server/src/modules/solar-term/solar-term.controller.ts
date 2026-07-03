import { Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { OptionalAuthGuard } from "../../common/optional-auth.guard";
import { CurrentUserId } from "../../common/current-user.decorator";
import { SolarTermService } from "./solar-term.service";

@ApiTags("节气仪式")
@Controller("solar-term")
export class SolarTermController {
  constructor(private readonly svc: SolarTermService) {}

  @Get("today")
  @UseGuards(OptionalAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "今日节气（是否节气日/当期内容/下一节气/我是否已参与）" })
  @ApiResponse({ status: 200, description: "成功" })
  today(@CurrentUserId() userId?: string) {
    return this.svc.today(userId);
  }

  @Post("participate")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "参与今日节气仪式（仅节气日当天·颁发限定成就）" })
  @ApiResponse({ status: 201, description: "参与成功" })
  participate(@CurrentUserId() userId: string) {
    return this.svc.participate(userId);
  }

  @Get("my")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "我参与过的节气 + 集齐进度 x/24" })
  @ApiResponse({ status: 200, description: "成功" })
  my(@CurrentUserId() userId: string) {
    return this.svc.my(userId);
  }
}
