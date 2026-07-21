import { ToolAiService } from "./tool-ai.service";

async function collect(source: AsyncIterable<string>): Promise<string> {
  let out = "";
  for await (const chunk of source) out += chunk;
  return out;
}

describe("ToolAiService 流式分析", () => {
  const prisma = {
    aiAnalysisRecord: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };
  const gateway = { chatStream: jest.fn() };
  const metrics = { recordExternalApi: jest.fn() };
  let service: ToolAiService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ToolAiService(prisma as any, gateway as any, metrics as any);
  });

  it("已有同盘解析时直接返回缓存且不再调用模型", async () => {
    prisma.aiAnalysisRecord.findFirst.mockResolvedValue({ analysisContent: "已有解析" });
    const text = await collect(service.analyzeStream("u1", "p1", {
      toolId: "qimen-yang", input: {}, result: {},
    }));
    expect(text).toBe("已有解析");
    expect(gateway.chatStream).not.toHaveBeenCalled();
  });

  it("逐块输出并在结束后写入完整业务记录", async () => {
    prisma.aiAnalysisRecord.findFirst.mockResolvedValue(null);
    gateway.chatStream.mockImplementation(async function* () {
      yield "第一段";
      yield "第二段";
    });
    prisma.aiAnalysisRecord.create.mockResolvedValue({ id: "a1" });

    const text = await collect(service.analyzeStream("u1", "p1", {
      toolId: "qimen-yang",
      input: { matter: "事业" },
      result: { gongs: [], dipanBashen: [] },
    }));

    expect(text).toBe("第一段第二段");
    expect(gateway.chatStream).toHaveBeenCalledWith(expect.objectContaining({
      scene: "tool_analysis", userId: "u1", skipCache: true, skipAuditLog: true,
    }));
    expect(prisma.aiAnalysisRecord.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      userId: "u1", paipanRecordId: "p1", toolId: "qimen-yang",
      analysisContent: "第一段第二段",
    }) });
  });

  it("记录落库失败时保持已生成内容可用", async () => {
    prisma.aiAnalysisRecord.findFirst.mockResolvedValue(null);
    gateway.chatStream.mockImplementation(async function* () { yield "可用解析"; });
    prisma.aiAnalysisRecord.create.mockRejectedValue(new Error("db down"));
    await expect(collect(service.analyzeStream("u1", "p1", {
      toolId: "qimen-yang", input: {}, result: { gongs: [], dipanBashen: [] },
    }))).resolves.toBe("可用解析");
  });

  it("未知工具在调用模型前拒绝", async () => {
    await expect(collect(service.analyzeStream("u1", undefined, {
      toolId: "not-exists", input: {}, result: {},
    }))).rejects.toThrow("不存在");
    expect(gateway.chatStream).not.toHaveBeenCalled();
  });
});
