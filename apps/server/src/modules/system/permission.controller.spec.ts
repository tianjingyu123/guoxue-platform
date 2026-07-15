import { Test } from "@nestjs/testing";
import { CanActivate } from "@nestjs/common";
import { PermissionController } from "./permission.controller";
import { PermissionService } from "./permission.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";

const mockService: Record<string, jest.Mock> = {
  getRolePermissions: jest.fn(),
  setRolePermissions: jest.fn(),
  getAllPermissions: jest.fn(),
  getUserPermissions: jest.fn(),
};

const mockGuard: CanActivate = { canActivate: () => true };

describe("PermissionController", () => {
  let ctrl: PermissionController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [PermissionController],
      providers: [{ provide: PermissionService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard).useValue(mockGuard)
      .overrideGuard(RolesGuard).useValue(mockGuard)
      .compile();
    ctrl = mod.get(PermissionController);
  });

  beforeEach(() => jest.clearAllMocks());

  it("应被定义", () => expect(ctrl).toBeDefined());

  it("获取角色权限列表", async () => {
    mockService.getRolePermissions.mockResolvedValue(["user:read", "user:write"]);
    const result: any = await ctrl.getRolePermissions("SUPER_ADMIN");
    expect(result.permissions).toEqual(["user:read", "user:write"]);
  });

  it("获取角色权限——空权限", async () => {
    mockService.getRolePermissions.mockResolvedValue([]);
    const result: any = await ctrl.getRolePermissions("GUEST");
    expect(result.permissions).toHaveLength(0);
  });

  it("更新角色权限——透传操作人 id 供审计", async () => {
    mockService.setRolePermissions.mockResolvedValue({ permissions: ["content:read", "content:write"] });
    const result: any = await ctrl.setRolePermissions("EDITOR", { permissions: ["content:read", "content:write"] }, { user: { id: "admin1" } } as any);
    expect(result.permissions).toEqual(["content:read", "content:write"]);
    expect(mockService.setRolePermissions).toHaveBeenCalledWith("EDITOR", ["content:read", "content:write"], "admin1");
  });

  it("更新角色权限——空数组", async () => {
    mockService.setRolePermissions.mockResolvedValue({ permissions: [] });
    const result: any = await ctrl.setRolePermissions("EDITOR", { permissions: [] }, { user: { id: "admin1" } } as any);
    expect(result.permissions).toHaveLength(0);
  });
});
