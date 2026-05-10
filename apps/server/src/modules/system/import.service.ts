import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

export interface ImportResult {
  type: string;
  total: number;
  success: number;
  failed: number;
  errors: { row: number; field?: string; message: string }[];
}

/** CSV 列名映射（中文列名 → 数据库字段） */
const FIELD_MAP: Record<string, Record<string, string>> = {
  article: { "标题": "title", "标签": "tags", "摘要": "excerpt", "圈子ID": "circleId", "内容": "content", "分站ID": "stationId" },
  course: { "标题": "title", "简介": "intro", "价格": "price", "标签": "tags", "封面": "cover", "分站ID": "stationId" },
  product: { "标题": "title", "简介": "intro", "价格": "price", "库存": "stock", "详情": "detail", "分类ID": "categoryId", "图片": "images", "分站ID": "stationId" },
  classic: { "标题": "title", "作者": "author", "朝代": "dynasty", "分类": "category", "简介": "intro", "封面": "cover" },
  user: { "昵称": "nickname", "手机号": "phone", "邮箱": "email" },
};

/** 必填列 */
const REQUIRED_FIELDS: Record<string, string[]> = {
  article: ["标题", "圈子ID"],
  course: ["标题"],
  product: ["标题", "价格"],
  classic: ["标题"],
  user: ["昵称"],
};

@Injectable()
export class ImportService {
  constructor(private prisma: PrismaService) {}

  /** 从 CSV Buffer 导入数据 */
  async importCsv(
    type: string,
    buffer: Buffer,
    options?: { userId?: string; stationId?: string },
  ): Promise<ImportResult> {
    const fieldMap = FIELD_MAP[type];
    if (!fieldMap) throw new BadRequestException(`不支持的导入类型: ${type}`);

    const rows = this.parseCsv(buffer);
    if (rows.length === 0) throw new BadRequestException("CSV 文件无数据行");

    const required = REQUIRED_FIELDS[type] || [];
    const errors: ImportResult["errors"] = [];
    const validRows: Record<string, unknown>[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // 第1行是表头
      const mapped: Record<string, unknown> = {};
      let hasError = false;

      // 映射列名 → 数据库字段
      for (const [header, value] of Object.entries(row)) {
        const field = fieldMap[header.trim()];
        if (field) mapped[field] = value?.trim();
      }

      // 检查必填字段
      for (const reqField of required) {
        const dbField = fieldMap[reqField];
        if (!mapped[dbField]) {
          errors.push({ row: rowNum, field: dbField, message: `${reqField} 为必填项` });
          hasError = true;
        }
      }

      if (hasError) continue;

      // 类型转换与校验
      try {
        this.transformField(mapped, type);
        // 附加分站上下文
        if (options?.stationId && !mapped.stationId) {
          mapped.stationId = options.stationId;
        }
        validRows.push(mapped);
      } catch (e: unknown) {
        errors.push({ row: rowNum, message: (e as Error).message });
      }
    }

    // 批量写入数据库
    let inserted = 0;
    if (validRows.length > 0) {
      inserted = await this.batchInsert(type, validRows, options);
    }

    return {
      type,
      total: rows.length,
      success: inserted,
      failed: rows.length - inserted,
      errors,
    };
  }

  /** 批量写入 */
  private async batchInsert(
    type: string,
    rows: Record<string, unknown>[],
    options?: { userId?: string },
  ): Promise<number> {
    const userId = options?.userId;

    switch (type) {
      case "article": {
        const data = rows.map((r) => ({
          title: r.title as string,
          content: (r.content as string) || "",
          excerpt: (r.excerpt as string) || "",
          tags: r.tags ? (r.tags as string).split(/[,，]/).map((t: string) => t.trim()) : [],
          circleId: r.circleId as string,
          userId: userId || "system",
          stationId: (r.stationId as string) || null,
          auditStatus: "APPROVED",
        }));
        await this.prisma.article.createMany({ data });
        return data.length;
      }
      case "course": {
        const data = rows.map((r) => ({
          title: r.title as string,
          intro: (r.intro as string) || "",
          price: (r.price as number) || 0,
          tags: r.tags ? (r.tags as string).split(/[,，]/).map((t: string) => t.trim()) : [],
          cover: (r.cover as string) || "",
          userId: userId || "system",
          stationId: (r.stationId as string) || null,
          auditStatus: "APPROVED",
        }));
        await this.prisma.course.createMany({ data });
        return data.length;
      }
      case "product": {
        const data = rows.map((r) => ({
          title: r.title as string,
          intro: (r.intro as string) || "",
          detail: (r.detail as string) || "",
          price: (r.price as number) || 0,
          stock: (r.stock as number) || 0,
          categoryId: (r.categoryId as string) || null,
          images: r.images ? (r.images as string).split(/[,，]/).map((t: string) => t.trim()) : [],
          status: "ON_SALE" as const,
          stationId: (r.stationId as string) || null,
        }));
        await this.prisma.product.createMany({ data });
        return data.length;
      }
      case "classic": {
        const data = rows.map((r) => ({
          title: r.title as string,
          author: (r.author as string) || "",
          dynasty: (r.dynasty as string) || "",
          category: (r.category as string) || "子",
          intro: (r.intro as string) || "",
          cover: (r.cover as string) || "",
          status: "PUBLISHED" as const,
        }));
        await this.prisma.classicBook.createMany({ data });
        return data.length;
      }
      case "user": {
        const result = await this.prisma.user.createMany({
          data: rows.map((r) => ({
            nickname: r.nickname as string,
            phone: (r.phone as string) || null,
            email: (r.email as string) || null,
          })),
          skipDuplicates: true,
        });
        return result.count;
      }
      default:
        return 0;
    }
  }

  /** 类型转换与校验 */
  private transformField(mapped: Record<string, unknown>, type: string) {
    if (mapped.price !== undefined) {
      const price = Number(mapped.price);
      if (isNaN(price) || price < 0) throw new Error(`价格格式无效: ${mapped.price}`);
      mapped.price = price;
    }
    if (mapped.stock !== undefined) {
      const stock = Number(mapped.stock);
      if (isNaN(stock) || stock < 0) throw new Error(`库存格式无效: ${mapped.stock}`);
      mapped.stock = Math.floor(stock);
    }
  }

  /** CSV 解析（支持 BOM、引号转义、逗号分隔） */
  parseCsv(buffer: Buffer): Record<string, string>[] {
    let text = buffer.toString("utf-8");

    // 去除 UTF-8 BOM
    if (text.charCodeAt(0) === 0xFEFF) {
      text = text.slice(1);
    }

    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) return [];

    const headers = this.splitCsvLine(lines[0]);
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.splitCsvLine(lines[i]);
      if (values.length === 0) continue;

      const row: Record<string, string> = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = values[j] || "";
      }
      rows.push(row);
    }

    return rows;
  }

  /** 分割 CSV 行（处理引号内的逗号和转义引号） */
  private splitCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ",") {
          result.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
    }
    result.push(current.trim());
    return result;
  }
}
