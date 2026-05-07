import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { BotService } from "./bot.service";
import { CreateBotDto, UpdateBotDto, BindBotToCircleDto, AddKnowledgeDto } from "./bot.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@Controller("bots")
export class BotController {
  constructor(private svc: BotService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  create(@Body() dto: CreateBotDto) {
    return this.svc.create(dto);
  }

  @Get()
  list(@Query("type") type?: string) {
    return this.svc.list(type);
  }

  @Get(":id")
  detail(@Param("id") id: string) {
    return this.svc.getDetail(id);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  update(@Param("id") id: string, @Body() dto: UpdateBotDto) {
    return this.svc.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  delete(@Param("id") id: string) {
    return this.svc.delete(id);
  }

  // 圈子绑定
  @Post(":id/bind-circle")
  @UseGuards(JwtAuthGuard)
  bindToCircle(@Param("id") id: string, @Body() dto: BindBotToCircleDto) {
    return this.svc.bindToCircle(id, dto);
  }

  @Get("circle/:circleId")
  getCircleBot(@Param("circleId") circleId: string) {
    return this.svc.getCircleBot(circleId);
  }

  // 知识库
  @Post(":id/knowledge")
  @UseGuards(JwtAuthGuard)
  addKnowledge(@Param("id") id: string, @Body() dto: AddKnowledgeDto) {
    return this.svc.addKnowledge(id, dto);
  }

  @Delete("knowledge/:knowledgeId")
  @UseGuards(JwtAuthGuard)
  deleteKnowledge(@Param("knowledgeId") knowledgeId: string) {
    return this.svc.deleteKnowledge(knowledgeId);
  }
}
