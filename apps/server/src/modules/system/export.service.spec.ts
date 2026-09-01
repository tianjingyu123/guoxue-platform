import { Test, TestingModule } from "@nestjs/testing"
import { ExportService } from "./export.service"
import { PrismaService } from "../../prisma/prisma.service"
import * as fs from "fs"
import * as path from "path"

function mockPrisma() {
  return {
    user: { findMany: jest.fn(), count: jest.fn() },
    order: { findMany: jest.fn(), count: jest.fn() },
    content: { findMany: jest.fn(), count: jest.fn() },
    auditLog: { findMany: jest.fn(), count: jest.fn() },
    stationEarning: { findMany: jest.fn(), count: jest.fn() },
  }
}

describe("ExportService", () => {
  let svc: ExportService
  let prisma: ReturnType<typeof mockPrisma>

  beforeAll(async () => {
    prisma = mockPrisma()
    const m: TestingModule = await Test.createTestingModule({
      providers: [
        ExportService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()
    svc = m.get(ExportService)
  })

  // ─── csvStringify ───

  describe("csvStringify", () => {
    it("生成带 BOM 的 CSV", () => {
      const cols = [
        { key: "id", label: "ID" },
        { key: "name", label: "名称" },
      ]
      const rows = [{ id: "1", name: "测试" }, { id: "2", name: "国学" }]
      const csv = svc.csvStringify(cols, rows)
      expect(csv.startsWith("﻿")).toBe(true) // BOM
      expect(csv).toContain("ID,名称")
      expect(csv).toContain("1,测试")
      expect(csv).toContain("2,国学")
    })

    it("format 函数格式化字段值", () => {
      const cols = [{ key: "createdAt", label: "时间", format: (v: any) => v ? new Date(v).toISOString() : "" }]
      const rows = [{ createdAt: "2026-01-15T00:00:00Z" }]
      const csv = svc.csvStringify(cols, rows)
      expect(csv).toContain("2026-01-15")
    })

    it("值为 null 时输出空字符串", () => {
      const cols = [{ key: "phone", label: "手机" }]
      const rows = [{ phone: null }]
      const csv = svc.csvStringify(cols, rows)
      const lines = csv.split("\r\n")
      expect(lines[1]).toBe("")
    })

    it("字段含逗号时加引号转义", () => {
      const cols = [{ key: "title", label: "标题" }]
      const rows = [{ title: "国学,入门" }]
      const csv = svc.csvStringify(cols, rows)
      expect(csv).toContain('"国学,入门"')
    })

    it("字段含引号时双写转义", () => {
      const cols = [{ key: "title", label: "标题" }]
      const rows = [{ title: '国学"经典"' }]
      const csv = svc.csvStringify(cols, rows)
      expect(csv).toContain('"国学""经典"""')
    })

    it("字段含换行时加引号", () => {
      const cols = [{ key: "content", label: "内容" }]
      const rows = [{ content: "第一行\r\n第二行" }]
      const csv = svc.csvStringify(cols, rows)
      expect(csv).toContain('"第一行\r\n第二行"')
    })

    it("疑似表格公式按文本导出，防止 Excel / WPS 执行", () => {
      const cols = [{ key: "nickname", label: "昵称" }]
      const rows = [
        { nickname: '=HYPERLINK("https://evil.example")' },
        { nickname: "\t+cmd|' /C calc'!A0" },
      ]
      const csv = svc.csvStringify(cols, rows)
      expect(csv).toContain("'=HYPERLINK")
      expect(csv).toContain("'\t+cmd")
    })
  })

  // ─── exportUsers ───

  describe("exportUsers", () => {
    it("按日期范围导出用户", async () => {
      prisma.user.count.mockResolvedValue(2)
      prisma.user.findMany.mockResolvedValue([
        { id: "u1", nickname: "用户1", phone: "138", email: "u1@t.com", role: "USER", status: "ACTIVE", createdAt: new Date() },
        { id: "u2", nickname: "用户2", phone: null, email: null, role: "USER", status: "ACTIVE", createdAt: new Date() },
      ])
      const filePath = await svc.exportUsers({ startDate: "2026-01-01", endDate: "2026-12-31" })
      expect(filePath).toContain("export-")
      // 清理
      fs.unlinkSync(filePath)
    })
  })

  // ─── exportJson + gzipFile ───

  describe("exportJson", () => {
    it("写入 JSON 文件", async () => {
      const data = [{ id: "1", name: "测试" }]
      const filePath = await svc.exportJson(data, "test.json")
      expect(fs.existsSync(filePath)).toBe(true)
      const content = fs.readFileSync(filePath, "utf-8")
      expect(JSON.parse(content)).toEqual(data)
      fs.unlinkSync(filePath)
    })
  })

  describe("gzipFile", () => {
    it("压缩文件并删除原始文件", async () => {
      const data = [{ id: "1" }, { id: "2" }, { id: "3" }]
      const filePath = await svc.exportJson(data, "gzip-test.json")
      const gzPath = await svc.gzipFile(filePath)
      expect(fs.existsSync(gzPath)).toBe(true)
      expect(fs.existsSync(filePath)).toBe(false)
      // 清理
      fs.unlinkSync(gzPath)
    })
  })

  // ─── cleanTmpFiles ───

  describe("cleanTmpFiles", () => {
    it("清理超过1小时的临时文件", () => {
      const tmpDir = path.join(process.cwd(), "tmp")
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
      const oldFile = path.join(tmpDir, "old-export.csv")
      const newFile = path.join(tmpDir, "new-export.csv")
      fs.writeFileSync(oldFile, "stale")
      fs.writeFileSync(newFile, "fresh")
      // 设置旧文件的修改时间为2小时前
      fs.utimesSync(oldFile, Date.now() / 1000 - 7200, Date.now() / 1000 - 7200)

      svc.cleanTmpFiles()
      expect(fs.existsSync(oldFile)).toBe(false)
      expect(fs.existsSync(newFile)).toBe(true)
      // 清理
      if (fs.existsSync(newFile)) fs.unlinkSync(newFile)
    })

    it("tmp 目录不存在时无操作", () => {
      // 不应抛出异常
      expect(() => svc.cleanTmpFiles()).not.toThrow()
    })
  })

  // ─── exportOrders ───

  describe("exportOrders", () => {
    it("按类型和状态筛选导出订单", async () => {
      prisma.order.count.mockResolvedValue(1)
      prisma.order.findMany.mockResolvedValue([
        { id: "o1", type: "COURSE", amount: "199", status: "PAID", payTransactionId: null, createdAt: new Date(), paidAt: new Date(), user: { nickname: "用户1" } },
      ])
      const filePath = await svc.exportOrders({ type: "COURSE", status: "PAID" })
      expect(filePath).toContain("export-")
      fs.unlinkSync(filePath)
    })
  })
})
