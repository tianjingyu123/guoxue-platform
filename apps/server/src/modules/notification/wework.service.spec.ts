import { Test } from "@nestjs/testing";
import { WeworkService } from "./wework.service";

describe("WeworkService", () => {
  let svc: WeworkService;
  let fetchMock: jest.Mock;

  afterEach(() => {
    delete process.env.WEWORK_WEBHOOK_URL;
    delete process.env.WEWORK_WEBHOOK_ALERT_URL;
    delete (global as any).fetch;
  });

  describe("未配置 Webhook", () => {
    beforeEach(async () => {
      delete process.env.WEWORK_WEBHOOK_URL;
      delete process.env.WEWORK_WEBHOOK_ALERT_URL;

      fetchMock = jest.fn();
      (global as any).fetch = fetchMock;

      const mod = await Test.createTestingModule({
        providers: [WeworkService],
      }).compile();
      svc = mod.get(WeworkService);
    });

    it("sendText 不发起 HTTP 请求", async () => {
      const result = await svc.sendText("test");
      expect(fetchMock).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it("sendMarkdown 不发起 HTTP 请求", async () => {
      const result = await svc.sendMarkdown("# title");
      expect(fetchMock).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it("sendNews 不发起 HTTP 请求", async () => {
      const result = await svc.sendNews([{ title: "t", url: "https://example.com" }]);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it("notifyNewOrder 不发起 HTTP 请求", async () => {
      await svc.notifyNewOrder({ orderId: "O1", amount: "10", product: "p", user: "u", adminUrl: "https://example.com" });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("notifyViolation 不发起 HTTP 请求", async () => {
      await svc.notifyViolation({ type: "评论", id: "C1", reason: "违规", user: "u", adminUrl: "https://example.com" });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("notifyWithdraw 不发起 HTTP 请求", async () => {
      await svc.notifyWithdraw({ userId: "u1", userName: "张三", amount: "100", adminUrl: "https://example.com" });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("notifyAlert 不发起 HTTP 请求", async () => {
      await svc.notifyAlert("错误", "详情");
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("已配置单个 Webhook", () => {
    const webhookUrl = "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test-key";

    beforeEach(async () => {
      process.env.WEWORK_WEBHOOK_URL = webhookUrl;

      fetchMock = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue({ errcode: 0, errmsg: "ok" }),
      });
      (global as any).fetch = fetchMock;

      const mod = await Test.createTestingModule({
        providers: [WeworkService],
      }).compile();
      svc = mod.get(WeworkService);
    });

    describe("sendText", () => {
      it("发送文本消息成功", async () => {
        const result = await svc.sendText("测试消息");
        expect(result).toEqual([{ errcode: 0, errmsg: "ok" }]);
        expect(fetchMock).toHaveBeenCalledWith(
          webhookUrl,
          expect.objectContaining({ method: "POST" }),
        );
      });

      it("请求体格式正确", async () => {
        await svc.sendText("hello");

        const body = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(body).toEqual({
          msgtype: "text",
          text: { content: "hello", mentioned_list: [] },
        });
      });

      it("支持 @ 指定成员", async () => {
        await svc.sendText("通知", ["user1", "user2"]);

        const body = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(body.text.mentioned_list).toEqual(["user1", "user2"]);
      });

      it("Content-Type 为 application/json", async () => {
        await svc.sendText("test");
        expect(fetchMock.mock.calls[0][1].headers).toEqual({ "Content-Type": "application/json" });
      });
    });

    describe("sendMarkdown", () => {
      it("发送 Markdown 消息成功", async () => {
        const result = await svc.sendMarkdown("# 标题\n## 副标题");
        expect(result).toEqual([{ errcode: 0, errmsg: "ok" }]);
      });

      it("请求体格式正确", async () => {
        await svc.sendMarkdown("# markdown 内容");

        const body = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(body).toEqual({
          msgtype: "markdown",
          markdown: { content: "# markdown 内容" },
        });
      });
    });

    describe("sendNews", () => {
      it("发送图文消息成功", async () => {
        const articles = [
          { title: "文章标题", description: "文章描述", url: "https://example.com/article" },
        ];

        const result = await svc.sendNews(articles);
        expect(result).toEqual([{ errcode: 0, errmsg: "ok" }]);

        const body = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(body).toEqual({
          msgtype: "news",
          news: { articles },
        });
      });

      it("支持不含 description 和 picurl 的文章", async () => {
        await svc.sendNews([{ title: "标题", url: "https://example.com" }]);

        const body = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(body.news.articles[0].title).toBe("标题");
        expect(body.news.articles[0].url).toBe("https://example.com");
      });

      it("支持带 picurl 的图文", async () => {
        await svc.sendNews([{ title: "标题", description: "描述", url: "https://example.com", picurl: "https://example.com/pic.png" }]);

        const body = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(body.news.articles[0].picurl).toBe("https://example.com/pic.png");
      });
    });

    describe("业务快捷通知", () => {
      it("notifyNewOrder 发送新订单通知", async () => {
        await svc.notifyNewOrder({
          orderId: "O20240101001",
          amount: "99.00",
          product: "国学经典课程",
          user: "张三",
          adminUrl: "https://admin.example.com/orders/O20240101001",
        });

        const body = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(body.msgtype).toBe("markdown");
        expect(body.markdown.content).toContain("新订单通知");
        expect(body.markdown.content).toContain("O20240101001");
        expect(body.markdown.content).toContain("99.00");
        expect(body.markdown.content).toContain("国学经典课程");
      });

      it("notifyViolation 发送违规告警", async () => {
        await svc.notifyViolation({
          type: "评论",
          id: "C456",
          reason: "涉政敏感词",
          user: "李四",
          adminUrl: "https://admin.example.com/comments/C456",
        });

        const body = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(body.msgtype).toBe("markdown");
        expect(body.markdown.content).toContain("违规内容告警");
        expect(body.markdown.content).toContain("C456");
        expect(body.markdown.content).toContain("涉政敏感词");
      });

      it("notifyViolation 发送失败时不抛出异常", async () => {
        fetchMock.mockRejectedValue(new Error("Network error"));

        const result = await svc.notifyViolation({
          type: "评论", id: "C1", reason: "违规", user: "u1", adminUrl: "https://example.com",
        });
        expect(result).toEqual([]);
      });

      it("notifyWithdraw 发送提现申请通知", async () => {
        await svc.notifyWithdraw({
          userId: "u100",
          userName: "王五",
          amount: "500.00",
          adminUrl: "https://admin.example.com/withdraw/u100",
        });

        const body = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(body.msgtype).toBe("markdown");
        expect(body.markdown.content).toContain("提现申请");
        expect(body.markdown.content).toContain("王五");
        expect(body.markdown.content).toContain("500.00");
      });

      it("notifyAlert 发送系统告警", async () => {
        await svc.notifyAlert("服务器异常", "CPU 使用率 95%");

        const body = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(body.msgtype).toBe("markdown");
        expect(body.markdown.content).toContain("系统告警");
        expect(body.markdown.content).toContain("服务器异常");
        expect(body.markdown.content).toContain("CPU 使用率 95%");
        expect(body.markdown.content).toContain("时间:");
      });
    });

    describe("错误容错", () => {
      it("fetch 抛异常时记录日志并返回空数组", async () => {
        fetchMock.mockRejectedValue(new Error("Connection refused"));

        const result = await svc.sendText("test");
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(result).toEqual([]);
      });

      it("resp.json 抛异常时容错处理", async () => {
        fetchMock.mockResolvedValue({
          json: jest.fn().mockRejectedValue(new Error("Invalid JSON")),
        });

        const result = await svc.sendText("test");
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(result).toEqual([]);
      });
    });
  });

  describe("已配置两个 Webhook", () => {
    const devUrl = "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=dev";
    const alertUrl = "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=alert";

    beforeEach(async () => {
      process.env.WEWORK_WEBHOOK_URL = devUrl;
      process.env.WEWORK_WEBHOOK_ALERT_URL = alertUrl;

      fetchMock = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue({ errcode: 0 }),
      });
      (global as any).fetch = fetchMock;

      const mod = await Test.createTestingModule({
        providers: [WeworkService],
      }).compile();
      svc = mod.get(WeworkService);
    });

    it("向两个 webhook 分别广播消息", async () => {
      await svc.sendText("广播消息");
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenCalledWith(devUrl, expect.any(Object));
      expect(fetchMock).toHaveBeenCalledWith(alertUrl, expect.any(Object));
    });

    it("其中一个失败不影响另一个，返回部分结果", async () => {
      fetchMock
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue({ errcode: 0, errmsg: "ok" }),
        })
        .mockRejectedValueOnce(new Error("timeout"));

      const result = await svc.sendText("test");
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ errcode: 0, errmsg: "ok" });
    });

    it("两个都失败时返回空数组", async () => {
      fetchMock.mockRejectedValue(new Error("Network error"));

      const result = await svc.sendText("test");
      expect(result).toEqual([]);
    });

    it("sendMarkdown 向两个 webhook 发送", async () => {
      await svc.sendMarkdown("# 告警");
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("sendNews 向两个 webhook 发送", async () => {
      await svc.sendNews([{ title: "通知", url: "https://example.com" }]);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});
