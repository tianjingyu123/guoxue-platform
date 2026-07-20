import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { BaziCaseService } from "./bazi-case.service";

/**
 * 八字案例库
 *
 * 🔴 答案 = 真实人生经历（life + events）；断语（commentary）只是参考。
 *
 * 「先断后看」是这个玩法的全部意义，所以答案的下发口收得很死：
 *   - GET /bazi-cases/:id      公开详情，**永远不含答案**（连未登录用户都拿不到）
 *   - GET /bazi-cases/:id/mine 登录：我的断语；只有我已 reveal 过，才附带答案
 *   - POST /bazi-cases/:id/reveal 登录：公布答案（答案唯一的出口）
 * 这样即便有人扒接口，没点过「公布答案」也拿不到答案。
 */
@ApiTags("八字案例库")
@Controller("bazi-cases")
export class BaziCaseController {
  constructor(private readonly svc: BaziCaseService) {}

  // ── 浏览（公开）──

  @Get()
  @ApiOperation({ summary: "案例列表（仅已审核通过；不含答案）" })
  list(
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("source") source?: string,
    @Query("tag") tag?: string,
    @Query("keyword") keyword?: string,
    @Query("premiumOnly") premiumOnly?: string,
  ) {
    return this.svc.list({
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
      source,
      tag,
      keyword,
      premiumOnly: premiumOnly === "true",
    });
  }

  @Get("leaderboard")
  @ApiOperation({ summary: "案例贡献榜" })
  leaderboard(@Query("limit") limit?: string) {
    return this.svc.leaderboard(Number(limit) || 20);
  }

  /** 排完盘调它。公开：未登录也该看到「有同类八字可参考」的提示 */
  @Post("similar")
  @ApiOperation({ summary: "找同类八字（日柱相同 + 年/月/时另任意两柱相同）" })
  similar(@Body() dto: { year: string; month: string; day: string; hour: string; limit?: number }) {
    return this.svc.findSimilar(
      { year: dto.year, month: dto.month, day: dto.day, hour: dto.hour },
      dto.limit ?? 5,
    );
  }

  // ── 我的投稿（登录）──

  @Get("reward-plan")
  @ApiOperation({ summary: "案例投稿当前奖励方案（配置不完整时明确停用）" })
  rewardPlan() {
    return this.svc.rewardPlan();
  }

  @Get("mine")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "我的投稿（含贡献称号）" })
  mine(@Req() req: Request) {
    return this.svc.myContributions(req.user.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "投稿案例（须确认本人/已获授权；一律匿名脱敏；待审核）" })
  submit(@Req() req: Request, @Body() dto: Parameters<BaziCaseService["submit"]>[1]) {
    return this.svc.submit(req.user.id, dto);
  }

  // ── 练手（登录）──

  @Post(":id/guess")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "保存我的断语（公布答案前）" })
  guess(@Req() req: Request, @Param("id") id: string, @Body() dto: { guess: Record<string, string> }) {
    return this.svc.saveGuess(req.user.id, id, dto?.guess ?? {});
  }

  @Post(":id/reveal")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "公布答案 —— 真实人生经历 + 大事年表，附我的断语供逐维度对照" })
  reveal(@Req() req: Request, @Param("id") id: string) {
    return this.svc.reveal(req.user.id, id);
  }

  @Put(":id/self-score")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "自评断中几项（用户自己判，平台不做机器裁决）" })
  score(@Req() req: Request, @Param("id") id: string, @Body() dto: { score: number }) {
    return this.svc.selfScore(req.user.id, id, dto?.score ?? 0);
  }

  /** 我在这个案例上的练手状态（已 reveal 则附带答案，供刷新后回显） */
  @Get(":id/mine")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "我在此案例的练手状态（已公布答案则一并返回答案）" })
  myAttempt(@Req() req: Request, @Param("id") id: string) {
    return this.svc.myAttempt(req.user.id, id);
  }

  // 🔴 :id 放最后，否则 "mine" / "leaderboard" / "similar" 会被它吃掉
  @Get(":id")
  @ApiOperation({ summary: "案例详情（公开·永不含答案）" })
  detail(@Param("id") id: string) {
    return this.svc.detail(id);
  }
}

/** 审核台（admin） */
@ApiTags("八字案例库·审核")
@Controller("admin/bazi-cases")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BaziCaseAdminController {
  constructor(private readonly svc: BaziCaseService) {}

  @Get()
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "待审核案例（含答案全文，审核要看得见）" })
  list(@Query("status") status?: string, @Query("page") page?: string, @Query("pageSize") pageSize?: string) {
    return this.svc.listForReview(status ?? "PENDING", Number(page) || 1, Number(pageSize) || 20);
  }

  @Post(":id/approve")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "通过（用户投稿按质量档发国学币·幂等，不重复发）" })
  approve(@Req() req: Request, @Param("id") id: string, @Body() dto: { note?: string }) {
    return this.svc.approve(req.user.id, id, dto?.note);
  }

  @Post(":id/reject")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "驳回（须给理由，投稿人可见）" })
  reject(@Req() req: Request, @Param("id") id: string, @Body() dto: { note: string }) {
    return this.svc.reject(req.user.id, id, dto?.note ?? "不符合收录标准");
  }
}
