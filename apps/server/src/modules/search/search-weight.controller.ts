import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { SearchWeightService } from "./search-weight.service";
import { UpsertSearchWeightDto } from "./dto/search-weight.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("搜索权重")
@ApiBearerAuth()
@Controller("search/weights")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "OPERATION_ADMIN")
export class SearchWeightController {
  constructor(private svc: SearchWeightService) {}

  @Get()
  @ApiOperation({ summary: "搜索权重列表" })
  @ApiResponse({ status: 200, description: "成功" })
  list(@Query("entityType") entityType?: string) {
    return this.svc.list(entityType);
  }

  @Post()
  @ApiOperation({ summary: "创建/更新搜索权重" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  upsert(@Body() body: UpsertSearchWeightDto) {
    return this.svc.upsert(body);
  }

  @Delete(":id")
  @ApiOperation({ summary: "删除搜索权重" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  delete(@Param("id") id: string) {
    return this.svc.delete(id);
  }

  @Post("seed")
  @ApiOperation({ summary: "初始化默认权重" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  seedDefaults() {
    return this.svc.seedDefaults();
  }
}
