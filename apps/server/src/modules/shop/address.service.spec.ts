import { Test, TestingModule } from "@nestjs/testing";
import { AddressService } from "./address.service";
import { PrismaService } from "../../prisma/prisma.service";

const mockPrisma = {
  shippingAddress: {
    findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(),
    update: jest.fn(), updateMany: jest.fn(), delete: jest.fn(), count: jest.fn(),
  },
};

describe("AddressService", () => {
  let svc: AddressService;

  beforeEach(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        AddressService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    svc = mod.get(AddressService);
    jest.clearAllMocks();
  });

  it("应被定义", () => expect(svc).toBeDefined());

  describe("list", () => {
    it("返回用户地址列表", async () => {
      mockPrisma.shippingAddress.findMany.mockResolvedValue([
        { id: "a1", name: "张三", isDefault: true },
      ]);
      const result = await svc.list("u1");
      expect(result).toHaveLength(1);
    });
  });

  describe("create", () => {
    it("首个地址自动设为默认", async () => {
      mockPrisma.shippingAddress.count.mockResolvedValue(0);
      mockPrisma.shippingAddress.create.mockResolvedValue({ id: "a1" });

      const result = await svc.create("u1", {
        name: "张三", phone: "13800138000", province: "广东", city: "深圳", district: "南山", detail: "科技园",
      });
      expect(result).toEqual({ id: "a1" });
      expect(mockPrisma.shippingAddress.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isDefault: true }) }),
      );
    });
  });

  describe("update", () => {
    it("地址不存在时抛出异常", async () => {
      mockPrisma.shippingAddress.findFirst.mockResolvedValue(null);
      await expect(svc.update("bad-id", "u1", { name: "李四" })).rejects.toThrow("地址不存在");
    });

    it("成功更新地址", async () => {
      mockPrisma.shippingAddress.findFirst.mockResolvedValue({ id: "a1", userId: "u1" });
      mockPrisma.shippingAddress.update.mockResolvedValue({ id: "a1", name: "李四" });

      const result = await svc.update("a1", "u1", { name: "李四" });
      expect(result.name).toBe("李四");
    });
  });

  describe("setDefault", () => {
    it("先清除其他默认再设置当前", async () => {
      mockPrisma.shippingAddress.findFirst.mockResolvedValue({ id: "a1", userId: "u1" });
      mockPrisma.shippingAddress.updateMany.mockResolvedValue({});
      mockPrisma.shippingAddress.update.mockResolvedValue({ id: "a1", isDefault: true });

      const result = await svc.setDefault("a1", "u1");
      expect(result.isDefault).toBe(true);
      expect(mockPrisma.shippingAddress.updateMany).toHaveBeenCalled();
    });
  });
});
