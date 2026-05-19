import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { CreateLegalDto, UpdateLegalDto } from "./dto/legal.dto";

@ApiTags("法律文件")
@Controller("system/legal")
export class LegalController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(":type")
  @ApiOperation({ summary: "获取最新版本协议（公开）" })
  async getLatest(@Param("type") type: string) {
    const doc = await this.prisma.legalDocument.findFirst({
      where: { type, status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
    });
    return doc || null;
  }

  @Get(":type/versions")
  @ApiOperation({ summary: "历史版本列表" })
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
  adminCreate(@Body() dto: CreateLegalDto) {
    return this.prisma.legalDocument.create({ data: { ...dto, publishedAt: new Date() } });
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "更新法律文件" })
  adminUpdate(@Param("id") id: string, @Body() dto: UpdateLegalDto) {
    return this.prisma.legalDocument.update({ where: { id }, data: dto });
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "删除法律文件" })
  adminDelete(@Param("id") id: string) {
    return this.prisma.legalDocument.delete({ where: { id } });
  }
}
