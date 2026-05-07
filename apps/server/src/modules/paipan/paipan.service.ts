import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { BaziInputDto } from "./paipan.dto";
import { calcBazi, type BaziInput, type BaziResult } from "@guoxue/bazi-engine";

@Injectable()
export class PaipanService {
  constructor(private prisma: PrismaService) {}

  /** 八字排盘计算（不保存，用于预览） */
  calcBaziPreview(dto: BaziInputDto): BaziResult {
    const input: BaziInput = {
      name: dto.name || "",
      gender: dto.gender as "男" | "女",
      year: dto.year,
      month: dto.month,
      day: dto.day,
      hour: dto.hour,
      minute: dto.minute || 0,
      city: dto.city || "",
    };
    return calcBazi(input);
  }

  /** 八字排盘并保存记录 */
  async calcBaziAndSave(userId: string, dto: BaziInputDto) {
    const input: BaziInput = {
      name: dto.name || "",
      gender: dto.gender as "男" | "女",
      year: dto.year,
      month: dto.month,
      day: dto.day,
      hour: dto.hour,
      minute: dto.minute || 0,
      city: dto.city || "",
    };

    const result = calcBazi(input);

    const record = await this.prisma.paipanRecord.create({
      data: {
        userId,
        clientName: dto.name || "",
        clientBirth: `${dto.year}-${dto.month}-${dto.day} ${dto.hour}:${dto.minute || 0}`,
        paipanType: "BAZI",
        inputParams: input as any,
        resultData: result as any,
      },
    });

    return {
      id: record.id,
      input,
      result,
    };
  }

  /** 获取单条排盘记录 */
  async getBaziRecord(id: string, userId: string) {
    const record = await this.prisma.paipanRecord.findUnique({
      where: { id },
      select: {
        id: true,
        clientName: true,
        clientBirth: true,
        inputParams: true,
        resultData: true,
        createdAt: true,
      },
    });

    if (!record) throw new NotFoundException("排盘记录不存在");

    return record;
  }

  /** 获取用户排盘历史 */
  async getUserBaziHistory(
    userId: string,
    page = 1,
    pageSize = 20,
  ) {
    const where = { userId, paipanType: "BAZI" as const };

    const [records, total] = await Promise.all([
      this.prisma.paipanRecord.findMany({
        where,
        select: {
          id: true,
          clientName: true,
          clientBirth: true,
          createdAt: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.paipanRecord.count({ where }),
    ]);

    return { records, total, page, pageSize };
  }
}
