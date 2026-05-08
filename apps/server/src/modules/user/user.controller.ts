import { Controller, Get, Post, Delete, Param, Query, Body, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { UserService } from "./user.service";
import { SystemService } from "../system/system.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { RoleType } from "@prisma/client";

@ApiTags("用户")
@ApiBearerAuth()
@Controller("users")
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(
    private user: UserService,
    private systemService: SystemService,
  ) {}

  @Get(":id")
  @ApiOperation({ summary: "获取用户详情" })
  getUser(@Param("id") id: string) {
    return this.user.getUserById(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取用户列表（管理员）" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页数量" })
  @ApiQuery({ name: "keyword", required: false, type: String, description: "搜索关键词" })
  @ApiQuery({ name: "roleType", required: false, type: String, description: "角色类型" })
  listUsers(
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
    @Query("keyword") keyword?: string,
    @Query("roleType") roleType?: RoleType,
  ) {
    return this.user.listUsers({ page: +page, pageSize: +pageSize, keyword, roleType });
  }

  @Post(":id/roles")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "分配用户角色" })
  async assignRole(
    @Param("id") userId: string,
    @Body() body: { roleType: RoleType; bindId?: string },
    @Req() req: any,
  ) {
    const result = await this.user.assignRole(userId, body.roleType, body.bindId);
    this.systemService.logAudit({
      userId: req.user?.id,
      action: "UPDATE",
      targetType: "USER",
      targetId: userId,
      detail: `分配角色: ${body.roleType}`,
      ip: req.ip,
    }).catch(() => {});
    return result;
  }

  @Delete(":id/roles/:roleType")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "移除用户角色" })
  async removeRole(
    @Param("id") userId: string,
    @Param("roleType") roleType: RoleType,
    @Body("bindId") bindId: string | undefined,
    @Req() req: any,
  ) {
    const result = await this.user.removeRole(userId, roleType, bindId);
    this.systemService.logAudit({
      userId: req.user?.id,
      action: "DELETE",
      targetType: "USER",
      targetId: userId,
      detail: `移除角色: ${roleType}`,
      ip: req.ip,
    }).catch(() => {});
    return result;
  }

  @Get(":id/purchases")
  @ApiOperation({ summary: "获取用户会员购买记录" })
  getMemberPurchases(@Param("id") userId: string) {
    return this.user.getMemberPurchases(userId);
  }
}
