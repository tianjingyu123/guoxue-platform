import { Test } from "@nestjs/testing";
import { CanActivate } from "@nestjs/common";
import { AddressController } from "./address.controller";
import { AddressService } from "./address.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

const mockService: Record<string, jest.Mock> = {
  list: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  setDefault: jest.fn(),
};

const mockGuard: CanActivate = { canActivate: () => true };

describe("AddressController", () => {
  let ctrl: AddressController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [AddressController],
      providers: [{ provide: AddressService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard).useValue(mockGuard)
      .compile();
    ctrl = mod.get(AddressController);
  });

  beforeEach(() => jest.clearAllMocks());

  it("应被定义", () => expect(ctrl).toBeDefined());

  it("获取收货地址列表", async () => {
    mockService.list.mockResolvedValue([{ id: "a1", name: "张三" }]);
    const result: any = await ctrl.list({ user: { id: "u1" } } as any);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("张三");
  });

  it("新增收货地址", async () => {
    mockService.create.mockResolvedValue({ id: "a1", name: "张三", phone: "13800000000" });
    const dto = { name: "张三", phone: "13800000000", province: "北京", city: "北京", district: "朝阳", detail: "xx路1号" };
    const result: any = await ctrl.create({ user: { id: "u1" } } as any, dto as any);
    expect(result.id).toBe("a1");
    expect(mockService.create).toHaveBeenCalledWith("u1", dto);
  });

  it("编辑收货地址", async () => {
    mockService.update.mockResolvedValue({ id: "a1", name: "李四" });
    const result: any = await ctrl.update({ user: { id: "u1" } } as any, "a1", { name: "李四" } as any);
    expect(result.name).toBe("李四");
    expect(mockService.update).toHaveBeenCalledWith("a1", "u1", expect.objectContaining({ name: "李四" }));
  });

  it("删除收货地址", async () => {
    mockService.delete.mockResolvedValue({ message: "已删除" });
    const result: any = await ctrl.delete({ user: { id: "u1" } } as any, "a1");
    expect(result.message).toBe("已删除");
    expect(mockService.delete).toHaveBeenCalledWith("a1", "u1");
  });

  it("设为默认地址", async () => {
    mockService.setDefault.mockResolvedValue({ id: "a1", isDefault: true });
    const result: any = await ctrl.setDefault({ user: { id: "u1" } } as any, "a1");
    expect(result.isDefault).toBe(true);
    expect(mockService.setDefault).toHaveBeenCalledWith("a1", "u1");
  });
});
