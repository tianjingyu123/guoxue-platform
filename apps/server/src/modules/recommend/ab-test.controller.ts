import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { AbTestService } from "./services/ab-test.service";
import { CreateAbTestDto, UpdateAbTestDto } from "./ab-test.dto";
import { RedLineGate, RedLine } from "../../common/red-lines";

@ApiTags("A/B实验管理")
@Controller("admin/recommend/ab-tests")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "OPERATION_ADMIN")
@ApiBearerAuth()
export class AbTestController {
  constructor(private abTest: AbTestService) {}

  @Get()
  @ApiOperation({ summary: "获取所有实验列表" })
  @ApiResponse({ status: 200, description: "成功" })
  list() {
    return this.abTest.list();
  }

  @Get(":id")
  @ApiOperation({ summary: "获取实验详情" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  get(@Param("id") id: string) {
    return this.abTest.get(id);
  }

  @Post()
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @ApiOperation({ summary: "创建新实验" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  create(@Body() dto: CreateAbTestDto) {
    return this.abTest.create(dto);
  }

  @Put(":id")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @ApiOperation({ summary: "更新实验配置" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  update(@Param("id") id: string, @Body() dto: UpdateAbTestDto) {
    return this.abTest.update(id, dto);
  }

  @Delete(":id")
  @RedLineGate(RedLine.IRREVERSIBLE)
  @ApiOperation({ summary: "删除实验" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  remove(@Param("id") id: string) {
    return this.abTest.remove(id);
  }

  @Post(":id/start")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @ApiOperation({ summary: "启动实验" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  start(@Param("id") id: string) {
    return this.abTest.start(id);
  }

  @Post(":id/pause")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @ApiOperation({ summary: "暂停实验" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  pause(@Param("id") id: string) {
    return this.abTest.pause(id);
  }

  @Post(":id/complete")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @ApiOperation({ summary: "完成实验" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  complete(@Param("id") id: string) {
    return this.abTest.complete(id);
  }

  @Get("reports/latest")
  @ApiOperation({ summary: "获取最新实验汇总报告" })
  @ApiResponse({ status: 200, description: "成功" })
  getReport() {
    return this.abTest.getLatestReport();
  }

  @Post("reports/generate")
  @ApiOperation({ summary: "手动生成实验汇总报告" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  generateReport() {
    return this.abTest.generateReport();
  }

  @Get(":id/metrics")
  @ApiOperation({ summary: "获取实验效果指标" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  metrics(@Param("id") id: string) {
    return this.abTest.getMetrics(id);
  }
}
