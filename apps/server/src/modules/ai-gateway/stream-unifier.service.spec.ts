import { Test } from "@nestjs/testing";
import { StreamUnifierService } from "./stream-unifier.service";

describe("StreamUnifierService", () => {
  let svc: StreamUnifierService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [StreamUnifierService],
    }).compile();
    svc = mod.get(StreamUnifierService);
  });

  it("应被定义", () => expect(svc).toBeDefined());

  describe("encode", () => {
    it("编码为SSE行格式", () => {
      const line = svc.encode({ type: "chunk", content: "你好" });
      expect(line).toBe('data: {"type":"chunk","content":"你好"}\n\n');
    });
  });

  describe("errorFallback", () => {
    it("生成错误降级的SSE行", () => {
      const line = svc.errorFallback("服务不可用");
      expect(line).toContain('"type":"error"');
      expect(line).toContain("服务不可用");
    });
  });

  describe("wrapAsStream", () => {
    it("将完整文本按句子拆分为流式", () => {
      const gen = svc.wrapAsStream("第一句。第二句！第三句？");
      const lines: string[] = [];
      for (const line of gen) lines.push(line);
      expect(lines.length).toBeGreaterThanOrEqual(4); // 3 chunks + 1 done
      expect(lines[lines.length - 1]).toContain('"type":"done"');
    });

    it("空内容只返回done", () => {
      const gen = svc.wrapAsStream("");
      const lines = Array.from(gen);
      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain('"type":"done"');
    });
  });

  describe("unify", () => {
    it("正常流式输出", async () => {
      async function* source() { yield "Hello"; yield " World"; }
      const gen = svc.unify(source());
      const lines: string[] = [];
      for await (const line of gen) lines.push(line);
      expect(lines[0]).toContain('"type":"chunk"');
      expect(lines[0]).toContain("Hello");
      expect(lines[lines.length - 1]).toContain('"type":"done"');
    });

    it("带参考来源的流式输出", async () => {
      async function* source() { yield "内容"; }
      const gen = svc.unify(source(), { sources: [{ title: "参考A", excerpt: "摘要" }] });
      const lines: string[] = [];
      for await (const line of gen) lines.push(line);
      expect(lines[0]).toContain('"type":"source"');
      expect(lines[0]).toContain("参考A");
    });

    it("在done前输出业务元信息", async () => {
      async function* source() { yield "内容"; }
      const gen = svc.unify(source(), { meta: { disclaimer: "仅供参考" } });
      const lines: string[] = [];
      for await (const line of gen) lines.push(line);
      expect(lines).toHaveLength(3);
      expect(lines[1]).toContain('"type":"meta"');
      expect(lines[1]).toContain("仅供参考");
      expect(lines[2]).toContain('"type":"done"');
    });

    it("流式异常时输出error", async () => {
      // 测试流式异常抛出：需要 async generator 签名，但函数体只 throw 不含 yield
      // eslint-disable-next-line require-yield
      async function* source() { throw new Error("流中断"); }
      const gen = svc.unify(source());
      const lines: string[] = [];
      for await (const line of gen) lines.push(line);
      expect(lines[0]).toContain('"type":"error"');
      expect(lines[0]).toContain("流中断");
    });
  });

  describe("unifyWithUsage", () => {
    it("带用量统计的流式输出", async () => {
      async function* source() { yield "data"; }
      const gen = svc.unifyWithUsage(source(), { promptTokens: 10, completionTokens: 5 });
      const lines: string[] = [];
      for await (const line of gen) lines.push(line);
      expect(lines[lines.length - 1]).toContain('"type":"done"');
      expect(lines[lines.length - 1]).toContain("promptTokens");
    });
  });

  describe("writeSseStream", () => {
    it("写入SSE响应并结束", async () => {
      const written: string[] = [];
      const res = {
        setHeader: jest.fn(),
        flushHeaders: jest.fn(),
        write: jest.fn((s: string) => { written.push(s); }),
        end: jest.fn(),
      } as any;

      async function* source() { yield "Hello"; }
      await svc.writeSseStream(res, source());

      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/event-stream");
      expect(written.length).toBeGreaterThan(0);
      expect(res.end).toHaveBeenCalled();
    });
  });
});
