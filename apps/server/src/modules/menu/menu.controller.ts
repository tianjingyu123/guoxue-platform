import { Controller, Get, UseGuards, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { MenuService } from "./menu.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { Request } from "express";

@ApiTags("菜单")
@Controller("auth")
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get("menus")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "获取当前用户可见菜单", description: "根据用户角色返回过滤后的菜单树" })
  getMenus(@Req() req: Request) {
    const user = req.user as { roles?: (string | { roleType: string })[] };
    const roles: string[] = (user?.roles || []).map((r) =>
      typeof r === "string" ? r : r.roleType,
    );
    return this.menuService.getMenusByRoles(roles);
  }
}
