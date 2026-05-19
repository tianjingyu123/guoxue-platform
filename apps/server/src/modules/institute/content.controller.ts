import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { Request } from "express";
import { InstituteContentService } from "./content.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { CreateInstituteContentDto, UpdateInstituteContentDto } from "./dto/content.dto";

@ApiTags("研究院内容资产")
@Controller("admin/institute/contents")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InstituteContentController {
  constructor(private readonly svc: InstituteContentService) {}

  @Post()
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建内容" })
  create(@Body() dto: CreateInstituteContentDto, @Req() req: Request) {
    const u = req.user as { id: string };
    return this.svc.create(dto, u.id);
  }

  @Get()
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "内容列表" })
  @ApiQuery({ name: "instituteId", required: false })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  list(
    @Query("instituteId") instituteId?: string,
    @Query("status") status?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.list({ instituteId, status, page: +page, pageSize: +pageSize });
  }

  @Get("stats")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "内容统计" })
  @ApiQuery({ name: "instituteId", required: false })
  getStats(@Query("instituteId") instituteId?: string) {
    return this.svc.getStats(instituteId);
  }

  @Get(":id")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "内容详情（含购买记录）" })
  get(@Param("id") id: string) {
    return this.svc.get(id);
  }

  @Put(":id")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新内容" })
  update(@Param("id") id: string, @Body() dto: UpdateInstituteContentDto) {
    return this.svc.update(id, dto);
  }

  @Delete(":id")
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "归档内容" })
  delete(@Param("id") id: string) {
    return this.svc.delete(id);
  }

  @Get(":id/purchases")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "购买记录" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  getPurchases(@Param("id") id: string, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.getPurchaseRecords(id, +page, +pageSize);
  }
}
