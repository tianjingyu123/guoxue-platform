import { Test } from "@nestjs/testing";
import { MenuController } from "./menu.controller";
import { MenuService } from "./menu.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

const mockMenuSvc = {
  getMenusByRoles: jest.fn().mockResolvedValue([
    { id: "m1", label: "首页", path: "/", children: [] },
  ]),
};

describe("MenuController", () => {
  let ctrl: MenuController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [MenuController],
      providers: [{ provide: MenuService, useValue: mockMenuSvc }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(MenuController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("GET /auth/menus — 根据角色获取菜单（字符串role）", async () => {
    const req: any = { user: { roles: ["SUPER_ADMIN"] } };
    const result: any = await ctrl.getMenus(req);
    expect(result).toHaveLength(1);
    expect(mockMenuSvc.getMenusByRoles).toHaveBeenCalledWith(["SUPER_ADMIN"]);
  });

  it("GET /auth/menus — 根据角色获取菜单（对象roleType）", async () => {
    const req: any = { user: { roles: [{ roleType: "OPERATION_ADMIN" }] } };
    const result: any = await ctrl.getMenus(req);
    expect(result).toHaveLength(1);
    expect(mockMenuSvc.getMenusByRoles).toHaveBeenCalledWith(["OPERATION_ADMIN"]);
  });

  it("GET /auth/menus — 无角色时传空数组", async () => {
    const req: any = { user: {} };
    await ctrl.getMenus(req);
    expect(mockMenuSvc.getMenusByRoles).toHaveBeenCalledWith([]);
  });
});
