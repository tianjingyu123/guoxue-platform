import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { CategoryService } from "./category.service";
import { CreateCategoryDto, UpdateCategoryDto } from "./dto/category.dto";
import { RedLineGate, RedLine } from "../../common/red-lines";

@ApiTags("品类管理")
@Controller("admin/categories")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CategoryController {
  constructor(private readonly svc: CategoryService) {}

  @Get("tree")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR")
  @ApiOperation({ summary: "获取品类标签树" })
  @ApiResponse({ status: 200, description: "成功" })
  getTree() {
    return this.svc.getTree();
  }

  @Post()
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "新增品类" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  create(@Body() dto: CreateCategoryDto) {
    return this.svc.create(dto);
  }

  @Put(":id")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "编辑品类" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  update(@Param("id") id: string, @Body() dto: UpdateCategoryDto) {
    return this.svc.update(id, dto);
  }

  @Delete(":id")
  @RedLineGate(RedLine.IRREVERSIBLE)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "删除品类（检查无内容引用）" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  delete(@Param("id") id: string) {
    return this.svc.delete(id);
  }

  @Get("stats")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR")
  @ApiOperation({ summary: "品类内容统计 + 健康度仪表盘" })
  @ApiResponse({ status: 200, description: "成功" })
  getStats() {
    return this.svc.getStats();
  }

  @Post("sync-counts")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "同步品类内容计数" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  syncCounts() {
    return this.svc.syncContentCounts();
  }
}
