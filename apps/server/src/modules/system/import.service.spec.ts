import { Test, TestingModule } from "@nestjs/testing"
import { ImportService } from "./import.service"
import { PrismaService } from "../../prisma/prisma.service"

function mockPrisma() {
  return {
    article: { createMany: jest.fn().mockResolvedValue({}) },
    course: { createMany: jest.fn().mockResolvedValue({}) },
    product: { createMany: jest.fn().mockResolvedValue({}) },
    classicBook: { createMany: jest.fn().mockResolvedValue({}) },
    user: { createMany: jest.fn().mockResolvedValue({ count: 3 }) },
  }
}

describe("ImportService", () => {
  let svc: ImportService
  let prisma: ReturnType<typeof mockPrisma>

  beforeAll(async () => {
    prisma = mockPrisma()
    const m: TestingModule = await Test.createTestingModule({
      providers: [
        ImportService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()
    svc = m.get(ImportService)
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ─── parseCsv ───

  describe("parseCsv", () => {
    it("基本 CSV 解析", () => {
      const buf = Buffer.from("标题,作者\n文章1,作者1\n文章2,作者2")
      const rows = svc.parseCsv(buf)
      expect(rows).toHaveLength(2)
      expect(rows[0]["标题"]).toBe("文章1")
      expect(rows[1]["作者"]).toBe("作者2")
    })

    it("处理 UTF-8 BOM", () => {
      const buf = Buffer.from("﻿标题,作者\n文章1,作者1")
      const rows = svc.parseCsv(buf)
      expect(rows[0]["标题"]).toBe("文章1")
    })

    it("处理引号内的逗号", () => {
      const buf = Buffer.from('标题,简介\n"国学,入门",简介1')
      const rows = svc.parseCsv(buf)
      expect(rows[0]["标题"]).toBe("国学,入门")
    })

    it("处理转义引号", () => {
      const buf = Buffer.from('标题,简介\n"国学""入门""",简介1')
      const rows = svc.parseCsv(buf)
      expect(rows[0]["标题"]).toBe('国学"入门"')
    })

    it("空行被跳过", () => {
      const buf = Buffer.from("标题,作者\n\n文章1,作者1\n\n")
      const rows = svc.parseCsv(buf)
      expect(rows).toHaveLength(1)
    })

    it("只有表头时返回空数组", () => {
      const buf = Buffer.from("标题,作者")
      const rows = svc.parseCsv(buf)
      expect(rows).toEqual([])
    })
  })

  // ─── importCsv ───

  describe("importCsv", () => {
    it("不支持的导入类型报错", async () => {
      const buf = Buffer.from("标题\n测试")
      await expect(svc.importCsv("unknown", buf)).rejects.toThrow("不支持的导入类型")
    })

    it("空文件报错", async () => {
      const buf = Buffer.from("标题\n")
      await expect(svc.importCsv("course", buf)).rejects.toThrow("无数据行")
    })

    it("缺少必填字段记录错误", async () => {
      const buf = Buffer.from("标题,简介\n,简介1")
      const result = await svc.importCsv("course", buf)
      expect(result.errors).toHaveLength(1)
      expect(result.success).toBe(0)
    })

    it("价格上涨式转换无效时记录错误", async () => {
      const buf = Buffer.from("标题,价格\n课程1,abc")
      const result = await svc.importCsv("course", buf)
      expect(result.errors).toHaveLength(1)
    })

    it("价格为负数时记录错误", async () => {
      const buf = Buffer.from("标题,价格\n课程1,-10")
      const result = await svc.importCsv("course", buf)
      expect(result.errors).toHaveLength(1)
    })

    it("库存未整数时取整", async () => {
      const buf = Buffer.from("标题,价格,库存\n商品1,99,10.7")
      const result = await svc.importCsv("product", buf)
      expect(result.success).toBe(1)
    })

    it("成功导入文章（含标签拆分）", async () => {
      const buf = Buffer.from("标题,圈子ID,标签,内容\n国学文章,c1,国学,历史,正文内容")
      const result = await svc.importCsv("article", buf)
      expect(result.success).toBe(1)
      expect(result.failed).toBe(0)
      expect(prisma.article.createMany).toHaveBeenCalled()
    })

    it("成功导入课程", async () => {
      const buf = Buffer.from("标题,简介,价格\n国学入门,简介,199")
      const result = await svc.importCsv("course", buf, { userId: "u1" })
      expect(result.success).toBe(1)
    })

    it("成功导入商品（含状态 ON_SALE）", async () => {
      const buf = Buffer.from("标题,价格,库存\n商品1,99,100")
      const result = await svc.importCsv("product", buf)
      expect(result.success).toBe(1)
    })

    it("成功导入古籍", async () => {
      const buf = Buffer.from("标题,作者,朝代,分类\n道德经,老子,春秋,道")
      const result = await svc.importCsv("classic", buf)
      expect(result.success).toBe(1)
      expect(prisma.classicBook.createMany).toHaveBeenCalled()
    })

    it("成功导入用户（skipDuplicates）", async () => {
      prisma.user.createMany.mockResolvedValue({ count: 2 })
      const buf = Buffer.from("昵称,手机号,邮箱\n用户1,13800138000,user1@test.com\n用户2,,user2@test.com")
      const result = await svc.importCsv("user", buf)
      expect(result.success).toBe(2)
      expect(prisma.user.createMany).toHaveBeenCalledWith(expect.objectContaining({ skipDuplicates: true }))
    })

    it("附加分站上下文", async () => {
      const buf = Buffer.from("标题,圈子ID\n文章1,c1")
      const result = await svc.importCsv("article", buf, { stationId: "s1" })
      expect(result.success).toBe(1)
    })

    it("部分行失败不影响成功行", async () => {
      const buf = Buffer.from("标题,价格\n课程1,199\n课程2,abc")
      const result = await svc.importCsv("course", buf)
      expect(result.success).toBe(1)
      expect(result.failed).toBe(1)
      expect(result.errors).toHaveLength(1)
    })
  })
})
