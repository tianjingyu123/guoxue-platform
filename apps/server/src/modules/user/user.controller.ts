import { Controller, Get, Post, Delete, Param, Query, Body, UseGuards } from "@nestjs/common";
import { UserService } from "./user.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { RoleType } from "@prisma/client";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private user: UserService) {}

  @Get(":id")
  getUser(@Param("id") id: string) {
    return this.user.getUserById(id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
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
  assignRole(
    @Param("id") userId: string,
    @Body() body: { roleType: RoleType; bindId?: string },
  ) {
    return this.user.assignRole(userId, body.roleType, body.bindId);
  }

  @Delete(":id/roles/:roleType")
  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN")
  removeRole(
    @Param("id") userId: string,
    @Param("roleType") roleType: RoleType,
    @Body("bindId") bindId?: string,
  ) {
    return this.user.removeRole(userId, roleType, bindId);
  }

  @Get(":id/purchases")
  getMemberPurchases(@Param("id") userId: string) {
    return this.user.getMemberPurchases(userId);
  }
}
