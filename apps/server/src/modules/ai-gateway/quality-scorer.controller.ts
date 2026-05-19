import { Controller, Post, Get, Body, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { QualityScorerService, QualityScore, ScoreRequest } from "./quality-scorer.service";
import { ScoreDto, ScoreBatchDto } from "./dto/quality-scorer.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";

@ApiTags("🤖 AI质量评分")
@Controller("ai/quality")
@UseGuards(JwtAuthGuard, RolesGuard, StrictRedisThrottleGuard)
@ApiBearerAuth()
export class QualityScorerController {
  constructor(private readonly scorer: QualityScorerService) {}

  @Post("score")
  @ApiOperation({ summary: "对AI内容进行四维质量评分" })
  async score(@Body() dto: ScoreDto): Promise<QualityScore> {
    return this.scorer.score(dto as ScoreRequest);
  }

  @Post("score-batch")
  @ApiOperation({ summary: "批量评分" })
  async scoreBatch(@Body() dto: ScoreBatchDto): Promise<QualityScore[]> {
    return this.scorer.scoreBatch(dto.items as ScoreRequest[]);
  }

  @Get("scores")
  @ApiOperation({ summary: "评分历史查询" })
  @ApiQuery({ name: "scene", required: false })
  @ApiQuery({ name: "minOverall", required: false, type: Number })
  @ApiQuery({ name: "skip", required: false, type: Number })
  @ApiQuery({ name: "take", required: false, type: Number })
  async getScores(
    @Query("scene") scene?: string,
    @Query("minOverall") minOverall?: string,
    @Query("skip") skip?: string,
    @Query("take") take?: string,
  ) {
    return this.scorer.getScores({
      scene,
      minOverall: minOverall ? parseFloat(minOverall) : undefined,
      skip: skip ? parseInt(skip) : 0,
      take: take ? parseInt(take) : 20,
    });
  }

  @Get("stats")
  @ApiOperation({ summary: "评分统计概览" })
  @ApiQuery({ name: "scene", required: false })
  async getStats(@Query("scene") scene?: string) {
    return this.scorer.getStats(scene);
  }
}
