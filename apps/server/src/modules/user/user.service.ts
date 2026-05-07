import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RoleType } from "@prisma/client";

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, nickname: true, avatar: true, gender: true,
        memberLevel: true, memberExpire: true, createdAt: true,
        roles: { select: { roleType: true, bindId: true } },
        station: { select: { id: true, name: true, code: true } },
        operator: { select: { id: true, level: true } },
      },
    });
    if (!user) throw new NotFoundException("用户不存在");
    return user;
  }

  async listUsers(params: {
    page: number;
    pageSize: number;
    keyword?: string;
    roleType?: RoleType;
  }) {
    const { page, pageSize, keyword, roleType } = params;
    const where: any = {};

    if (keyword) {
      where.OR = [
        { nickname: { contains: keyword } },
        { phone: { contains: keyword } },
      ];
    }
    if (roleType) {
      where.roles = { some: { roleType } };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true, nickname: true, avatar: true, phone: true,
          memberLevel: true, status: true, createdAt: true,
          roles: { select: { roleType: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total, page, pageSize };
  }

  async assignRole(userId: string, roleType: RoleType, bindId?: string) {
    return this.prisma.userRole.upsert({
      where: { userId_roleType_bindId: { userId, roleType, bindId: bindId ?? "" } },
      create: { userId, roleType, bindId },
      update: {},
    });
  }

  async removeRole(userId: string, roleType: RoleType, bindId?: string) {
    await this.prisma.userRole.deleteMany({
      where: { userId, roleType, bindId: bindId ?? "" },
    });
    return { success: true };
  }

  async getMemberPurchases(userId: string) {
    return this.prisma.memberPurchase.findMany({
      where: { userId },
      orderBy: { paidAt: "desc" },
    });
  }
}
