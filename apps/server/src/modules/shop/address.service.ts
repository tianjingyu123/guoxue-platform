import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class AddressService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    return this.prisma.shippingAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    });
  }

  async create(userId: string, dto: { name: string; phone: string; province: string; city: string; district: string; detail: string }) {
    const count = await this.prisma.shippingAddress.count({ where: { userId } });
    const isDefault = count === 0; // 第一个地址默认设为默认
    return this.prisma.shippingAddress.create({ data: { ...dto, userId, isDefault } });
  }

  async update(id: string, userId: string, dto: { name?: string; phone?: string; province?: string; city?: string; district?: string; detail?: string }) {
    const addr = await this.prisma.shippingAddress.findFirst({ where: { id, userId } });
    if (!addr) throw new BusinessException(ErrorCode.NOT_FOUND, "地址不存在");
    return this.prisma.shippingAddress.update({ where: { id }, data: dto });
  }

  async delete(id: string, userId: string) {
    const addr = await this.prisma.shippingAddress.findFirst({ where: { id, userId } });
    if (!addr) throw new BusinessException(ErrorCode.NOT_FOUND, "地址不存在");
    return this.prisma.shippingAddress.delete({ where: { id } });
  }

  async setDefault(id: string, userId: string) {
    const addr = await this.prisma.shippingAddress.findFirst({ where: { id, userId } });
    if (!addr) throw new BusinessException(ErrorCode.NOT_FOUND, "地址不存在");
    await this.prisma.shippingAddress.updateMany({ where: { userId }, data: { isDefault: false } });
    return this.prisma.shippingAddress.update({ where: { id }, data: { isDefault: true } });
  }
}
