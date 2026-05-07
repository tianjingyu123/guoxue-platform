import "reflect-metadata";
import { validate } from "class-validator";
import { CreateBotDto, UpdateBotDto, BindBotToCircleDto, AddKnowledgeDto } from "./bot.dto";

describe("Bot DTO 校验", () => {
  describe("CreateBotDto", () => {
    it("合法输入通过", async () => {
      const dto = Object.assign(new CreateBotDto(), {
        name: "国学助手", type: "CHAT", botId: "bot-001", apiKey: "sk-xxx",
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("带全部可选字段通过", async () => {
      const dto = Object.assign(new CreateBotDto(), {
        name: "国学助手", type: "CHAT", botId: "bot-001", apiKey: "sk-xxx",
        avatar: "https://example.com/avatar.jpg", intro: "国学智能助手",
        isFree: true, dailyLimit: 20, price: 0, monthlyPrice: 980, sortOrder: 1,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("缺 name 报错", async () => {
      const dto = Object.assign(new CreateBotDto(), { type: "CHAT", botId: "b1", apiKey: "sk-xxx" });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("缺 type 报错", async () => {
      const dto = Object.assign(new CreateBotDto(), { name: "助手", botId: "b1", apiKey: "sk-xxx" });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("缺 botId 报错", async () => {
      const dto = Object.assign(new CreateBotDto(), { name: "助手", type: "CHAT", apiKey: "sk-xxx" });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("缺 apiKey 报错", async () => {
      const dto = Object.assign(new CreateBotDto(), { name: "助手", type: "CHAT", botId: "b1" });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("UpdateBotDto", () => {
    it("空对象通过", async () => {
      const dto = Object.assign(new UpdateBotDto(), {});
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("部分更新通过", async () => {
      const dto = Object.assign(new UpdateBotDto(), { name: "新名称", isFree: false });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("price 为负数不触发验证错误（无约束）", async () => {
      const dto = Object.assign(new UpdateBotDto(), { price: -1 });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe("BindBotToCircleDto", () => {
    it("合法输入通过", async () => {
      const dto = Object.assign(new BindBotToCircleDto(), { circleId: "c1" });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("带 knowledgeBaseId 通过", async () => {
      const dto = Object.assign(new BindBotToCircleDto(), {
        circleId: "c1", knowledgeBaseId: "kb-1",
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("缺 circleId 报错", async () => {
      const dto = Object.assign(new BindBotToCircleDto(), {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("AddKnowledgeDto", () => {
    it("合法输入通过", async () => {
      const dto = Object.assign(new AddKnowledgeDto(), {
        title: "论语知识点", content: "子曰学而时习之",
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("带 sourceType/sourceId 通过", async () => {
      const dto = Object.assign(new AddKnowledgeDto(), {
        title: "知识点", content: "内容", sourceType: "ARTICLE", sourceId: "art-1",
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("缺 title 报错", async () => {
      const dto = Object.assign(new AddKnowledgeDto(), { content: "内容" });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("缺 content 报错", async () => {
      const dto = Object.assign(new AddKnowledgeDto(), { title: "知识点" });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
