import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { WebhookService, WebhookEvent } from "./webhook.service";

@ApiTags("Webhook")
@Controller("webhooks")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "OPERATION_ADMIN")
@ApiBearerAuth()
export class WebhookController {
  constructor(private readonly svc: WebhookService) {}

  @Post()
  @ApiOperation({ summary: "注册 Webhook 订阅" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  register(
    @Body() body: { event: WebhookEvent; url: string; secret?: string; description?: string },
  ) {
    return this.svc.register(body);
  }

  @Get()
  @ApiOperation({ summary: "查询 Webhook 订阅列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "event", required: false, description: "按事件类型筛选" })
  list(@Query("event") event?: WebhookEvent) {
    return this.svc.list(event);
  }

  @Put(":id")
  @ApiOperation({ summary: "编辑 Webhook 订阅" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  update(
    @Param("id") id: string,
    @Body() body: { url?: string; secret?: string; description?: string },
  ) {
    return this.svc.update(id, body);
  }

  @Post(":id/toggle")
  @ApiOperation({ summary: "启用/禁用 Webhook 订阅" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  toggle(@Param("id") id: string, @Body("isActive") isActive: boolean) {
    return this.svc.toggleActive(id, isActive);
  }

  @Delete(":id")
  @ApiOperation({ summary: "删除 Webhook 订阅" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  unregister(@Param("id") id: string) {
    return this.svc.unregister(id);
  }
}
