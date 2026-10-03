import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { Prisma, RoleType } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { maskPhone, maskEmail } from "../../common/crypto.util";
import * as fs from "fs";
import * as path from "path";
import { createGzip } from "zlib";
import { pipeline as streamPipeline } from "stream/promises";

/** 导出列定义 */
interface Column {
  key: string;
  label: string;
  format?: (val: unknown) => string;
}

@Injectable()
export class ExportService {
  constructor(private prisma: PrismaService) {}

  // ───────── CSV 导出 ─────────

  /** 通用 CSV 导出（添加 BOM 兼容 Excel） */
  csvStringify(columns: Column[], rows: Record<string, unknown>[]): string {
    const bom = "﻿"; // UTF-8 BOM
    const header = columns.map((c) => this.escapeCsvField(c.label)).join(",");
    const body = rows.map((row) =>
      columns.map((c) => {
        const rawVal = c.format ? c.format(row[c.key]) : row[c.key];
        return this.escapeCsvField(rawVal == null ? "" : String(rawVal));
      }).join(","),
    ).join("\r\n");
    return `${bom}${header}\r\n${body}`;
  }

  /** CSV 流式导出（大文件模式，返回临时文件路径） */
  async csvStream(
    columns: Column[],
    query: (skip: number, take: number) => Promise<any[]>,
    total: number,
    batchSize = 5000,
  ): Promise<string> {
    const tmpDir = path.join(process.cwd(), "tmp");
    fs.mkdirSync(tmpDir, { recursive: true });
    const filePath = path.join(tmpDir, `export-${Date.now()}.csv`);

    const writeStream = fs.createWriteStream(filePath);
    const bom = "﻿";
    writeStream.write(bom);

    // 写入表头
    writeStream.write(columns.map((c) => this.escapeCsvField(c.label)).join(",") + "\r\n");

    let offset = 0;
    while (offset < total) {
      const rows = await query(offset, batchSize);
      for (const row of rows) {
        const line = columns.map((c) => {
          const val = c.format ? c.format(row[c.key]) : row[c.key];
          return this.escapeCsvField(val ?? "");
        }).join(",");
        writeStream.write(line + "\r\n");
      }
      offset += rows.length;
      if (rows.length < batchSize) break;
    }

    writeStream.end();
    return new Promise((resolve, reject) => {
      writeStream.on("finish", () => resolve(filePath));
      writeStream.on("error", reject);
    });
  }

  // ───────── Excel 导出 ─────────

  /** 导出为 Excel（HTML table 格式，不依赖第三方库，支持中文） */
  exportExcel(columns: Column[], rows: Record<string, unknown>[], sheetName?: string): Buffer {
    const bom = "﻿";
    const sheetNameSafe = sheetName || "Sheet1";

    let html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8">
<!--[if gte mso 9]>
<xml>
  <x:ExcelWorkbook>
    <x:ExcelWorksheets>
      <x:ExcelWorksheet>
        <x:Name>${this.escapeHtml(sheetNameSafe)}</x:Name>
      </x:ExcelWorksheet>
    </x:ExcelWorksheets>
  </x:ExcelWorkbook>
</xml>
<![endif]-->
<style>td{mso-number-format:"\\@";}</style>
</head>
<body>
<table>`;

    // 表头
    html += "<tr>" + columns.map((c) => `<th>${this.escapeHtml(c.label)}</th>`).join("") + "</tr>";

    // 数据行
    for (const row of rows) {
      html += "<tr>" + columns.map((c) => {
        const rawVal = c.format ? c.format(row[c.key]) : row[c.key];
        const val = rawVal == null ? "" : String(rawVal);
        return `<td>${this.escapeHtml(val)}</td>`;
      }).join("") + "</tr>";
    }

    html += `</table>
</body>
</html>`;

    return Buffer.from(bom + html, "utf-8");
  }

  /** 通用 Excel 导出（根据 type 选择对应的数据和列定义） */
  async exportToExcel(
    type: "users" | "orders",
    filters?: Record<string, any>,
  ): Promise<Buffer> {
    if (type === "users") return this.exportUsersExcel(filters);
    if (type === "orders") return this.exportOrdersExcel(filters);
    throw new BusinessException(ErrorCode.BAD_REQUEST, `不支持的导出类型: ${type}`);
  }

  private async exportUsersExcel(filters?: Record<string, any>): Promise<Buffer> {
    const where: Prisma.UserWhereInput = {};
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters?.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters?.endDate) where.createdAt.lte = new Date(filters.endDate);
    }
    if (filters?.role) where.roles = { some: { roleType: filters.role as RoleType } };

    const users = await this.prisma.user.findMany({ where, orderBy: { createdAt: "desc" } });

    const columns: Column[] = [
      { key: "id", label: "用户ID" },
      { key: "nickname", label: "昵称" },
      { key: "phone", label: "手机号", format: (v) => maskPhone(v as string) },
      { key: "email", label: "邮箱", format: (v) => maskEmail(v as string) },
      { key: "role", label: "角色" },
      { key: "status", label: "状态" },
      { key: "createdAt", label: "注册时间", format: (v) => v ? new Date(v as string).toISOString() : "" },
    ];

    const rows = users.map((u) => ({
      id: u.id,
      nickname: u.nickname,
      phone: u.phone || "",
      email: u.email || "",
      role: ((u as any).roles as Array<{ roleType: string }>)?.map((r) => r.roleType).join(",") || "",
      status: u.status,
      createdAt: u.createdAt,
    }));

    return this.exportExcel(columns, rows, "用户数据");
  }

  private async exportOrdersExcel(filters?: Record<string, any>): Promise<Buffer> {
    const where: Prisma.OrderWhereInput = {};
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters?.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters?.endDate) where.createdAt.lte = new Date(filters.endDate);
    }
    if (filters?.status) where.status = filters.status as any;
    if (filters?.type) where.type = filters.type as any;

    const orders = await this.prisma.order.findMany({
      where, orderBy: { createdAt: "desc" },
      include: { user: { select: { nickname: true } } },
    });

    const columns: Column[] = [
      { key: "id", label: "订单号" },
      { key: "userId", label: "用户ID" },
      { key: "type", label: "类型" },
      { key: "amount", label: "金额" },
      { key: "payMethod", label: "支付方式" },
      { key: "status", label: "状态" },
      { key: "createdAt", label: "创建时间", format: (v) => v ? new Date(v as string).toISOString() : "" },
    ];

    const rows = orders.map((o) => ({
      id: o.id,
      userId: o.userId,
      type: o.type,
      amount: o.amount,
      payMethod: o.payMethod || "",
      status: o.status,
      createdAt: o.createdAt,
    }));

    return this.exportExcel(columns, rows, "订单数据");
  }

  // ───────── 内置导出模板 ─────────

  /** 导出用户 */
  async exportUsers(filters?: { startDate?: string; endDate?: string; role?: string }) {
    const where: Prisma.UserWhereInput = {};
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters?.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters?.endDate) where.createdAt.lte = new Date(filters.endDate);
    }
    if (filters?.role) where.roles = { some: { roleType: filters.role as RoleType } };

    const total = await this.prisma.user.count({ where });
    const columns: Column[] = [
      { key: "id", label: "用户ID" },
      { key: "nickname", label: "昵称" },
      { key: "phone", label: "手机号", format: (v) => maskPhone(v as string) },
      { key: "email", label: "邮箱", format: (v) => maskEmail(v as string) },
      { key: "role", label: "角色" },
      { key: "status", label: "状态" },
      { key: "createdAt", label: "注册时间", format: (v) => v ? new Date(v as string).toISOString() : "" },
    ];

    return this.csvStream(columns, (skip, take) =>
      this.prisma.user.findMany({ where, skip, take, orderBy: { createdAt: "desc" } }), total);
  }

  /** 导出订单 */
  async exportOrders(filters?: { startDate?: string; endDate?: string; status?: string; type?: string }) {
    const where: Prisma.OrderWhereInput = {};
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters?.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters?.endDate) where.createdAt.lte = new Date(filters.endDate);
    }
    if (filters?.status) where.status = filters.status as Prisma.OrderWhereInput["status"];
    if (filters?.type) where.type = filters.type as Prisma.OrderWhereInput["type"];

    const total = await this.prisma.order.count({ where });
    const columns: Column[] = [
      { key: "id", label: "订单号" },
      { key: "userId", label: "用户ID" },
      { key: "type", label: "类型" },
      { key: "amount", label: "金额" },
      { key: "payMethod", label: "支付方式" },
      { key: "status", label: "状态" },
      { key: "payTransactionId", label: "支付交易号" },
      { key: "createdAt", label: "创建时间", format: (v) => v ? new Date(v as string).toISOString() : "" },
      { key: "paidAt", label: "支付时间", format: (v) => v ? new Date(v as string).toISOString() : "" },
    ];

    return this.csvStream(columns, (skip, take) =>
      this.prisma.order.findMany({ where, skip, take, orderBy: { createdAt: "desc" },
        include: { user: { select: { nickname: true } } },
      }).then(rows => rows.map(r => ({ ...r, userName: r.user?.nickname || "" }))),
    total);
  }

  /** 导出内容 */
  async exportContents(filters?: { startDate?: string; endDate?: string; type?: string }) {
    const where: Prisma.ContentWhereInput = {};
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters?.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters?.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const total = await this.prisma.content.count({ where });
    const columns: Column[] = [
      { key: "id", label: "内容ID" },
      { key: "title", label: "标题" },
      { key: "excerpt", label: "摘要" },
      { key: "author", label: "作者" },
      { key: "viewCount", label: "浏览量" },
      { key: "createdAt", label: "创建时间", format: (v) => v ? new Date(v as string).toISOString() : "" },
    ];

    return this.csvStream(columns, (skip, take) =>
      this.prisma.content.findMany({ where, skip, take, orderBy: { createdAt: "desc" } }), total);
  }

  /** 导出审计日志 */
  async exportAuditLogs(filters?: { startDate?: string; endDate?: string; action?: string }) {
    const where: Prisma.AuditLogWhereInput = {};
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters?.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters?.endDate) where.createdAt.lte = new Date(filters.endDate);
    }
    if (filters?.action) where.action = filters.action;

    const total = await this.prisma.auditLog.count({ where });
    const columns: Column[] = [
      { key: "id", label: "ID" },
      { key: "userId", label: "用户ID" },
      { key: "action", label: "操作" },
      { key: "targetType", label: "目标类型" },
      { key: "targetId", label: "目标ID" },
      { key: "detail", label: "详情" },
      { key: "ip", label: "IP" },
      { key: "createdAt", label: "时间", format: (v) => v ? new Date(v as string).toISOString() : "" },
    ];

    return this.csvStream(columns, (skip, take) =>
      this.prisma.auditLog.findMany({ where, skip, take, orderBy: { createdAt: "desc" } }), total);
  }

  /** 导出佣金收益 */
  async exportEarnings(filters?: { stationId?: string; startDate?: string; endDate?: string }) {
    const where: Prisma.StationEarningWhereInput = {};
    if (filters?.stationId) where.stationId = filters.stationId;
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters?.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters?.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const total = await this.prisma.stationEarning.count({ where });
    const columns: Column[] = [
      { key: "id", label: "ID" },
      { key: "stationId", label: "分站ID" },
      { key: "orderId", label: "订单ID" },
      { key: "type", label: "类型" },
      { key: "amount", label: "订单金额" },
      { key: "rate", label: "佣金比例" },
      { key: "earned", label: "佣金" },
      { key: "createdAt", label: "时间", format: (v) => v ? new Date(v as string).toISOString() : "" },
    ];

    return this.csvStream(columns, (skip, take) =>
      this.prisma.stationEarning.findMany({ where, skip, take, orderBy: { createdAt: "desc" } }), total);
  }

  /** 导出为 JSON 格式 */
  async exportJson(data: unknown[], filename: string): Promise<string> {
    const tmpDir = path.join(process.cwd(), "tmp");
    fs.mkdirSync(tmpDir, { recursive: true });
    const filePath = path.join(tmpDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    return filePath;
  }

  // ───────── 商品批量导入 ─────────

  /** 批量导入商品（解析 CSV/TSV 格式 Buffer） */
  async importProducts(fileBuffer: Buffer): Promise<{ success: boolean; imported: number; failed: number; errors: string[] }> {
    let text = fileBuffer.toString("utf-8");
    // 去除 UTF-8 BOM
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) {
      return { success: false, imported: 0, failed: 0, errors: ["文件无数据行"] };
    }

    const headers = this.parseCsvLine(lines[0]);
    const errors: string[] = [];
    let imported = 0;
    let failed = 0;

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      if (values.length === 0) continue;

      const row: Record<string, string> = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j].trim().toLowerCase()] = (values[j] || "").trim();
      }

      try {
        const title = row["title"] || row["标题"];
        const priceStr = row["price"] || row["价格"];
        const intro = row["intro"] || row["简介"] || "";
        const stockStr = row["stock"] || row["库存"] || "0";
        const cover = row["cover"] || row["封面"] || "";

        if (!title) {
          errors.push(`第 ${i + 1} 行: 商品标题为必填项`);
          failed++;
          continue;
        }

        const price = Number(priceStr);
        if (isNaN(price) || price < 0) {
          errors.push(`第 ${i + 1} 行: 价格格式无效 (${priceStr})`);
          failed++;
          continue;
        }

        const stock = isNaN(Number(stockStr)) ? 0 : Math.floor(Number(stockStr));

        await this.prisma.product.create({
          data: {
            title,
            price,
            intro: intro || "",
            stock,
            images: cover ? [cover] : [],
            detail: "",
            status: "PENDING",
          },
        });
        imported++;
      } catch (e) {
        errors.push(`第 ${i + 1} 行: ${(e as Error).message}`);
        failed++;
      }
    }

    return { success: failed === 0, imported, failed, errors };
  }

  /** Gzip 压缩文件 */
  async gzipFile(filePath: string): Promise<string> {
    const gzipPath = filePath + ".gz";
    const source = fs.createReadStream(filePath);
    const dest = fs.createWriteStream(gzipPath);
    const gzip = createGzip();
    await streamPipeline(source, gzip, dest);
    // 清理原始文件
    fs.unlinkSync(filePath);
    return gzipPath;
  }

  /** 清理过期临时文件（超过1小时） */
  cleanTmpFiles() {
    const tmpDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(tmpDir)) return;

    const now = Date.now();
    for (const file of fs.readdirSync(tmpDir)) {
      const filePath = path.join(tmpDir, file);
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > 3600 * 1000) {
        fs.unlinkSync(filePath);
      }
    }
  }

  private escapeCsvField(val: string): string {
    let str = String(val);
    // 防止 Excel / WPS 公式注入；带前导空白、制表符或换行的公式同样按文本输出。
    if (/^[\t\r\n ]*[=+\-@]/u.test(str)) str = `'${str}`;
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  /** 转义 HTML 特殊字符 */
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** 简单 CSV 行解析（支持引号转义，逗号/制表符分隔） */
  private parseCsvLine(line: string): string[] {
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
        } else if (ch === "," || ch === "\t") {
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
