import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateRoomDto, UpdateRoomDto } from "./live.dto";

@Injectable()
export class LiveService {
  constructor(private prisma: PrismaService) {}

  async createRoom(userId: string, dto: CreateRoomDto) {
    const data: any = {
      userId,
      title: dto.title,
      cover: dto.cover,
      circleId: dto.circleId,
      hostUserId: dto.hostUserId || userId,
      hostType: dto.circleId ? "CIRCLE_OWNER" : "STATION_MASTER",
      coHostIds: dto.coHostIds || [],
      chargeType: dto.chargeType || "FREE",
      chargePrice: dto.chargePrice,
      status: "WAITING",
    };

    if (dto.productIds?.length) {
      data.products = {
        create: dto.productIds.map(productId => ({ productId })),
      };
    }

    return this.prisma.liveRoom.create({ data, include: { products: true } });
  }

  async updateRoom(id: string, dto: UpdateRoomDto) {
    return this.prisma.liveRoom.update({ where: { id }, data: dto as any });
  }

  async updateStatus(id: string, status: string, extra?: { pushUrl?: string; pullUrl?: string; trtcRoomId?: string; replayUrl?: string }) {
    const data: any = { status };
    if (status === "LIVING") {
      data.startTime = new Date();
      if (extra?.pushUrl) data.pushUrl = extra.pushUrl;
      if (extra?.pullUrl) data.pullUrl = extra.pullUrl;
      if (extra?.trtcRoomId) data.trtcRoomId = extra.trtcRoomId;
    }
    if (status === "REPLAY" && extra?.replayUrl) data.replayUrl = extra.replayUrl;
    if (status === "ENDED") data.endTime = new Date();

    return this.prisma.liveRoom.update({ where: { id }, data });
  }

  async endRoom(id: string) {
    return this.updateStatus(id, "ENDED");
  }

  async listRooms(status?: string, page = 1, pageSize = 20) {
    const where: any = {};
    if (status) where.status = status;

    const [rooms, total] = await Promise.all([
      this.prisma.liveRoom.findMany({
        where,
        include: {
          user: { select: { id: true, nickname: true, avatar: true } },
          circle: { select: { id: true, name: true } },
          _count: { select: { products: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.liveRoom.count({ where }),
    ]);

    return { rooms, total, page, pageSize };
  }

  async getRoom(id: string) {
    const room = await this.prisma.liveRoom.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
        circle: { select: { id: true, name: true } },
        products: true,
      },
    });
    if (!room) throw new NotFoundException("直播间不存在");

    await this.prisma.liveRoom.update({ where: { id }, data: { viewCount: { increment: 1 } } });
    return room;
  }

  async deleteRoom(id: string) {
    await this.prisma.liveRoom.delete({ where: { id } });
    return { success: true };
  }
}
