import { Test } from "@nestjs/testing";
import { AdminRagController } from "./admin-rag.controller";
import { PrismaService } from "../../prisma/prisma.service";
import { RagService } from "./rag.service";

describe("AdminRagController", () => {
  let ctrl: AdminRagController;
  let prisma: jest.Mocked<PrismaService>;
  let rag: jest.Mocked<RagService>;

  const templateRow = {
    id: "t1",
    scene: "general",
    templateName: "通用模板",
    systemPrompt: "你是一个助手",
    userPromptTemplate: null,
    variables: null,
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [AdminRagController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            ragPromptTemplate: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
        { provide: RagService, useValue: {} },
      ],
    }).compile();
    ctrl = mod.get(AdminRagController);
    prisma = mod.get(PrismaService) as jest.Mocked<PrismaService>;
    rag = mod.get(RagService) as jest.Mocked<RagService>;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("list — 模板列表", () => {
    it("不传 scene 时返回所有模板", async () => {
      (prisma.ragPromptTemplate.findMany as jest.Mock).mockResolvedValue([templateRow]);

      const result = await ctrl.list();

      expect(prisma.ragPromptTemplate.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: "desc" },
      });
      expect(result).toEqual([templateRow]);
    });

    it("按 scene 过滤", async () => {
      (prisma.ragPromptTemplate.findMany as jest.Mock).mockResolvedValue([templateRow]);

      await ctrl.list("general");

      expect(prisma.ragPromptTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { scene: "general" } }),
      );
    });

    it("返回空列表", async () => {
      (prisma.ragPromptTemplate.findMany as jest.Mock).mockResolvedValue([]);

      const result = await ctrl.list("nonexistent");

      expect(result).toEqual([]);
    });
  });

  describe("get — 模板详情", () => {
    it("返回模板详情", async () => {
      (prisma.ragPromptTemplate.findUnique as jest.Mock).mockResolvedValue(templateRow);

      const result = await ctrl.get("t1");

      expect(prisma.ragPromptTemplate.findUnique).toHaveBeenCalledWith({
        where: { id: "t1" },
      });
      expect(result).toEqual(templateRow);
    });

    it("未知 ID 返回 null", async () => {
      (prisma.ragPromptTemplate.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await ctrl.get("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("create — 创建模板", () => {
    it("创建模板并返回", async () => {
      const body = {
        scene: "general",
        templateName: "新模板",
        systemPrompt: "你是一个助手",
        userPromptTemplate: "{{question}}",
        variables: [],
      };
      const created = { ...templateRow, ...body };
      (prisma.ragPromptTemplate.create as jest.Mock).mockResolvedValue(created as any);

      const result = await ctrl.create(body);

      expect(prisma.ragPromptTemplate.create).toHaveBeenCalledWith({
        data: body,
      });
      expect(result.templateName).toBe("新模板");
    });
  });

  describe("update — 更新模板", () => {
    it("更新指定字段并返回", async () => {
      const body = { templateName: "更新后", status: "inactive" };
      const updated = { ...templateRow, ...body };
      (prisma.ragPromptTemplate.update as jest.Mock).mockResolvedValue(updated as any);

      const result = await ctrl.update("t1", body);

      expect(prisma.ragPromptTemplate.update).toHaveBeenCalledWith({
        where: { id: "t1" },
        data: body,
      });
      expect(result.templateName).toBe("更新后");
      expect(result.status).toBe("inactive");
    });
  });

  describe("delete — 删除模板", () => {
    it("删除模板并返回被删除的记录", async () => {
      (prisma.ragPromptTemplate.delete as jest.Mock).mockResolvedValue(templateRow as any);

      const result = await ctrl.delete("t1");

      expect(prisma.ragPromptTemplate.delete).toHaveBeenCalledWith({
        where: { id: "t1" },
      });
      expect(result).toEqual(templateRow);
    });
  });

  describe("preview — 模板预览", () => {
    it("替换变量占位符", async () => {
      const body = {
        systemPrompt: "你是{{role}}",
        userPromptTemplate: "用户问题: {{question}}",
        variables: { role: "国学专家", question: "什么是易经" },
      };

      const result = await ctrl.preview(body);

      expect(result.renderedSystem).toBe("你是国学专家");
      expect(result.renderedUser).toBe("用户问题: 什么是易经");
    });

    it("不传变量时返回原文本", async () => {
      const body = { systemPrompt: "你是一个助手", testQuestion: "你好" };

      const result = await ctrl.preview(body);

      expect(result.renderedSystem).toBe("你是一个助手");
      expect(result.renderedUser).toBe("你好");
    });

    it("占位符不存在时不替换", async () => {
      const body = {
        systemPrompt: "你是{{role}}",
        variables: { name: "value" },
      };

      const result = await ctrl.preview(body);

      expect(result.renderedSystem).toBe("你是{{role}}");
    });
  });
});
