import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { WannianliService } from "./wannianli.service";
import { ThrottleGuard } from "../../common/throttle.guard";

@ApiTags("万年历")
@Controller("wannianli")
@UseGuards(ThrottleGuard)
export class WannianliController {
  constructor(private readonly svc: WannianliService) {}

  /** 今日万年历 */
  @Get("today")
  @ApiOperation({ summary: "获取今日万年历" })
  @ApiResponse({ status: 200, description: "成功" })
  async getToday() {
    const row = await this.svc.getToday();
    if (!row) return null;
    return this.svc.buildDayDetail(row);
  }

  /** 按公历日期查询 */
  @Get("date/:date")
  @ApiOperation({ summary: "按公历日期查询万年历（格式 YYYY-MM-DD）" })
  @ApiResponse({ status: 200, description: "成功" })
  async getByDate(@Param("date") dateStr: string) {
    const date = new Date(dateStr + "T00:00:00Z");
    if (isNaN(date.getTime())) return null;
    const row = await this.svc.getByDate(date);
    if (!row) return null;
    return this.svc.buildDayDetail(row);
  }

  /** 日期范围查询 */
  @Get("range")
  @ApiOperation({ summary: "日期范围查询万年历" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "start", required: true, example: "2026-01-01" })
  @ApiQuery({ name: "end", required: true, example: "2026-01-31" })
  async getRange(
    @Query("start") startStr: string,
    @Query("end") endStr: string,
  ) {
    const start = new Date(startStr + "T00:00:00Z");
    const end = new Date(endStr + "T00:00:00Z");
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];
    const rows = await this.svc.getByDateRange(start, end);
    return rows.map(r => this.svc.buildDayDetail(r));
  }

  /** 全年数据 */
  @Get("year/:year")
  @ApiOperation({ summary: "获取全年万年历数据" })
  @ApiResponse({ status: 200, description: "成功" })
  async getFullYear(@Param("year") year: string) {
    const y = parseInt(year, 10);
    if (isNaN(y)) return [];
    const rows = await this.svc.getFullYear(y);
    return rows.map(r => this.svc.buildDayDetail(r));
  }

  /** 按农历年月查询 */
  @Get("lunar/:year/:month")
  @ApiOperation({ summary: "按农历年月查询万年历" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "includeLeap", required: false, example: "true" })
  async getByLunar(
    @Param("year") year: string,
    @Param("month") month: string,
    @Query("includeLeap") includeLeap?: string,
  ) {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    if (isNaN(y) || isNaN(m)) return [];
    const rows = await this.svc.getByLunarYearMonth(y, m, includeLeap !== "false");
    return rows.map(r => this.svc.buildDayDetail(r));
  }

  /** 节气列表 */
  @Get("jieqi/:year")
  @ApiOperation({ summary: "获取指定年份的节气列表" })
  @ApiResponse({ status: 200, description: "成功" })
  async getJieQi(@Param("year") year: string) {
    const y = parseInt(year, 10);
    if (isNaN(y)) return [];
    return this.svc.getJieQiByYear(y);
  }
}
