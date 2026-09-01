import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { WebhookService, WebhookEvent } from "./webhook.service";
import { CreateWebhookDto, UpdateWebhookDto, ToggleWebhookDto } from "./webhook.dto";
import { RedLineGate, RedLine } from "../../common/red-lines";

@ApiTags("Webhook")
@Controller("webhooks")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "OPERATION_ADMIN")
@ApiBearerAuth()
export class WebhookController {
  constructor(private readonly svc: WebhookService) {}

  @Post()
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @ApiOperation({ summary: "注册 Webhook 订阅" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  register(@Body() body: CreateWebhookDto) {
    return this.svc.register(body);
  }

  @Get()
  @ApiOperation({ summary: "查询 Webhook 订阅列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "event", required: false, description: "按事件类型筛选" })
  list(@Query("event") event?: WebhookEvent) {
    return this.svc.list(event);
  }

  @Get("deliveries")
  @ApiOperation({ summary: "查询 Webhook 逐笔投递审计" })
  @ApiQuery({ name: "subscriptionId", required: false, description: "按订阅筛选" })
  @ApiQuery({ name: "status", required: false, description: "PENDING / PROCESSING / DELIVERED / FAILED" })
  @ApiQuery({ name: "take", required: false, description: "返回数量，1-200" })
  listDeliveries(
    @Query("subscriptionId") subscriptionId?: string,
    @Query("status") status?: string,
    @Query("take") take?: string,
  ) {
    return this.svc.listDeliveries({
      subscriptionId,
      status,
      take: take ? Number(take) : undefined,
    });
  }

  @Post("deliveries/:id/retry")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @ApiOperation({ summary: "人工重试一笔失败的 Webhook 投递" })
  retryDelivery(@Param("id") id: string) {
    return this.svc.retryDelivery(id);
  }

  @Put(":id")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @ApiOperation({ summary: "编辑 Webhook 订阅" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  update(@Param("id") id: string, @Body() body: UpdateWebhookDto) {
    return this.svc.update(id, body);
  }

  @Post(":id/toggle")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @ApiOperation({ summary: "启用/禁用 Webhook 订阅" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  toggle(@Param("id") id: string, @Body() body: ToggleWebhookDto) {
    return this.svc.toggleActive(id, body.isActive);
  }

  @Delete(":id")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH, RedLine.IRREVERSIBLE)
  @ApiOperation({ summary: "删除 Webhook 订阅" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  unregister(@Param("id") id: string) {
    return this.svc.unregister(id);
  }
}
