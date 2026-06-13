import { Controller, Get, Put, Param, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { PermissionService } from "./permission.service";

@ApiTags("角色权限")
@ApiBearerAuth()
@Controller("admin/roles")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN")
export class PermissionController {
  constructor(private permSvc: PermissionService) {}

  @Get(":role/permissions")
  @ApiOperation({ summary: "获取角色权限列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiParam({ name: "role", description: "角色类型" })
  async getRolePermissions(@Param("role") role: string) {
    const permissions = await this.permSvc.getRolePermissions(role);
    return { permissions, data: permissions };
  }

  @Put(":role/permissions")
  @ApiOperation({ summary: "更新角色权限" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiParam({ name: "role", description: "角色类型" })
  async setRolePermissions(
    @Param("role") role: string,
    @Body() body: { permissions: string[] },
  ) {
    const result = await this.permSvc.setRolePermissions(role, body.permissions || []);
    return { permissions: result.permissions, data: result.permissions };
  }
}
