import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { CreateLegalDto, UpdateLegalDto } from "./dto/legal.dto";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

@ApiTags("法律文件")
@Controller("system/legal")
export class LegalController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(":type")
  @ApiOperation({ summary: "获取最新版本协议（公开）" })
  @ApiResponse({ status: 200, description: "成功" })
  async getLatest(@Param("type") type: string) {
    const doc = await this.prisma.legalDocument.findFirst({
      where: { type, status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
    });
    return doc || null;
  }

  @Get(":type/versions")
  @ApiOperation({ summary: "历史版本列表" })
  @ApiResponse({ status: 200, description: "成功" })
  async getVersions(@Param("type") type: string) {
    return this.prisma.legalDocument.findMany({
      where: { type },
      orderBy: { publishedAt: "desc" },
      select: { id: true, version: true, title: true, publishedAt: true, status: true },
    });
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "创建法律文件" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  adminCreate(@Body() dto: CreateLegalDto) {
    return this.prisma.legalDocument.create({ data: { ...dto, publishedAt: new Date() } });
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "更新法律文件" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  async adminUpdate(@Param("id") id: string, @Body() dto: UpdateLegalDto) {
    const existing = await this.prisma.legalDocument.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "法律文档不存在");
    return this.prisma.legalDocument.update({ where: { id }, data: dto });
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "删除法律文件" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  async adminDelete(@Param("id") id: string) {
    const existing = await this.prisma.legalDocument.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "法律文档不存在");
    return this.prisma.legalDocument.delete({ where: { id } });
  }
}
