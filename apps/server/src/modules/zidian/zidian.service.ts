import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/** 单字条目（只含必须下沉后端的字段；其余 24 个字段由前端本地算） */
export interface ZidianEntryDto {
  char: string;
  traditional: string;
  pinyin: string;
  explanation: string;
}

/** 笔顺数据（1024×1024 坐标系，需 translate(0,900) scale(1,-1)） */
export interface StrokeDataDto {
  char: string;
  strokes: string[];
  medians: number[][][];
  radStrokes: number[];
}

@Injectable()
export class ZidianService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 批量查字（最多 8 字，与前端「最多 8 字批量查询」一致）。
   * 未收录的字不报错，直接跳过——前端仍可用本地算的康熙笔画/五行等字段展示。
   */
  async lookup(text: string): Promise<{ results: ZidianEntryDto[] }> {
    const chars = Array.from(text.trim())
      .filter((c) => /\p{Script=Han}/u.test(c))
      .slice(0, 8);
    if (chars.length === 0) return { results: [] };

    const rows = await this.prisma.zidianEntry.findMany({
      where: { char: { in: chars } },
      select: { char: true, traditional: true, pinyin: true, explanation: true },
    });

    // 按用户输入顺序返回（findMany 不保证顺序）
    const byChar = new Map(rows.map((r) => [r.char, r]));
    return { results: chars.map((c) => byChar.get(c)).filter((r): r is ZidianEntryDto => !!r) };
  }

  /** 单字详情 */
  async detail(char: string): Promise<ZidianEntryDto> {
    const row = await this.prisma.zidianEntry.findUnique({
      where: { char },
      select: { char: true, traditional: true, pinyin: true, explanation: true },
    });
    if (!row) throw new NotFoundException(`未收录该字：${char}`);
    return row;
  }

  /**
   * 按拼音检索（去声调前缀匹配，最多 50 字）。
   * 必须查 pinyinPlain：词典存的是带调拼音（德=dé），拿 'de' 去前缀匹配 'dé' 匹配不上（é≠e），
   * 早期实测搜 de 只能搜出恰好无调的 4 个字——检索形同虚设。用户输入也一并去调。
   */
  async searchByPinyin(pinyin: string): Promise<{ results: ZidianEntryDto[] }> {
    // 归一化必须与入库时的 plainPinyin 完全一致，否则前缀匹配对不上
    const q = pinyin
      .normalize("NFC")
      .replace(/[üǖǘǚǜ]/g, "v") // ü 先归一：NFD 会把两点当声调剥掉（lǚ→lu），搜 lv 就查无「吕」
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/ɡ/g, "g") // 词典拼音用 IPA 的 ɡ(U+0261)，入库已归一为 g
      .toLowerCase()
      .trim();
    if (!q) return { results: [] };
    const rows = await this.prisma.zidianEntry.findMany({
      where: { pinyinPlain: { startsWith: q } },
      select: { char: true, traditional: true, pinyin: true, explanation: true },
      orderBy: { pinyinPlain: "asc" },
      take: 50,
    });
    return { results: rows };
  }

  /**
   * 笔顺数据（hanzi-writer-data，9574 字）。
   * 原包 51MB 进不了小程序分包，按字下沉；前端 canvas 沿 medians 运笔、以 strokes 轮廓裁剪。
   * 生僻字无笔顺数据时返回 null（不报 404），前端降级为静态大字。
   */
  async strokes(char: string): Promise<StrokeDataDto | null> {
    const ch = Array.from(char.trim())[0];
    if (!ch) return null;
    const row = await this.prisma.hanziStroke.findUnique({ where: { char: ch } });
    if (!row) return null;
    return {
      char: row.char,
      strokes: row.strokes as unknown as string[],
      medians: row.medians as unknown as number[][][],
      radStrokes: (row.radStrokes as unknown as number[]) ?? [],
    };
  }

  /** 词典收录量（供前端展示与健康检查） */
  async stats(): Promise<{ total: number; strokeTotal: number }> {
    const [total, strokeTotal] = await Promise.all([
      this.prisma.zidianEntry.count(),
      this.prisma.hanziStroke.count(),
    ]);
    return { total, strokeTotal };
  }
}
