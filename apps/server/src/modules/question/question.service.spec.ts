import { Test } from "@nestjs/testing"
import { QuestionService } from "./question.service"
import { PrismaService } from "../../prisma/prisma.service"
import { CoinService } from "../coin/coin.service"
import { RevenueService } from "../revenue/revenue.service"
import { BusinessException } from "../../common/business.exception"

const txProxy = new Proxy({} as any, {
  get(_: any, prop: string) { return (mockPrisma as any)[prop]; },
});

const mockPrisma: any = {
  $transaction: jest.fn((arg: any) => typeof arg === "function" ? arg(txProxy) : Promise.all(Array.isArray(arg) ? arg : [arg])),
  circle: { findUnique: jest.fn() },
  circleMember: { findFirst: jest.fn() },
  paidQuestion: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
}

const mockCoin = {
  spend: jest.fn().mockResolvedValue({ account: { balance: 50 } }),
  refund: jest.fn().mockResolvedValue({ account: { balance: 100 } }),
}

const mockRevenue = {
  record: jest.fn().mockResolvedValue({ id: "e1" }),
}

describe("QuestionService", () => {
  let svc: QuestionService

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        QuestionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CoinService, useValue: mockCoin },
        { provide: RevenueService, useValue: mockRevenue },
      ],
    }).compile()
    svc = mod.get(QuestionService)
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("ask", () => {
    const askDto = { circleId: "c1", answererId: "u2", questionTitle: "测试", question: "你好", priceCoin: 50 }

    it("不能向自己提问", async () => {
      await expect(svc.ask("u1", { ...askDto, answererId: "u1" })).rejects.toThrow(BusinessException)
    })

    it("圈子不存在", async () => {
      mockPrisma.circle.findUnique.mockResolvedValue(null)
      await expect(svc.ask("u1", askDto)).rejects.toThrow(BusinessException)
    })

    it("回答者不在圈子中", async () => {
      mockPrisma.circle.findUnique.mockResolvedValue({ id: "c1" })
      mockPrisma.circleMember.findFirst.mockResolvedValue(null)
      await expect(svc.ask("u1", askDto)).rejects.toThrow(BusinessException)
    })

    it("提问成功", async () => {
      mockPrisma.circle.findUnique.mockResolvedValue({ id: "c1" })
      mockPrisma.circleMember.findFirst.mockResolvedValue({ id: "m1" })
      mockPrisma.paidQuestion.create.mockResolvedValue({ id: "q1", status: "PENDING" })
      const result = await svc.ask("u1", askDto)
      expect(result.status).toBe("PENDING")
      // coin.spend 在事务内调用，传入了 tx 参数
      expect(mockCoin.spend).toHaveBeenCalledWith("u1", expect.objectContaining({ scene: "PAID_QUESTION" }), expect.any(Object))
    })
  })

  describe("answer", () => {
    it("问题不存在", async () => {
      mockPrisma.paidQuestion.findUnique.mockResolvedValue(null)
      await expect(svc.answer("u2", "no", { answer: "回复" })).rejects.toThrow(BusinessException)
    })

    it("只有被提问者可回答", async () => {
      mockPrisma.paidQuestion.findUnique.mockResolvedValue({ id: "q1", answererId: "u2", status: "PENDING", priceCoin: 50 })
      await expect(svc.answer("u3", "q1", { answer: "回复" })).rejects.toThrow(BusinessException)
    })

    it("非待回答状态不可回答", async () => {
      mockPrisma.paidQuestion.findUnique.mockResolvedValue({ id: "q1", answererId: "u2", status: "ANSWERED", priceCoin: 50 })
      await expect(svc.answer("u2", "q1", { answer: "回复" })).rejects.toThrow(BusinessException)
    })

    it("回答成功并记录收益", async () => {
      mockPrisma.paidQuestion.findUnique.mockResolvedValue({ id: "q1", answererId: "u2", status: "PENDING", priceCoin: 50 })
      mockPrisma.paidQuestion.update.mockResolvedValue({
        id: "q1", status: "ANSWERED", answer: "回复",
        asker: { id: "u1", nickname: "张三", avatar: null },
        answerer: { id: "u2", nickname: "李四", avatar: null },
      })
      const result = await svc.answer("u2", "q1", { answer: "回复" })
      expect(result.status).toBe("ANSWERED")
    })
  })

  describe("peek", () => {
    it("问题不存在", async () => {
      mockPrisma.paidQuestion.findUnique.mockResolvedValue(null)
      await expect(svc.peek("u3", "no")).rejects.toThrow(BusinessException)
    })

    it("问题尚未回答", async () => {
      mockPrisma.paidQuestion.findUnique.mockResolvedValue({ id: "q1", status: "PENDING", peekPriceCoin: 10, askerId: "u1", answererId: "u2" })
      await expect(svc.peek("u3", "q1")).rejects.toThrow(BusinessException)
    })

    it("不支持围观", async () => {
      mockPrisma.paidQuestion.findUnique.mockResolvedValue({ id: "q1", status: "ANSWERED", peekPriceCoin: 0, askerId: "u1", answererId: "u2" })
      await expect(svc.peek("u3", "q1")).rejects.toThrow(BusinessException)
    })

    it("提问者或回答者可免费围观", async () => {
      mockPrisma.paidQuestion.findUnique.mockResolvedValue({ id: "q1", status: "ANSWERED", peekPriceCoin: 10, askerId: "u1", answererId: "u2" })
      const result = await svc.peek("u1", "q1")
      expect(result.id).toBe("q1")
      expect(mockCoin.spend).not.toHaveBeenCalled()
    })

    it("付费围观成功", async () => {
      mockPrisma.paidQuestion.findUnique.mockResolvedValue({ id: "q1", status: "ANSWERED", peekPriceCoin: 10, askerId: "u1", answererId: "u2" })
      mockPrisma.paidQuestion.update.mockResolvedValue({})
      // 新增的幂等检查：未围观过
      mockPrisma.virtualCoinTransaction = { findFirst: jest.fn().mockResolvedValue(null) }
      const result = await svc.peek("u3", "q1")
      expect(result.id).toBe("q1")
      // coin.spend 在事务内调用，传入了 tx 参数
      expect(mockCoin.spend).toHaveBeenCalledWith("u3", expect.objectContaining({ scene: "PEEK_ANSWER" }), expect.any(Object))
    })
  })

  describe("refundExpiredQuestions", () => {
    it("退款超时未回答的问题", async () => {
      mockPrisma.paidQuestion.findMany.mockResolvedValue([
        { id: "q1", askerId: "u1", priceCoin: 50 },
        { id: "q2", askerId: "u2", priceCoin: 30 },
      ])
      mockPrisma.paidQuestion.updateMany.mockResolvedValue({ count: 2 })
      const result = await svc.refundExpiredQuestions()
      expect(result.refunded).toBe(2)
      expect(mockCoin.refund).toHaveBeenCalledTimes(2)
      expect(mockPrisma.paidQuestion.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: { in: ["q1", "q2"] } } }),
      )
    })

    it("无过期问题时不退款", async () => {
      mockPrisma.paidQuestion.findMany.mockResolvedValue([])
      const result = await svc.refundExpiredQuestions()
      expect(result.refunded).toBe(0)
    })
  })

  describe("listQuestions", () => {
    it("分页返回问答列表", async () => {
      mockPrisma.paidQuestion.findMany.mockResolvedValue([{ id: "q1" }])
      mockPrisma.paidQuestion.count.mockResolvedValue(1)
      const result = await svc.listQuestions({ page: 1, pageSize: 10 })
      expect(result.total).toBe(1)
      expect(result.questions).toHaveLength(1)
    })
  })

  describe("getQuestion", () => {
    it("返回问答详情", async () => {
      mockPrisma.paidQuestion.findUnique.mockResolvedValue({ id: "q1", question: "你好" })
      const result = await svc.getQuestion("q1")
      expect(result.question).toBe("你好")
    })

    it("问题不存在", async () => {
      mockPrisma.paidQuestion.findUnique.mockResolvedValue(null)
      await expect(svc.getQuestion("no")).rejects.toThrow(BusinessException)
    })
  })
})
