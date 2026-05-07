import { Controller, Get, Post, Delete, Param, Query, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { UserService } from "./user.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { RoleType } from "@prisma/client";

@ApiTags("用户")
@Controller("users")
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private user: UserService) {}

  @Get(":id")
  @ApiOperation({ summary: "获取用户详情" })
  getUser(@Param("id") id: string) {
    return this.user.getUserById(id);
  }

  @Get()
  @UseGuards(RolesGuard)
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
  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "分配用户角色" })
  assignRole(
    @Param("id") userId: string,
    @Body() body: { roleType: RoleType; bindId?: string },
  ) {
    return this.user.assignRole(userId, body.roleType, body.bindId);
  }

  @Delete(":id/roles/:roleType")
  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "移除用户角色" })
  removeRole(
    @Param("id") userId: string,
    @Param("roleType") roleType: RoleType,
    @Body("bindId") bindId?: string,
  ) {
    return this.user.removeRole(userId, roleType, bindId);
  }

  @Get(":id/purchases")
  @ApiOperation({ summary: "获取用户会员购买记录" })
  getMemberPurchases(@Param("id") userId: string) {
    return this.user.getMemberPurchases(userId);
  }
}
