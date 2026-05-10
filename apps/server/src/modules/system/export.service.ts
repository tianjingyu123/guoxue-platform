import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
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
        const val = c.format ? c.format(row[c.key]) : row[c.key];
        return this.escapeCsvField(val ?? "");
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

  // ───────── 内置导出模板 ─────────

  /** 导出用户 */
  async exportUsers(filters?: { startDate?: string; endDate?: string; role?: string }) {
    const where: Prisma.UserWhereInput = {};
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters?.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters?.endDate) where.createdAt.lte = new Date(filters.endDate);
    }
    if (filters?.role) where.role = filters.role;

    const total = await this.prisma.user.count({ where });
    const columns: Column[] = [
      { key: "id", label: "用户ID" },
      { key: "nickname", label: "昵称" },
      { key: "phone", label: "手机号" },
      { key: "email", label: "邮箱" },
      { key: "role", label: "角色" },
      { key: "status", label: "状态" },
      { key: "createdAt", label: "注册时间", format: (v) => v ? new Date(v).toISOString() : "" },
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
    if (filters?.status) where.status = filters.status;
    if (filters?.type) where.type = filters.type;

    const total = await this.prisma.order.count({ where });
    const columns: Column[] = [
      { key: "id", label: "订单ID" },
      { key: "type", label: "类型" },
      { key: "amount", label: "金额" },
      { key: "status", label: "状态" },
      { key: "payTransactionId", label: "支付交易号" },
      { key: "createdAt", label: "创建时间", format: (v) => v ? new Date(v).toISOString() : "" },
      { key: "paidAt", label: "支付时间", format: (v) => v ? new Date(v).toISOString() : "" },
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
      { key: "createdAt", label: "创建时间", format: (v) => v ? new Date(v).toISOString() : "" },
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
      { key: "createdAt", label: "时间", format: (v) => v ? new Date(v).toISOString() : "" },
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
      { key: "createdAt", label: "时间", format: (v) => v ? new Date(v).toISOString() : "" },
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
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
}
