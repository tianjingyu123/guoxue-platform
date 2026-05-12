import { Injectable } from "@nestjs/common";
import { MENU_CONFIG, MenuItem } from "./menu.config";

@Injectable()
export class MenuService {
  /**
   * 根据用户角色返回过滤后的菜单树
   * 超级管理员看到所有菜单
   */
  getMenusByRoles(userRoles: string[]): MenuItem[] {
    const isSuperAdmin = userRoles.includes("SUPER_ADMIN");
    return this.filterMenus(MENU_CONFIG, userRoles, isSuperAdmin);
  }

  private filterMenus(
    menus: MenuItem[],
    userRoles: string[],
    isSuperAdmin: boolean,
  ): MenuItem[] {
    const result: MenuItem[] = [];

    for (const menu of menus) {
      // 超管跳过角色检查
      if (!isSuperAdmin && menu.roles && menu.roles.length > 0) {
        const hasRole = menu.roles.some((r) => userRoles.includes(r));
        if (!hasRole) continue;
      }

      const item: MenuItem = { ...menu };

      if (menu.children) {
        const filtered = this.filterMenus(menu.children, userRoles, isSuperAdmin);
        if (filtered.length === 0) continue;
        item.children = filtered;
      }

      result.push(item);
    }

    return result;
  }
}
