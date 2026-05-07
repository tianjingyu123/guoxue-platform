import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class OfflineService {
  constructor(private prisma: PrismaService) {}

  // ───────── 线下驿站 ─────────

  async createStation(dto: { name: string; city: string; address: string; phone: string; cover?: string; depositAmount?: number }, userId: string) {
    return this.prisma.stationOffline.create({
      data: {
        name: dto.name, city: dto.city, address: dto.address,
        phone: dto.phone, cover: dto.cover, depositAmount: dto.depositAmount ?? 0,
        ownerUserId: userId,
      },
    });
  }

  async listStations(page = 1, pageSize = 20, city?: string, status?: string) {
    const where: any = {};
    if (city) where.city = city;
    if (status) where.status = status;

    const [stations, total] = await Promise.all([
      this.prisma.stationOffline.findMany({
        where,
        include: { owner: { select: { id: true, nickname: true } } },
        skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.stationOffline.count({ where }),
    ]);
    return { stations, total, page, pageSize };
  }

  async getStation(id: string) {
    const s = await this.prisma.stationOffline.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, nickname: true, avatar: true } },
        courses: true, products: true,
      },
    });
    if (!s) throw new NotFoundException("驿站不存在");
    return s;
  }

  async auditStation(id: string, status: string) {
    return this.prisma.stationOffline.update({ where: { id }, data: { status } });
  }

  // ───────── 线下课程 ─────────

  async createOfflineCourse(dto: { stationId: string; title: string; cover?: string; intro?: string; teacherId?: string; price?: number; maxStudents: number; startTime: string; endTime: string; location: string }) {
    return this.prisma.offlineCourse.create({
      data: {
        ...dto,
        price: dto.price ?? 0,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
      },
    });
  }

  async listOfflineCourses(stationId: string) {
    return this.prisma.offlineCourse.findMany({
      where: { stationId },
      orderBy: { startTime: "asc" },
    });
  }

  // ───────── 研究院 ─────────

  async listMembers(page = 1, pageSize = 20) {
    const [members, total] = await Promise.all([
      this.prisma.instituteMember.findMany({
        include: { user: { select: { id: true, nickname: true, avatar: true } } },
        skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { joinedAt: "desc" },
      }),
      this.prisma.instituteMember.count(),
    ]);
    return { members, total, page, pageSize };
  }

  async updateMember(id: string, dto: { role?: string; status?: string }) {
    return this.prisma.instituteMember.update({ where: { id }, data: dto as any });
  }
}
