import { Test } from "@nestjs/testing";
import { PermissionService } from "./permission.service";
import { PrismaService } from "../../prisma/prisma.service";

const mockPrisma = {
  permission: { findMany: jest.fn() },
  rolePermission: {
    findMany: jest.fn(),
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  userRole: { findMany: jest.fn() },
  $transaction: jest.fn().mockImplementation((fn: (prisma: typeof mockPrisma) => unknown) => fn(mockPrisma)),
};

describe("PermissionService", () => {
  let svc: PermissionService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        PermissionService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    svc = mod.get(PermissionService);
  });

  beforeEach(() => jest.clearAllMocks());

  it("应被定义", () => expect(svc).toBeDefined());

  describe("getRolePermissions", () => {
    it("获取角色权限列表", async () => {
      mockPrisma.rolePermission.findMany.mockResolvedValue([
        { permission: { key: "user:read" } },
        { permission: { key: "user:write" } },
      ]);
      const result = await svc.getRolePermissions("SUPER_ADMIN");
      expect(result).toEqual(["user:read", "user:write"]);
    });

    it("角色无权限时返回空数组", async () => {
      mockPrisma.rolePermission.findMany.mockResolvedValue([]);
      const result = await svc.getRolePermissions("GUEST");
      expect(result).toEqual([]);
    });
  });

  describe("setRolePermissions", () => {
    it("设置角色权限", async () => {
      mockPrisma.permission.findMany.mockResolvedValue([
        { id: "p1", key: "content:read" },
        { id: "p2", key: "content:write" },
      ]);
      const result = await svc.setRolePermissions("EDITOR", ["content:read", "content:write"]);
      expect(result.permissions).toEqual(["content:read", "content:write"]);
      expect(mockPrisma.rolePermission.deleteMany).toHaveBeenCalledWith(
        { where: { roleType: "EDITOR" } },
      );
    });

    it("清空角色权限", async () => {
      mockPrisma.permission.findMany.mockResolvedValue([]);
      const result = await svc.setRolePermissions("EDITOR", []);
      expect(result.permissions).toEqual([]);
      expect(mockPrisma.rolePermission.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.rolePermission.createMany).not.toHaveBeenCalled();
    });
  });

  describe("getAllPermissions", () => {
    it("获取所有权限定义", async () => {
      mockPrisma.permission.findMany.mockResolvedValue([
        { id: "p1", key: "user:read", module: "user" },
        { id: "p2", key: "content:write", module: "content" },
      ]);
      const result = await svc.getAllPermissions();
      expect(result).toHaveLength(2);
    });
  });

  describe("getUserPermissions", () => {
    it("获取用户权限列表", async () => {
      mockPrisma.userRole.findMany.mockResolvedValue([
        { roleType: "ADMIN" },
        { roleType: "EDITOR" },
      ]);
      mockPrisma.rolePermission.findMany.mockResolvedValue([
        { permission: { key: "user:read" } },
        { permission: { key: "content:read" } },
        { permission: { key: "user:read" } }, // 重复的去重
      ]);
      const result = await svc.getUserPermissions("u1");
      expect(result).toHaveLength(2);
      expect(result).toContain("user:read");
    });

    it("用户无角色时返回空", async () => {
      mockPrisma.userRole.findMany.mockResolvedValue([]);
      const result = await svc.getUserPermissions("u1");
      expect(result).toEqual([]);
    });
  });
});
