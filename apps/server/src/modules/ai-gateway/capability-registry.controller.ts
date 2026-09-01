import { Controller, Get, Post, Put, Query, Body, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { CapabilityRegistryService } from "./capability-registry.service";
import { RegisterCapabilityDto, SetCapabilityStatusDto } from "./dto/ai-infra.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("🤖 AI能力注册中心")
@Controller("ai/capabilities")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles("SUPER_ADMIN", "OPERATION_ADMIN")
export class CapabilityRegistryController {
  constructor(private readonly registry: CapabilityRegistryService) {}

  @Post()
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "注册AI能力" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async register(@Body() dto: RegisterCapabilityDto) {
    const id = await this.registry.register(dto);
    return { capabilityId: id };
  }

  @Get()
  @ApiOperation({ summary: "发现可用AI能力" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "scene", required: false })
  @ApiQuery({ name: "modality", required: false })
  @ApiQuery({ name: "capabilityType", required: false })
  @ApiQuery({ name: "provider", required: false })
  async discover(
    @Query("scene") scene?: string,
    @Query("modality") modality?: string,
    @Query("capabilityType") capabilityType?: string,
    @Query("provider") provider?: string,
  ) {
    return this.registry.discover({ scene, modality, capabilityType, provider });
  }

  @Get("by-scene")
  @ApiOperation({ summary: "按场景分组查看能力" })
  @ApiResponse({ status: 200, description: "成功" })
  async byScene() {
    return this.registry.discoverByScene();
  }

  @Get("health")
  @ApiOperation({ summary: "能力健康检查" })
  @ApiResponse({ status: 200, description: "成功" })
  async healthCheck() {
    return this.registry.healthCheck();
  }

  @Get(":name")
  @ApiOperation({ summary: "获取能力详情" })
  @ApiResponse({ status: 200, description: "成功" })
  async getByName(@Param("name") name: string) {
    return this.registry.getByName(name);
  }

  @Put(":name/status")
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "设置能力状态" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async setStatus(
    @Param("name") name: string,
    @Body() body: SetCapabilityStatusDto,
  ) {
    await this.registry.setStatus(name, body.status);
    return { success: true };
  }

  @Post("recalculate-rates")
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "重新计算能力成功率" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async recalculateRates() {
    await this.registry.recalculateSuccessRates();
    return { success: true };
  }
}
