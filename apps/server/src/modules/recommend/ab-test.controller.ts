import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { AbTestService } from "./services/ab-test.service";
import { CreateAbTestDto, UpdateAbTestDto } from "./ab-test.dto";

@ApiTags("A/B实验管理")
@Controller("recommend/ab-tests")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "OPERATION_ADMIN")
@ApiBearerAuth()
export class AbTestController {
  constructor(private abTest: AbTestService) {}

  @Get()
  @ApiOperation({ summary: "获取所有实验列表" })
  list() {
    return this.abTest.list();
  }

  @Get(":id")
  @ApiOperation({ summary: "获取实验详情" })
  get(@Param("id") id: string) {
    return this.abTest.get(id);
  }

  @Post()
  @ApiOperation({ summary: "创建新实验" })
  create(@Body() dto: CreateAbTestDto) {
    return this.abTest.create(dto);
  }

  @Put(":id")
  @ApiOperation({ summary: "更新实验配置" })
  update(@Param("id") id: string, @Body() dto: UpdateAbTestDto) {
    return this.abTest.update(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "删除实验" })
  remove(@Param("id") id: string) {
    return this.abTest.remove(id);
  }

  @Post(":id/start")
  @ApiOperation({ summary: "启动实验" })
  start(@Param("id") id: string) {
    return this.abTest.start(id);
  }

  @Post(":id/pause")
  @ApiOperation({ summary: "暂停实验" })
  pause(@Param("id") id: string) {
    return this.abTest.pause(id);
  }

  @Post(":id/complete")
  @ApiOperation({ summary: "完成实验" })
  complete(@Param("id") id: string) {
    return this.abTest.complete(id);
  }

  @Get("reports/latest")
  @ApiOperation({ summary: "获取最新实验汇总报告" })
  getReport() {
    return this.abTest.getLatestReport();
  }

  @Post("reports/generate")
  @ApiOperation({ summary: "手动生成实验汇总报告" })
  generateReport() {
    return this.abTest.generateReport();
  }

  @Get(":id/metrics")
  @ApiOperation({ summary: "获取实验效果指标" })
  metrics(@Param("id") id: string) {
    return this.abTest.getMetrics(id);
  }
}
