import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { PaipanService } from "./paipan.service";
import { PaipanAiService } from "./paipan-ai.service";
import { BaziInputDto, BaziRecordQueryDto, AnalyzeDto, AnalysisQueryDto } from "./paipan.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

@Controller("paipan")
export class PaipanController {
  constructor(
    private paipan: PaipanService,
    private paipanAi: PaipanAiService,
  ) {}

  /** 八字排盘预览（不登录也可用） */
  @Post("bazi/preview")
  baziPreview(@Body() dto: BaziInputDto) {
    return this.paipan.calcBaziPreview(dto);
  }

  /** 八字排盘并保存 */
  @Post("bazi")
  @UseGuards(JwtAuthGuard)
  baziCalc(@Req() req: any, @Body() dto: BaziInputDto) {
    return this.paipan.calcBaziAndSave(req.user.id, dto);
  }

  /** 获取排盘记录详情 */
  @Get("bazi/:id")
  @UseGuards(JwtAuthGuard)
  baziRecord(@Param("id") id: string, @Req() req: any) {
    return this.paipan.getBaziRecord(id, req.user.id);
  }

  /** 我的排盘历史 */
  @Get("bazi")
  @UseGuards(JwtAuthGuard)
  baziHistory(@Req() req: any, @Query() q: BaziRecordQueryDto) {
    return this.paipan.getUserBaziHistory(
      req.user.id,
      q.page || 1,
      q.pageSize || 20,
    );
  }

  // ────────── AI 排盘解析 ──────────

  /** 对已保存的排盘记录进行 AI 分析 */
  @Post("bazi/analyze")
  @UseGuards(JwtAuthGuard)
  async baziAnalyze(@Req() req: any, @Body() dto: AnalyzeDto) {
    // 先获取排盘记录
    const record = await this.paipan.getBaziRecord(dto.recordId, req.user.id);
    // 执行 AI 分析
    return this.paipanAi.analyzeBazi(
      req.user.id,
      dto.recordId,
      record.resultData as any,
    );
  }

  /** 获取排盘记录的 AI 分析结果 */
  @Get("bazi/:id/analysis")
  @UseGuards(JwtAuthGuard)
  baziGetAnalysis(@Param("id") id: string, @Req() req: any) {
    // 查找关联此排盘记录的 AI 分析（paipanRecordId = :id）
    return this.paipanAi.getAnalysisByPaipanRecord(id, req.user.id);
  }

  /** 我的 AI 分析历史 */
  @Get("bazi/analysis/history")
  @UseGuards(JwtAuthGuard)
  baziAnalysisHistory(@Req() req: any, @Query() q: AnalysisQueryDto) {
    return this.paipanAi.getUserAnalysisHistory(
      req.user.id,
      q.page || 1,
      q.pageSize || 20,
    );
  }
}
