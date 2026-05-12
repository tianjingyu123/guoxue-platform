import { Test } from "@nestjs/testing";
import { MenuService } from "./menu.service";

describe("MenuService", () => {
  let svc: MenuService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [MenuService],
    }).compile();
    svc = mod.get(MenuService);
  });

  it("SUPER_ADMIN 看到所有菜单", () => {
    const menus = svc.getMenusByRoles(["SUPER_ADMIN"]);
    expect(menus.length).toBeGreaterThan(0);
    expect(menus.some((m) => m.title === "工作台")).toBe(true);
  });

  it("OPERATION_ADMIN 看到其角色允许的菜单", () => {
    const menus = svc.getMenusByRoles(["OPERATION_ADMIN"]);
    expect(menus.length).toBeGreaterThan(0);
    expect(menus.some((m) => m.title === "工作台")).toBe(true);
  });

  it("无角色的用户看不到管理菜单", () => {
    const menus = svc.getMenusByRoles([]);
    expect(menus.length).toBe(0);
  });

  it("未知角色的用户看不到管理菜单", () => {
    const menus = svc.getMenusByRoles(["UNKNOWN_ROLE"]);
    expect(menus.length).toBe(0);
  });

  it("有空菜单组时不崩溃", () => {
    const menus = svc.getMenusByRoles(["GUEST"] as any);
    expect(Array.isArray(menus)).toBe(true);
  });
});
