import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../../common/business.exception";
import { ErrorCode } from "../../../common/error-codes";
import { PrismaService } from "../../../prisma/prisma.service";

/**
 * 线下驿站-共享叶子域（从 offline.service 拆出·纯搬家不改逻辑）。
 * 职责：被多域共享的辅助——归属越权校验 assertStationOwner（课程/商品/预约/订单/结算域共用）
 * 与讲师批量加载 loadTeachers（品牌主页域 + 课程域共用）。
 * 依赖方向：叶子（仅 prisma）·被各业务域单向注入·不反向依赖任何业务域（破环）。
 */
@Injectable()
export class OfflineSharedService {
  constructor(private prisma: PrismaService) {}

  /** 校验调用者是目标驿站拥有者，防跨驿站越权 */
  async assertStationOwner(userId: string, stationId: string) {
    const station = await this.prisma.stationOffline.findUnique({ where: { id: stationId }, select: { ownerUserId: true } });
    if (!station) throw new BusinessException(ErrorCode.NOT_FOUND, "驿站不存在");
    if (station.ownerUserId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "无权操作该驿站");
  }

  /** 批量加载讲师信息（OfflineCourse.teacherId → StationTeacher）*/
  async loadTeachers(teacherIds: (string | null)[]) {
    const ids = [...new Set(teacherIds.filter((x): x is string => !!x))];
    if (!ids.length) return new Map<string, { id: string; name: string; avatar: string | null; specialties: string[] }>();
    const teachers = await this.prisma.stationTeacher.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, avatar: true, specialties: true },
    });
    return new Map(teachers.map((t) => [t.id, t]));
  }
}
