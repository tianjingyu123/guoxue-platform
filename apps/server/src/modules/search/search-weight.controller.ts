import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
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
  list(@Query("entityType") entityType?: string) {
    return this.svc.list(entityType);
  }

  @Post()
  @ApiOperation({ summary: "创建/更新搜索权重" })
  upsert(@Body() body: UpsertSearchWeightDto) {
    return this.svc.upsert(body);
  }

  @Delete(":id")
  @ApiOperation({ summary: "删除搜索权重" })
  delete(@Param("id") id: string) {
    return this.svc.delete(id);
  }

  @Post("seed")
  @ApiOperation({ summary: "初始化默认权重" })
  seedDefaults() {
    return this.svc.seedDefaults();
  }
}
