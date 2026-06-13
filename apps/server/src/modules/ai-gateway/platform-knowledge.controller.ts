import { Controller, Get, Post, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { PlatformKnowledgeService } from "./platform-knowledge.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";

@ApiTags("平台知识库")
@ApiBearerAuth()
@Controller("platform-knowledge")
@UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
export class PlatformKnowledgeController {
  constructor(private readonly svc: PlatformKnowledgeService) {}

  @Get()
  @ApiOperation({ summary: "搜索平台知识库" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "keyword", required: false })
  @ApiQuery({ name: "category", required: false })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "pageSize", required: false })
  search(
    @Query("keyword") keyword?: string,
    @Query("category") category?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.search({ keyword, category, page: +page, pageSize: +pageSize });
  }

  @Get("stats")
  @ApiOperation({ summary: "平台知识库统计" })
  @ApiResponse({ status: 200, description: "成功" })
  getStats() {
    return this.svc.getStats();
  }

  @Get(":id")
  @ApiOperation({ summary: "获取知识详情" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getById(@Param("id") id: string) {
    return this.svc.getById(id);
  }

  @Post("aggregate")
  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "触发全平台知识汇聚（管理员）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 403, description: "无权限" })
  aggregateAll() {
    return this.svc.aggregateAll();
  }
}
