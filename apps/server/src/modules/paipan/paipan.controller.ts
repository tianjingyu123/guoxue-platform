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
import { BaziInputDto, BaziRecordQueryDto } from "./paipan.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

@Controller("paipan")
export class PaipanController {
  constructor(private paipan: PaipanService) {}

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
}
