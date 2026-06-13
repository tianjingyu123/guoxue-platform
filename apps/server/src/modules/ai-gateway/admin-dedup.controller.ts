import { Controller, Get, Post, Param, Body, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { AdminDedupService } from "./admin-dedup.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { DedupDecideDto, DedupBatchDto, DedupCandidateQueryDto } from "./dto/admin-dedup.dto";

@ApiTags("知识库去重审核")
@Controller("admin/knowledge/dedup")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminDedupController {
  constructor(private readonly svc: AdminDedupService) {}

  @Get("candidates")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR")
  @ApiOperation({ summary: "全局候选列表（跨圈子、按相似度排序）" })
  @ApiResponse({ status: 200, description: "成功" })
  listCandidates(@Query() query: DedupCandidateQueryDto) {
    return this.svc.listCandidates(query);
  }

  @Get("candidates/:id")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR")
  @ApiOperation({ summary: "候选详情（含疑似重复目标）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getCandidate(@Param("id") id: string) {
    return this.svc.getCandidate(id);
  }

  @Post("candidates/:id/decide")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "执行去重决策（override/keepBoth/keepExisting）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  decide(
    @Param("id") id: string,
    @Body() dto: DedupDecideDto,
    @Req() req: Request,
  ) {
    const u = req.user as { nickname?: string; id?: string };
    return this.svc.decide(id, dto.decision, u?.nickname || u?.id, dto.reason);
  }

  @Post("batch")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "批量审核" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  batchDecide(@Body() dto: DedupBatchDto, @Req() req: Request) {
    const u = req.user as { nickname?: string; id?: string };
    return this.svc.batchDecide(dto, u?.nickname || u?.id);
  }

  @Get("stats")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR")
  @ApiOperation({ summary: "去重统计（总量/待审/相似度分布）" })
  @ApiResponse({ status: 200, description: "成功" })
  getStats() {
    return this.svc.getStats();
  }
}
