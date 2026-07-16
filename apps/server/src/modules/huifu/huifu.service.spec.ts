import { Test, TestingModule } from "@nestjs/testing";
import { createSign, createVerify, generateKeyPairSync } from "crypto";
import { HuifuService } from "./huifu.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

// 真实 RSA 密钥对：既当「商户私钥」（请求签名）也当「汇付密钥对」（响应/回调验签），端到端签验
const { publicKey: PUB_PEM, privateKey: PRIV_PEM } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

/** 以「汇付」身份对字符串做 RSA-SHA256 签名（构造 mock 响应/回调用） */
function rsaSign(str: string): string {
  const s = createSign("RSA-SHA256");
  s.update(str, "utf-8");
  return s.sign(PRIV_PEM, "base64");
}

/** 用公钥验证服务产出的请求签名 */
function rsaVerify(str: string, sig: string): boolean {
  const v = createVerify("RSA-SHA256");
  v.update(str, "utf-8");
  return v.verify(PUB_PEM, sig, "base64");
}

/** mock fetch 返回一条已按斗拱协议签名的响应 { data, sign } */
function mockFetchResponse(data: Record<string, unknown>) {
  const dataJson = JSON.stringify(data);
  const raw = `{"data":${dataJson},"sign":"${rsaSign(dataJson)}"}`;
  (global.fetch as jest.Mock).mockResolvedValue({ text: async () => raw });
}

/** 取最近一次 fetch 的 url 与解析后的请求体 */
function lastFetchCall(): { url: string; body: Record<string, any> } {
  const calls = (global.fetch as jest.Mock).mock.calls;
  const [url, init] = calls[calls.length - 1];
  return { url, body: JSON.parse(init.body) };
}

const mockPrisma = {
  huifuConfig: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    findMany: jest.fn(),
  },
  huifuSplitRecord: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
    update: jest.fn(),
  },
  order: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  auditLog: { create: jest.fn().mockResolvedValue({ id: "log1" }) },
};

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  setNX: jest.fn(),
};

const realFetch = global.fetch;

describe("HuifuService（斗拱 BsPay v2 协议）", () => {
  let svc: HuifuService;

  beforeEach(async () => {
    jest.clearAllMocks();
    global.fetch = jest.fn() as unknown as typeof fetch;

    process.env.HUIFU_BASE_URL = "https://mock-api.huifu.com";
    process.env.HUIFU_MERCHANT_ID = "TEST-MCH-001";
    process.env.HUIFU_APP_ID = "TEST-SYS-001";
    process.env.HUIFU_PRODUCT_ID = "TEST-PRODUCT";
    process.env.HUIFU_SECRET_KEY = "test-secret-key";
    process.env.HUIFU_RSA_PRIVATE_KEY = PRIV_PEM;
    process.env.HUIFU_RSA_PUBLIC_KEY = PUB_PEM;

    mockRedis.get.mockResolvedValue(null);
    mockPrisma.huifuConfig.findUnique.mockResolvedValue(null);

    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        HuifuService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();
    svc = mod.get(HuifuService);
  });

  afterAll(() => {
    global.fetch = realFetch;
  });

  it("应被定义", () => expect(svc).toBeDefined());

  // ───────── 协议工具 ─────────

  describe("协议工具", () => {
    it("sortedCompactJson 应按 key 字母序递归排序并输出紧凑JSON（数组保序）", () => {
      const json = svc["sortedCompactJson"]({
        b: 1,
        a: { d: "x", c: [{ z: 1, y: 2 }, { n: 3, m: 4 }] },
      });
      expect(json).toBe('{"a":{"c":[{"y":2,"z":1},{"m":4,"n":3}],"d":"x"},"b":1}');
    });

    it("removeEmpty 应删除空串/null/undefined 字段，保留 0/false", () => {
      const out = svc["removeEmpty"]({ a: "", b: null, c: undefined, d: 0, e: false, f: "v" });
      expect(out).toEqual({ d: 0, e: false, f: "v" });
    });

    it("reqDate 应输出 yyyyMMdd", () => {
      expect(svc["reqDate"](new Date(2026, 6, 3))).toBe("20260703");
      expect(svc["reqDate"]()).toMatch(/^\d{8}$/);
    });

    it("reqSeqId 应为32位无横线且唯一", () => {
      const a = svc["reqSeqId"]();
      const b = svc["reqSeqId"]();
      expect(a).toMatch(/^[0-9a-f]{32}$/);
      expect(a).not.toBe(b);
    });

    describe("extractRawJsonField 花括号配平", () => {
      it("应截取简单对象原文", () => {
        expect(svc["extractRawJsonField"]('{"data":{"a":1},"sign":"x"}', "data")).toBe('{"a":1}');
      });

      it("应正确处理嵌套对象与字符串内的花括号/转义引号", () => {
        const inner = { a: { b: '}"{', note: "含{花括号}和\\反斜杠" }, c: 2 };
        const raw = `{"sign":"x","data":${JSON.stringify(inner)}}`;
        expect(svc["extractRawJsonField"](raw, "data")).toBe(JSON.stringify(inner));
      });

      it("应容忍冒号前后空白", () => {
        const raw = '{ "data" : { "k" : "v" } , "sign":"x"}';
        expect(svc["extractRawJsonField"](raw, "data")).toBe('{ "k" : "v" }');
      });

      it("字段缺失或花括号未配平应返回 null", () => {
        expect(svc["extractRawJsonField"]('{"sign":"x"}', "data")).toBeNull();
        expect(svc["extractRawJsonField"]('{"data":{"a":1', "data")).toBeNull();
      });
    });
  });

  // ───────── 组包与签名（单测证据） ─────────

  describe("callApi 组包与签名", () => {
    it("请求体应为 {sys_id,product_id,sign,data} 且 sign 可用公钥对「去空字段+字母序紧凑JSON」验通", async () => {
      mockFetchResponse({ resp_code: "00000000", resp_desc: "成功" });
      await svc["callApi"]("/v2/merchant/basicdata/query", {
        req_seq_id: "seq-1",
        huifu_id: "TEST-MCH-001",
        req_date: "20260703",
        empty_field: "",
        null_field: null,
      });

      const { url, body } = lastFetchCall();
      expect(url).toBe("https://mock-api.huifu.com/v2/merchant/basicdata/query");
      expect(body.sys_id).toBe("TEST-SYS-001");
      expect(body.product_id).toBe("TEST-PRODUCT");
      // 空字段已剔除
      expect(body.data).toEqual({ req_seq_id: "seq-1", huifu_id: "TEST-MCH-001", req_date: "20260703" });
      // 签名串 = data 按 key 字母序排序的紧凑 JSON
      const signSrc = '{"huifu_id":"TEST-MCH-001","req_date":"20260703","req_seq_id":"seq-1"}';
      expect(signSrc).toBe(svc["sortedCompactJson"](body.data));
      expect(rsaVerify(signSrc, body.sign)).toBe(true);
      // 篡改签名串应验不过（负向证据）
      expect(rsaVerify(signSrc.replace("seq-1", "seq-2"), body.sign)).toBe(false);
    });

    it("sys_id 未配置时应兜底为商户号", async () => {
      delete process.env.HUIFU_APP_ID;
      mockFetchResponse({ resp_code: "00000000" });
      await svc["callApi"]("/v2/x", { huifu_id: "TEST-MCH-001" });
      expect(lastFetchCall().body.sys_id).toBe("TEST-MCH-001");
    });

    it("product_id 未配置应抛业务异常提示去后台配置", async () => {
      delete process.env.HUIFU_PRODUCT_ID;
      await expect(svc["callApi"]("/v2/x", {})).rejects.toThrow("product_id 未配置");
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("响应验签失败仅告警不阻断（返回 data 照常）", async () => {
      const dataJson = JSON.stringify({ resp_code: "00000000", resp_desc: "成功" });
      (global.fetch as jest.Mock).mockResolvedValue({
        text: async () => `{"data":${dataJson},"sign":"bad-signature"}`,
      });
      const warnSpy = jest.spyOn(svc["logger"], "warn").mockImplementation();
      const result = await svc["callApi"]("/v2/x", { huifu_id: "M" });
      expect(result.resp_code).toBe("00000000");
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("验签失败"));
    });

    it("业务码非 00000000 应记录错误但返回 data 供调用方判定", async () => {
      mockFetchResponse({ resp_code: "10000000", resp_desc: "参数错误" });
      const errSpy = jest.spyOn(svc["logger"], "error").mockImplementation();
      const result = await svc["callApi"]("/v2/x", { huifu_id: "M" });
      expect(result.resp_code).toBe("10000000");
      expect(errSpy).toHaveBeenCalled();
    });

    it("响应非JSON应抛出支付异常", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ text: async () => "<html>502</html>" });
      await expect(svc["callApi"]("/v2/x", { huifu_id: "M" })).rejects.toThrow("汇付API响应异常");
    });
  });

  // ───────── 连通性探针 ─────────

  describe("ping 连通性探针", () => {
    it("商户信息查询成功应返回 ok=true 与商户名", async () => {
      mockFetchResponse({ resp_code: "00000000", resp_desc: "成功", reg_name: "国学平台测试商户" });
      const res = await svc.ping();
      expect(res).toEqual({
        ok: true,
        respCode: "00000000",
        respDesc: "成功",
        merchantName: "国学平台测试商户",
      });
      const { url, body } = lastFetchCall();
      expect(url).toBe("https://mock-api.huifu.com/v2/merchant/basicdata/query");
      expect(body.data.huifu_id).toBe("TEST-MCH-001");
      expect(body.data.req_date).toMatch(/^\d{8}$/);
      expect(body.data.req_seq_id).toMatch(/^[0-9a-f]{32}$/);
    });

    it("业务码失败应返回 ok=false 并透传 respCode/respDesc", async () => {
      mockFetchResponse({ resp_code: "90000000", resp_desc: "商户不存在" });
      const res = await svc.ping();
      expect(res.ok).toBe(false);
      expect(res.respCode).toBe("90000000");
      expect(res.respDesc).toBe("商户不存在");
    });

    it("网络异常应捕获并返回 ok=false（探针不抛异常）", async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error("ECONNREFUSED"));
      jest.spyOn(svc["logger"], "error").mockImplementation();
      const res = await svc.ping();
      expect(res.ok).toBe(false);
      expect(res.respDesc).toContain("ECONNREFUSED");
    });

    it("product_id 缺失应返回 ok=false 的配置提示而非抛异常", async () => {
      delete process.env.HUIFU_PRODUCT_ID;
      const res = await svc.ping();
      expect(res.ok).toBe(false);
      expect(res.respDesc).toContain("product_id 未配置");
    });

    it("商户号缺失应返回 ok=false 且不发起请求", async () => {
      delete process.env.HUIFU_MERCHANT_ID;
      const res = await svc.ping();
      expect(res.ok).toBe(false);
      expect(res.respDesc).toContain("商户号未配置");
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  // ───────── 配置管理 ─────────

  describe("配置管理", () => {
    it("setConfig 应更新配置并清除缓存", async () => {
      mockPrisma.huifuConfig.upsert.mockResolvedValue({ key: "merchantId", value: "M002" });
      await svc.setConfig("merchantId", "M002", "新商户号");
      expect(mockPrisma.huifuConfig.upsert).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalledWith("huifu:config:merchantId");
    });

    it("应能从环境变量获取配置（含新增 productId）", async () => {
      expect(await svc["getConfig"]("merchantId")).toBe("TEST-MCH-001");
      expect(await svc["getConfig"]("productId")).toBe("TEST-PRODUCT");
    });

    it("应优先使用内存缓存", async () => {
      svc["configCache"].set("appId", "cached-app-id");
      svc["certCacheTime"] = Date.now();
      const appId = await svc["getConfig"]("appId");
      expect(appId).toBe("cached-app-id");
      expect(mockRedis.get).not.toHaveBeenCalled();
    });

    it("应能从Redis获取配置", async () => {
      svc["configCache"].clear();
      mockRedis.get.mockResolvedValue("redis-merchant-id");
      const merchantId = await svc["getConfig"]("merchantId");
      expect(merchantId).toBe("redis-merchant-id");
      expect(mockPrisma.huifuConfig.findUnique).not.toHaveBeenCalled();
    });

    it("isEnabled 在配置完整时返回true", async () => {
      const enabled = await svc.isEnabled();
      expect(enabled).toBe(true);
    });

    it("isEnabled 在配置不完整时返回false", async () => {
      delete process.env.HUIFU_RSA_PRIVATE_KEY;
      const enabled = await svc.isEnabled();
      expect(enabled).toBe(false);
    });

    it("getAllConfigs 应对敏感字段脱敏", async () => {
      mockPrisma.huifuConfig.findMany.mockResolvedValue([
        { key: "secretKey", value: "1234abcd5678efgh", description: "密钥" },
        { key: "merchantId", value: "M001234567", description: "商户号" },
      ]);
      const configs = await svc.getAllConfigs();
      expect(configs[0].value).toBe("1234****efgh");
      expect(configs[1].value).toBe("M001234567");
    });
  });

  // ───────── 支付 ─────────

  describe("支付", () => {
    it("订单不存在应抛出异常", async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);
      await expect(
        svc.createPayment("user-1", { orderId: "order-not-exist", payType: "WECHAT_H5" }),
      ).rejects.toThrow("订单不存在");
    });

    it("订单不属于当前用户应抛出异常", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "order-1", userId: "other-user", amount: 100, status: "PENDING", type: "course",
      });
      await expect(
        svc.createPayment("user-1", { orderId: "order-1", payType: "WECHAT_H5" }),
      ).rejects.toThrow("订单不存在");
    });

    it("已支付订单不能重复支付", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "order-1", userId: "user-1", amount: 100, status: "PAID", type: "course",
      });
      await expect(
        svc.createPayment("user-1", { orderId: "order-1", payType: "WECHAT_H5" }),
      ).rejects.toThrow("订单状态不可支付");
    });

    it("jspay 报文映射：T_JSAPI/trans_amt两位小数字符串/wx_data.sub_openid，并回存 hf_seq_id 与 payInfo", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "order-1", userId: "user-1", amount: 100, status: "PENDING", type: "course",
      });
      mockPrisma.huifuSplitRecord.create.mockResolvedValue({});
      mockPrisma.order.update.mockResolvedValue({});
      mockFetchResponse({
        resp_code: "00000000",
        hf_seq_id: "HF-SEQ-001",
        pay_info: '{"appId":"wx123","paySign":"abc"}',
      });

      const res = await svc.createPayment("user-1", {
        orderId: "order-1", payType: "WECHAT_JSAPI", openid: "openid-123",
      });

      const { url, body } = lastFetchCall();
      expect(url).toBe("https://mock-api.huifu.com/v2/trade/payment/jspay");
      expect(body.data.trade_type).toBe("T_JSAPI");
      expect(body.data.trans_amt).toBe("100.00");
      expect(body.data.huifu_id).toBe("TEST-MCH-001");
      expect(body.data.wx_data).toEqual({ sub_openid: "openid-123" });
      expect(body.data.req_seq_id).toBe(res.outTradeNo);
      expect(body.data.req_date).toMatch(/^\d{8}$/);

      // 结果字段：hf_seq_id 存 huifuOrderId，pay_info 放 payInfo
      expect(mockPrisma.huifuSplitRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ huifuOrderId: "HF-SEQ-001", orderId: "order-1" }),
      });
      expect(res.payInfo).toBe('{"appId":"wx123","paySign":"abc"}');
      expect(res.payUrl).toBeNull();
      expect(res.h5Url).toBeNull();
      expect(res.qrCode).toBeNull();
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: "order-1" },
        data: { payTransactionId: res.outTradeNo, payMethod: "HUIFU" },
      });
    });

    it("非微信渠道不应携带 wx_data", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "order-2", userId: "user-1", amount: 8.5, status: "PENDING", type: "course",
      });
      mockPrisma.huifuSplitRecord.create.mockResolvedValue({});
      mockPrisma.order.update.mockResolvedValue({});
      mockFetchResponse({ resp_code: "00000000", hf_seq_id: "HF-SEQ-002" });

      await svc.createPayment("user-1", { orderId: "order-2", payType: "ALIPAY", openid: "should-ignore" });
      const { body } = lastFetchCall();
      expect(body.data.trade_type).toBe("A_JSAPI");
      expect(body.data.trans_amt).toBe("8.50");
      expect(body.data.wx_data).toBeUndefined();
    });

    it("查询支付应回溯 org_req_date/org_req_seq_id", async () => {
      mockPrisma.order.findFirst.mockResolvedValue({ userId: "user-1" });
      mockPrisma.huifuSplitRecord.findUnique.mockResolvedValue({
        outTradeNo: "HF-OUT-1",
        createdAt: new Date(2026, 5, 30),
        rawRequest: { req_seq_id: "HF-OUT-1", req_date: "20260630", trade_type: "T_JSAPI" },
      });
      mockFetchResponse({ resp_code: "00000000", trans_stat: "S" });

      const res = await svc.queryPayment("HF-OUT-1", "user-1");
      const { url, body } = lastFetchCall();
      expect(url).toBe("https://mock-api.huifu.com/v2/trade/payment/scanpay/query");
      expect(body.data).toEqual({
        huifu_id: "TEST-MCH-001",
        org_req_date: "20260630",
        org_req_seq_id: "HF-OUT-1",
      });
      expect(res.trans_stat).toBe("S");
    });

    it("查询支付：rawRequest 被分账覆写时应回退 createdAt 格式化", async () => {
      mockPrisma.order.findFirst.mockResolvedValue({ userId: "user-1" });
      mockPrisma.huifuSplitRecord.findUnique.mockResolvedValue({
        outTradeNo: "HF-OUT-2",
        createdAt: new Date(2026, 5, 28),
        rawRequest: { req_seq_id: "confirm-seq-xyz", req_date: "20260702" }, // 分账确认覆写
      });
      mockFetchResponse({ resp_code: "00000000" });

      await svc.queryPayment("HF-OUT-2", "user-1");
      expect(lastFetchCall().body.data.org_req_date).toBe("20260628");
    });

    it("查询他人支付单应被越权拦截", async () => {
      mockPrisma.order.findFirst.mockResolvedValue({ userId: "other-user" });
      await expect(svc.queryPayment("HF-OUT-1", "user-1")).rejects.toThrow("订单不存在");
    });
  });

  // ───────── 回调处理 ─────────

  describe("回调处理", () => {
    it("verifyNotify 应对 resp_data 原串验签（真实RSA端到端）", async () => {
      const respDataStr = JSON.stringify({ trans_stat: "S", req_seq_id: "HF001", hf_seq_id: "HFSEQ1" });
      const body = { resp_data: respDataStr, sign: rsaSign(respDataStr) };
      expect(await svc.verifyNotify(body, body.sign)).toBe(true);
      // 篡改 resp_data 应验签失败
      const tampered = { ...body, resp_data: respDataStr.replace("HF001", "HF002") };
      expect(await svc.verifyNotify(tampered, tampered.sign)).toBe(false);
    });

    it("verifyNotify 缺少签名应返回 false", async () => {
      expect(await svc.verifyNotify({ resp_data: "{}" })).toBe(false);
    });

    it("缺少 req_seq_id 时应忽略", async () => {
      await svc.handleNotify({ resp_data: JSON.stringify({ trans_stat: "S" }) });
      expect(mockRedis.setNX).not.toHaveBeenCalled();
    });

    it("重复回调应被分布式锁拦截", async () => {
      mockRedis.setNX.mockResolvedValue(false);
      await svc.handleNotify({ resp_data: JSON.stringify({ trans_stat: "S", req_seq_id: "HF001" }) });
      expect(mockRedis.setNX).toHaveBeenCalled();
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it("trans_stat 非 S 不处理", async () => {
      mockRedis.setNX.mockResolvedValue(true);
      await svc.handleNotify({ resp_data: JSON.stringify({ trans_stat: "P", req_seq_id: "HF002" }) });
      expect(mockPrisma.order.findFirst).not.toHaveBeenCalled();
    });

    it("trans_stat=S 回调应 CAS 更新订单状态并记 hf_seq_id", async () => {
      mockRedis.setNX.mockResolvedValue(true);
      mockPrisma.order.findFirst.mockResolvedValue({ id: "order-1", status: "PENDING" });
      mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.huifuSplitRecord.updateMany.mockResolvedValue({ count: 1 });

      await svc.handleNotify({
        resp_data: JSON.stringify({ trans_stat: "S", req_seq_id: "HF003", hf_seq_id: "HUIFU-SEQ-1" }),
      });

      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: "order-1", status: "PENDING" },
        data: expect.objectContaining({ status: "PAID", payMethod: "HUIFU", payTransactionId: "HF003" }),
      });
      expect(mockPrisma.huifuSplitRecord.updateMany).toHaveBeenCalledWith({
        where: { outTradeNo: "HF003" },
        data: expect.objectContaining({ huifuOrderId: "HUIFU-SEQ-1" }),
      });
      expect(mockRedis.del).toHaveBeenCalledWith("huifu:cb:HF003");
    });

    it("回调成功但订单不是PENDING状态应跳过", async () => {
      mockRedis.setNX.mockResolvedValue(true);
      mockPrisma.order.findFirst.mockResolvedValue({ id: "order-2", status: "PAID" });

      await svc.handleNotify({
        resp_data: JSON.stringify({ trans_stat: "S", req_seq_id: "HF004" }),
      });

      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
    });
  });

  // ───────── 分账 ─────────

  describe("分账", () => {
    it("分账记录不存在应抛出异常", async () => {
      mockPrisma.huifuSplitRecord.findUnique.mockResolvedValue(null);
      await expect(
        svc.createSplit({ orderId: "order-1", amount: 10, receivers: [{ acctId: "A1", amount: 10, name: "张三" }] }),
      ).rejects.toThrow("找不到对应的支付记录");
    });

    it("分账已完成不可重复分账", async () => {
      mockPrisma.huifuSplitRecord.findUnique.mockResolvedValue({ splitStatus: "SUCCESS" });
      await expect(
        svc.createSplit({ orderId: "order-1", amount: 10, receivers: [{ acctId: "A1", amount: 10, name: "张三" }] }),
      ).rejects.toThrow("该订单已分账或分账处理中");
    });

    it("未提供分账接收方应抛出异常", async () => {
      await expect(
        svc.createSplit({ orderId: "order-1", amount: 10 }),
      ).rejects.toThrow("请提供分账接收方信息");
    });

    it("加固：分账总额超过订单已付 → 拒绝(防超额分账)", async () => {
      mockPrisma.huifuSplitRecord.findUnique.mockResolvedValue({
        outTradeNo: "HF123", splitStatus: "PENDING", totalAmount: 100, createdAt: new Date(), rawRequest: null,
      });
      await expect(
        svc.createSplit({ orderId: "order-1", amount: 0, receivers: [
          { acctId: "A1", amount: 80, name: "张三" }, { acctId: "A2", amount: 40, name: "李四" },
        ] }),
      ).rejects.toThrow(/超过订单已付/);
    });

    it("delaytrans/confirm 报文映射：acct_split_bunch.acct_infos + org 回溯，成功置 SUCCESS", async () => {
      mockPrisma.huifuSplitRecord.findUnique.mockResolvedValue({
        outTradeNo: "HF123",
        splitStatus: "PENDING", totalAmount: 100,
        createdAt: new Date(2026, 6, 1),
        rawRequest: { req_seq_id: "HF123", req_date: "20260701" },
      });
      mockPrisma.huifuSplitRecord.update.mockResolvedValue({});
      mockFetchResponse({ resp_code: "00000000", trans_stat: "S" });

      const res = await svc.createSplit({
        orderId: "order-1", amount: 10,
        receivers: [{ acctId: "6666000100001", amount: 10, name: "张三" }],
      });

      const { url, body } = lastFetchCall();
      expect(url).toBe("https://mock-api.huifu.com/v2/trade/payment/delaytrans/confirm");
      expect(body.data.org_req_seq_id).toBe("HF123");
      expect(body.data.org_req_date).toBe("20260701");
      expect(body.data.acct_split_bunch).toEqual({
        acct_infos: [{ huifu_id: "6666000100001", div_amt: "10.00" }],
      });
      expect(res.splitStatus).toBe("SUCCESS");
      expect(mockPrisma.huifuSplitRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ splitStatus: "SUCCESS" }) }),
      );
    });

    it("应支持 receiverId/receiverName 简写模式自动构建 receivers", async () => {
      mockPrisma.huifuSplitRecord.findUnique.mockResolvedValue({
        outTradeNo: "HF123", splitStatus: "PENDING", totalAmount: 100, createdAt: new Date(), rawRequest: null,
      });
      mockPrisma.huifuSplitRecord.update.mockResolvedValue({});
      mockFetchResponse({ resp_code: "00000000", trans_stat: "P" });

      const res = await svc.createSplit({ orderId: "order-1", amount: 10, receiverId: "A1", receiverName: "张三" });
      const { body } = lastFetchCall();
      expect(body.data.acct_split_bunch.acct_infos).toEqual([{ huifu_id: "A1", div_amt: "10.00" }]);
      expect(res.splitStatus).toBe("PROCESSING");
    });

    it("querySplit 应走 trans/split/query 并按 trans_stat 更新状态", async () => {
      mockPrisma.huifuSplitRecord.findUnique.mockResolvedValue({
        orderId: "order-1", outTradeNo: "HF123", splitStatus: "PROCESSING",
        createdAt: new Date(2026, 6, 1), rawRequest: null,
      });
      mockPrisma.huifuSplitRecord.update.mockResolvedValue({});
      mockFetchResponse({ resp_code: "00000000", trans_stat: "S" });

      const res = await svc.querySplit("order-1");
      const { url, body } = lastFetchCall();
      expect(url).toBe("https://mock-api.huifu.com/v2/trade/trans/split/query");
      expect(body.data.org_req_seq_id).toBe("HF123");
      expect(res.splitStatus).toBe("SUCCESS");
    });
  });

  // ───────── 退款与余额 ─────────

  describe("退款", () => {
    it("支付记录不存在应抛出异常", async () => {
      mockPrisma.huifuSplitRecord.findUnique.mockResolvedValue(null);
      await expect(
        svc.createRefund({ orderId: "order-1", amount: 50 }),
      ).rejects.toThrow("找不到支付记录");
    });

    it("scanpay/refund 报文映射：ord_amt 两位小数 + org 回溯", async () => {
      mockPrisma.huifuSplitRecord.findUnique.mockResolvedValue({
        outTradeNo: "HF123", splitStatus: "PENDING", totalAmount: 100,
        createdAt: new Date(2026, 6, 1),
        rawRequest: { req_seq_id: "HF123", req_date: "20260701" },
      });
      mockFetchResponse({ resp_code: "00000000", trans_stat: "P" });

      const res = await svc.createRefund({ orderId: "order-1", amount: 50, reason: "多付" });
      const { url, body } = lastFetchCall();
      expect(url).toBe("https://mock-api.huifu.com/v2/trade/payment/scanpay/refund");
      expect(body.data.ord_amt).toBe("50.00");
      expect(body.data.org_req_seq_id).toBe("HF123");
      expect(body.data.org_req_date).toBe("20260701");
      expect(body.data.remark).toBe("多付");
      expect(res.outRefundNo).toMatch(/^RF/);
      expect(res.refundStatus).toBe("PROCESSING");
      // 加固③：退款写审计留痕
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: "HUIFU_REFUND", targetId: "order-1" }) }),
      );
    });

    it("加固①：退款额超过订单已付 → 拒绝(防超额真金退款)", async () => {
      mockPrisma.huifuSplitRecord.findUnique.mockResolvedValue({
        outTradeNo: "HF123", splitStatus: "SUCCESS", totalAmount: 100,
        createdAt: new Date(2026, 6, 1), rawRequest: {},
      });
      await expect(
        svc.createRefund({ orderId: "order-1", amount: 150 }),
      ).rejects.toThrow(/超过订单已付/);
    });

    it("加固②：req_seq_id 由 orderId 确定性派生(幂等·同单两次退款键相同)", async () => {
      const split = {
        outTradeNo: "HF123", splitStatus: "PENDING", totalAmount: 100,
        createdAt: new Date(2026, 6, 1), rawRequest: { req_seq_id: "HF123", req_date: "20260701" },
      };
      mockPrisma.huifuSplitRecord.findUnique.mockResolvedValue(split);
      mockFetchResponse({ resp_code: "00000000", trans_stat: "P" });
      const r1 = await svc.createRefund({ orderId: "order-1", amount: 50 });
      mockFetchResponse({ resp_code: "00000000", trans_stat: "P" });
      const r2 = await svc.createRefund({ orderId: "order-1", amount: 50 });
      expect(r1.outRefundNo).toBe(r2.outRefundNo); // 稳定键 → 汇付幂等去重
      expect(r1.outRefundNo.length).toBeLessThanOrEqual(32);
    });
  });

  describe("余额与账单", () => {
    it("queryBalance 应走 acctpayment/balance/query", async () => {
      mockFetchResponse({ resp_code: "00000000", avl_bal: "1000.00" });
      const res = await svc.queryBalance();
      const { url, body } = lastFetchCall();
      expect(url).toBe("https://mock-api.huifu.com/v2/trade/acctpayment/balance/query");
      expect(body.data.huifu_id).toBe("TEST-MCH-001");
      expect(res.avl_bal).toBe("1000.00");
    });

    it("downloadBill 未接入应诚实降级抛业务异常", async () => {
      await expect(svc.downloadBill("20260701")).rejects.toThrow("暂未接入");
    });
  });
});
