import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { BotService } from "./bot.service";
import { CreateBotDto, UpdateBotDto, BindBotToCircleDto, AddKnowledgeDto } from "./bot.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("智能体")
@Controller("bots")
export class BotController {
  constructor(private svc: BotService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "创建智能体" })
  @ApiBearerAuth()
  create(@Body() dto: CreateBotDto) {
    return this.svc.create(dto);
  }

  @Get()
  @ApiOperation({ summary: "获取智能体列表" })
  @ApiQuery({ name: "type", required: false, type: String, description: "智能体类型" })
  list(@Query("type") type?: string) {
    return this.svc.list(type);
  }

  @Get(":id")
  @ApiOperation({ summary: "获取智能体详情" })
  detail(@Param("id") id: string) {
    return this.svc.getDetail(id);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新智能体" })
  @ApiBearerAuth()
  update(@Param("id") id: string, @Body() dto: UpdateBotDto) {
    return this.svc.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "删除智能体" })
  @ApiBearerAuth()
  delete(@Param("id") id: string) {
    return this.svc.delete(id);
  }

  // 圈子绑定
  @Post(":id/bind-circle")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "绑定智能体到圈子" })
  @ApiBearerAuth()
  bindToCircle(@Param("id") id: string, @Body() dto: BindBotToCircleDto) {
    return this.svc.bindToCircle(id, dto);
  }

  @Get("circle/:circleId")
  @ApiOperation({ summary: "获取圈子绑定的智能体" })
  getCircleBot(@Param("circleId") circleId: string) {
    return this.svc.getCircleBot(circleId);
  }

  // 知识库
  @Post(":id/knowledge")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "添加知识库条目" })
  @ApiBearerAuth()
  addKnowledge(@Param("id") id: string, @Body() dto: AddKnowledgeDto) {
    return this.svc.addKnowledge(id, dto);
  }

  @Delete("knowledge/:knowledgeId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "删除知识库条目" })
  @ApiBearerAuth()
  deleteKnowledge(@Param("knowledgeId") knowledgeId: string) {
    return this.svc.deleteKnowledge(knowledgeId);
  }
}
