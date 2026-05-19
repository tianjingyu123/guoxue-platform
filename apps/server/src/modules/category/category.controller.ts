import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { CategoryService } from "./category.service";
import { CreateCategoryDto, UpdateCategoryDto } from "./dto/category.dto";

@ApiTags("品类管理")
@Controller("admin/categories")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CategoryController {
  constructor(private readonly svc: CategoryService) {}

  @Get("tree")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR")
  @ApiOperation({ summary: "获取品类标签树" })
  getTree() {
    return this.svc.getTree();
  }

  @Post()
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "新增品类" })
  create(@Body() dto: CreateCategoryDto) {
    return this.svc.create(dto);
  }

  @Put(":id")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "编辑品类" })
  update(@Param("id") id: string, @Body() dto: UpdateCategoryDto) {
    return this.svc.update(id, dto);
  }

  @Delete(":id")
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "删除品类（检查无内容引用）" })
  delete(@Param("id") id: string) {
    return this.svc.delete(id);
  }

  @Get("stats")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR")
  @ApiOperation({ summary: "品类内容统计 + 健康度仪表盘" })
  getStats() {
    return this.svc.getStats();
  }

  @Post("sync-counts")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "同步品类内容计数" })
  syncCounts() {
    return this.svc.syncContentCounts();
  }
}
