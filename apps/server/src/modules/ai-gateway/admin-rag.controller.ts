import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { PrismaService } from "../../prisma/prisma.service";
import { RagService } from "./rag.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("RAG Prompt模板")
@Controller("admin/rag/templates")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminRagController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rag: RagService,
  ) {}

  @Get()
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "模板列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "scene", required: false, description: "场景过滤" })
  async list(@Query("scene") scene?: string) {
    const where: any = {};
    if (scene) where.scene = scene;
    return this.prisma.ragPromptTemplate.findMany({ where, orderBy: { createdAt: "desc" } });
  }

  @Get(":id")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "模板详情" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  async get(@Param("id") id: string) {
    return this.prisma.ragPromptTemplate.findUnique({ where: { id } });
  }

  @Post()
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建模板" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async create(@Body() body: {
    scene: string; templateName: string; systemPrompt: string;
    userPromptTemplate?: string; variables?: any[];
  }) {
    return this.prisma.ragPromptTemplate.create({ data: body });
  }

  @Put(":id")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新模板" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  async update(@Param("id") id: string, @Body() body: {
    scene?: string; templateName?: string; systemPrompt?: string;
    userPromptTemplate?: string; variables?: any[]; status?: string;
  }) {
    return this.prisma.ragPromptTemplate.update({ where: { id }, data: body });
  }

  @Delete(":id")
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "删除模板" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  async delete(@Param("id") id: string) {
    return this.prisma.ragPromptTemplate.delete({ where: { id } });
  }

  @Post("preview")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "模板预览测试 — 用测试变量渲染模板，不调用AI" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async preview(@Body() body: {
    systemPrompt: string; userPromptTemplate?: string;
    variables?: Record<string, string>; testQuestion?: string;
  }) {
    let renderedSystem = body.systemPrompt;
    let renderedUser = body.userPromptTemplate || body.testQuestion || "";

    if (body.variables) {
      for (const [key, value] of Object.entries(body.variables)) {
        const placeholder = `{{${key}}}`;
        renderedSystem = renderedSystem.replaceAll(placeholder, value);
        renderedUser = renderedUser.replaceAll(placeholder, value);
      }
    }

    return { renderedSystem, renderedUser };
  }
}
