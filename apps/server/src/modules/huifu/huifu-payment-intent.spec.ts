import { serialize, deserialize } from "v8";
const structuredClone = <T>(value: T): T => deserialize(serialize(value));
import { HuifuService } from "./huifu.service";
import { ShopPaymentService } from "../shop/shop-payment.service";

const dto = { orderId: "order-1", payType: "ALIPAY" };
const accepted = { resp_code: "00000100", trans_stat: "P", hf_seq_id: "hf-1", qr_code: "https://qr.alipay.com/original" };
const deferred = <T = any>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
};

/**
 * 共享持久层替身：串行事务、失败回滚、唯一约束、条件更新。
 * 两个服务实例共享数据库但不共享服务状态；此测试不冒充真实PostgreSQL并发测试。
 */
function database() {
  let order: any = { id: "order-1", userId: "user-1", amount: 1, status: "PENDING", type: "PRODUCT", payTransactionId: null, payMethod: null };
  let record: any = null;
  let queue = Promise.resolve();
  let commits = 0;
  const db: any = {
    order: {
      findUnique: jest.fn(async () => structuredClone(order)),
      findFirst: jest.fn(async ({ where }: any) => order?.payTransactionId === where.payTransactionId ? structuredClone(order) : null),
      updateMany: jest.fn(async ({ where, data }: any) => {
        if (Object.entries(where).some(([k, v]) => order?.[k] !== v)) return { count: 0 };
        order = { ...order, ...data };
        return { count: 1 };
      }),
    },
    huifuSplitRecord: {
      findUnique: jest.fn(async () => structuredClone(record)),
      create: jest.fn(async ({ data }: any) => {
        if (record) throw Object.assign(new Error("unique"), { code: "P2002" });
        record = { ...structuredClone(data), id: "record-1", createdAt: new Date() };
        return structuredClone(record);
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        if (!record || record.id !== where.id || record.outTradeNo !== where.outTradeNo ||
            record.rawResponse?._paymentInit !== where.rawResponse.equals) return { count: 0 };
        record = { ...record, ...structuredClone(data) };
        return { count: 1 };
      }),
    },
    $transaction: jest.fn((fn: any) => {
      const result = queue.then(async () => {
        const before = structuredClone({ order, record });
        try { const value = await fn(db); commits++; return value; }
        catch (error) { order = before.order; record = before.record; throw error; }
      });
      queue = result.then(() => undefined, () => undefined);
      return result;
    }),
  };
  return { db, get order() { return order; }, get record() { return record; }, get commits() { return commits; },
    changeOrder(data: any) { order = { ...order, ...data }; },
    changeRecord(data: any) { record = { ...record, ...data }; },
  };
}

function service(db: any, call = jest.fn().mockResolvedValue(accepted)) {
  const svc = new HuifuService(db, { del: jest.fn() } as any);
  jest.spyOn(svc as any, "getConfig").mockImplementation(async (key: any) => key === "merchantId" ? "mch-1" : "https://example.test/notify");
  jest.spyOn(svc as any, "callApi").mockImplementation(call);
  return { svc, call };
}

function wechat(store: ReturnType<typeof database>, request = jest.fn().mockResolvedValue({ orderInfo: {}, paySign: {}, codeUrl: "wx://qr", h5Url: "https://wx.test" })) {
  // 故意让所有Redis锁申请都成功：验证安全性来自数据库，而不是60秒锁。
  const redis: any = { setNX: jest.fn().mockResolvedValue(true), del: jest.fn(), getJson: jest.fn().mockResolvedValue(null), setJson: jest.fn() };
  const gateway: any = { isConfigured: true, isAppConfigured: true, createAppOrder: request,
    createJsapiOrder: request, createNativeOrder: request, createH5Order: request,
    closeOrder: jest.fn().mockResolvedValue(undefined), queryOrder: jest.fn(), queryOrderVerified: jest.fn().mockRejectedValue(new Error("结果待确认")) };
  const svc = new ShopPaymentService(store.db, redis, gateway, {} as any, {} as any,
    {} as any, {} as any, {} as any, {} as any, { getOrder: () => store.db.order.findUnique() } as any);
  const start = (kind: string) => kind === "APP" ? svc.createAppPayment("order-1", "user-1", "android") :
    kind === "JSAPI" ? svc.createJsapiPayment("user-1", "openid-1", "order-1") :
    kind === "NATIVE" ? svc.createNativePayment("order-1", "user-1") : svc.createH5Payment("order-1", "user-1", "127.0.0.1");
  return { svc, start, request, gateway, redis };
}

describe("汇付持久化初始化幂等", () => {
  it.each([0, -1, NaN, Infinity, 1.001, Number.MAX_SAFE_INTEGER])("无效金额%s在持久化和资金调用前拒绝", async (amount) => {
    const store = database(), hf = service(store.db);
    store.changeOrder({ amount });
    await expect(hf.svc.createPayment("user-1", dto)).rejects.toThrow("金额无效");
    expect(store.record).toBeNull();
    expect(hf.call).not.toHaveBeenCalled();
  });
  it("资金调用前已提交订单归属、原始日期/流水和唯一意图", async () => {
    const store = database();
    const { svc, call } = service(store.db, jest.fn(async (_path, data) => {
      expect(store.commits).toBe(1);
      expect(store.order.payMethod).toBe("HUIFU");
      expect(store.order.payTransactionId).toBe(data.req_seq_id);
      expect(store.record.rawRequest).toEqual(data);
      expect(store.record.rawResponse).toEqual({ _paymentInit: "RESERVED" });
      expect(data.req_seq_id).toMatch(/^HF[0-9a-f]{30}$/);
      return accepted;
    }));
    const result = await svc.createPayment("user-1", dto);
    expect(result.paymentState).toBe("READY");
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("两个实例并发：等待结果的第二请求只返回原单，不重复调用渠道", async () => {
    const store = database(), entered = deferred(), response = deferred();
    const a = service(store.db, jest.fn(async () => { entered.resolve(null); return response.promise; }));
    const b = service(store.db);
    const first = a.svc.createPayment("user-1", dto);
    await entered.promise;
    const second = await b.svc.createPayment("user-1", dto);
    expect(second).toMatchObject({ paymentState: "UNKNOWN", outTradeNo: store.record.outTradeNo, qrCode: null });
    expect(b.call).not.toHaveBeenCalled();
    response.resolve(accepted);
    const done = await first;
    expect((await b.svc.createPayment("user-1", dto)).qrCode).toBe(done.qrCode);
    expect(store.db.huifuSplitRecord.create).toHaveBeenCalledTimes(1);
    expect(a.call).toHaveBeenCalledTimes(1);
  });

  it("多次并发请求都保留相同流水和二维码", async () => {
    const store = database(), { svc, call } = service(store.db);
    const results = await Promise.all(Array.from({ length: 20 }, () => svc.createPayment("user-1", dto)));
    expect(new Set(results.map((r) => r.outTradeNo)).size).toBe(1);
    expect(call).toHaveBeenCalledTimes(1);
    expect(store.db.huifuSplitRecord.create).toHaveBeenCalledTimes(1);
  });

  it.each(["网络超时", "响应验签失败", "发送前进程退出"])("%s后新服务实例只恢复原单查询", async (reason) => {
    const store = database(), a = service(store.db, jest.fn().mockRejectedValue(new Error(reason)));
    await expect(a.svc.createPayment("user-1", dto)).rejects.toThrow(reason);
    const original = structuredClone(store.record);
    const b = service(store.db);
    const restored = await b.svc.createPayment("user-1", dto);
    expect(restored).toMatchObject({ outTradeNo: original.outTradeNo, paymentState: "UNKNOWN", qrCode: null });
    expect(store.record.rawRequest).toEqual(original.rawRequest);
    expect(b.call).not.toHaveBeenCalled();
    expect(store.order.payTransactionId).toBe(original.outTradeNo);
  });

  it("响应保存失败仍保留RESERVED，重试不可重新下单", async () => {
    const store = database(), a = service(store.db);
    store.db.huifuSplitRecord.updateMany.mockRejectedValueOnce(new Error("database unavailable"));
    await expect(a.svc.createPayment("user-1", dto)).rejects.toThrow("database unavailable");
    expect(store.record.rawResponse._paymentInit).toBe("RESERVED");
    const b = service(store.db);
    expect((await b.svc.createPayment("user-1", dto)).paymentState).toBe("UNKNOWN");
    expect(b.call).not.toHaveBeenCalled();
  });

  it("预建记录失败回滚订单且不得出站", async () => {
    const store = database(), { svc, call } = service(store.db);
    store.db.huifuSplitRecord.create.mockRejectedValueOnce(new Error("disk full"));
    await expect(svc.createPayment("user-1", dto)).rejects.toThrow("disk full");
    expect(store.order.payTransactionId).toBeNull();
    expect(store.record).toBeNull();
    expect(call).not.toHaveBeenCalled();
  });

  it.each(["P2034", "P2002"])("事务竞争%s只读胜者，不重新允许创建", async (code) => {
    const store = database(), a = service(store.db);
    const result = await a.svc.createPayment("user-1", dto);
    store.db.$transaction.mockRejectedValueOnce(Object.assign(new Error("conflict"), { code }));
    const b = service(store.db);
    expect((await b.svc.createPayment("user-1", dto)).outTradeNo).toBe(result.outTradeNo);
    expect(b.call).not.toHaveBeenCalled();
  });

  it("序列化失败却没有胜者时也不自动创建", async () => {
    const store = database(), { svc, call } = service(store.db);
    store.db.$transaction.mockRejectedValueOnce(Object.assign(new Error("conflict"), { code: "P2034" }));
    await expect(svc.createPayment("user-1", dto)).rejects.toThrow("初始化中");
    expect(call).not.toHaveBeenCalled();
    expect(store.record).toBeNull();
  });

  it("提交响应丢失不出站，下一次仍读取已持久化的原意图", async () => {
    const store = database(), original = store.db.$transaction.getMockImplementation();
    store.db.$transaction.mockImplementationOnce(async (fn: any) => { await original(fn); throw new Error("commit response lost"); });
    const a = service(store.db);
    await expect(a.svc.createPayment("user-1", dto)).rejects.toThrow("commit response lost");
    expect(a.call).not.toHaveBeenCalled();
    const b = service(store.db);
    expect((await b.svc.createPayment("user-1", dto)).paymentState).toBe("UNKNOWN");
    expect(b.call).not.toHaveBeenCalled();
  });

  it("订单CAS失败时不创建意图，不调用渠道", async () => {
    const store = database(), { svc, call } = service(store.db);
    store.db.order.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(svc.createPayment("user-1", dto)).rejects.toThrow("状态已变化");
    expect(store.record).toBeNull();
    expect(call).not.toHaveBeenCalled();
  });

  it.each([{ userId: "other" }, { status: "PAID" }, { status: "CANCELLED" }, { payTransactionId: "WX-existing", payMethod: "WECHAT" }])("拒绝不属于本人/不可支付/已有其他流水的订单 %j", async (change) => {
    const store = database(), { svc, call } = service(store.db);
    store.changeOrder(change);
    await expect(svc.createPayment("user-1", dto)).rejects.toThrow();
    expect(call).not.toHaveBeenCalled();
  });

  it("已有汇付意图不能换渠道、金额或流水", async () => {
    const store = database(), { svc, call } = service(store.db);
    await svc.createPayment("user-1", dto);
    await expect(svc.createPayment("user-1", { ...dto, payType: "UNIONPAY" })).rejects.toThrow("已有支付记录");
    store.changeOrder({ amount: 2 });
    await expect(svc.createPayment("user-1", dto)).rejects.toThrow("已有支付记录");
    store.changeOrder({ amount: 1, payTransactionId: "another" });
    await expect(svc.createPayment("user-1", dto)).rejects.toThrow("已有支付记录");
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("原业务失败和无凭据响应也不能重新创建", async () => {
    for (const response of [{ resp_code: "90000000", trans_stat: "F", resp_desc: "rejected" }, { resp_code: "00000100" }]) {
      const store = database(), a = service(store.db, jest.fn().mockResolvedValue(response));
      await a.svc.createPayment("user-1", dto).catch(() => undefined);
      const b = service(store.db);
      await b.svc.createPayment("user-1", dto).catch(() => undefined);
      expect(b.call).not.toHaveBeenCalled();
      expect(store.db.huifuSplitRecord.create).toHaveBeenCalledTimes(1);
    }
  });

  it("跨天或二维码过期不返回旧凭据，不重新创建", async () => {
    const store = database(), { svc, call } = service(store.db);
    const result = await svc.createPayment("user-1", dto);
    store.changeRecord({ createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) });
    const expired = await svc.createPayment("user-1", dto);
    expect(expired).toMatchObject({ outTradeNo: result.outTradeNo, paymentState: "EXPIRED", qrCode: null, raw: null });
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("通知提前把订单标记PAID，迟到响应不覆盖订单或返回支付二维码", async () => {
    const store = database(), { svc } = service(store.db, jest.fn(async () => {
      store.changeOrder({ status: "PAID" }); return accepted;
    }));
    await expect(svc.createPayment("user-1", dto)).rejects.toThrow("状态已变化");
    expect(store.order.status).toBe("PAID");
    expect(store.db.order.updateMany).toHaveBeenCalledTimes(1);
  });

  it("响应CAS失败不覆盖已更新记录", async () => {
    const store = database(), { svc } = service(store.db, jest.fn(async () => {
      store.changeRecord({ rawResponse: { _paymentInit: "RESOLVED", marker: "newer" } }); return accepted;
    }));
    await expect(svc.createPayment("user-1", dto)).rejects.toThrow("结果已变化");
    expect(store.record.rawResponse.marker).toBe("newer");
  });

  it("Android可通过订单中保留的流水查询未知结果并确认到账", async () => {
    const store = database(), a = service(store.db, jest.fn().mockRejectedValue(new Error("timeout")));
    await a.svc.createPayment("user-1", dto).catch(() => undefined);
    const b = service(store.db, jest.fn().mockResolvedValue({ resp_code: "00000000", trans_stat: "S" }));
    const handler = jest.fn().mockResolvedValue(undefined);
    b.svc.registerPaymentNotifyHandler(handler);
    await b.svc.queryPayment(store.order.payTransactionId, "user-1");
    expect(b.call).toHaveBeenCalledWith("/v3/trade/payment/scanpay/query", expect.objectContaining({
      org_req_seq_id: store.record.outTradeNo, org_req_date: store.record.rawRequest.req_date,
    }), true);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ req_seq_id: store.record.outTradeNo, trans_stat: "S" }));
  });

  describe.each(["APP", "JSAPI", "NATIVE", "H5"])("跨渠道互斥：微信%s", (kind) => {
    it("严格查单NOTPAY后保留原流水，明确关单后可恢复创建", async () => {
      const store = database(), first = wechat(store, jest.fn().mockRejectedValue(new Error("timeout")));
      await first.start(kind).catch(() => undefined);
      const original = store.order.payTransactionId;
      const retry = wechat(store);
      retry.gateway.queryOrderVerified.mockResolvedValue({ trade_state: "NOTPAY" });
      retry.gateway.closeOrder.mockImplementation(async (outTradeNo: string) => {
        expect(outTradeNo).toBe(original);
        expect(store.order.payTransactionId).toBe(original);
        expect(store.order.payMethod).toBe("WECHAT");
      });
      await retry.start(kind);
      expect(retry.gateway.queryOrderVerified).toHaveBeenCalledWith(original, 100);
      expect(retry.gateway.closeOrder).toHaveBeenCalledTimes(1);
      expect(retry.request).toHaveBeenCalledTimes(1);
      expect(store.order.payTransactionId).not.toBe(original);
    });

    it("查询USERPAYING不允许释放INIT，也不关单", async () => {
      const store = database(), first = wechat(store, jest.fn().mockRejectedValue(new Error("timeout")));
      await first.start(kind).catch(() => undefined);
      const retry = wechat(store);
      retry.gateway.queryOrderVerified.mockResolvedValue({ trade_state: "USERPAYING" });
      await expect(retry.start(kind)).rejects.toThrow("待确认");
      expect(store.order.payMethod).toBe("WECHAT_INIT");
      expect(retry.gateway.closeOrder).not.toHaveBeenCalled();
      expect(retry.request).not.toHaveBeenCalled();
    });

    it("收到初始化结果前订单取消，不返回可调起凭据", async () => {
      const store = database(), wx = wechat(store, jest.fn(async () => {
        store.changeOrder({ status: "CANCELLED" });
        return { orderInfo: {}, paySign: {}, codeUrl: "wx://qr", h5Url: "https://wx.test" };
      }));
      await expect(wx.start(kind)).rejects.toThrow("状态已变化");
      expect(store.order.status).toBe("CANCELLED");
      expect(wx.redis.setJson).not.toHaveBeenCalled();
    });

    it("金额非法不持久化或向渠道下单", async () => {
      const store = database(), wx = wechat(store);
      store.changeOrder({ amount: 0 });
      await expect(wx.start(kind)).rejects.toThrow("金额无效");
      expect(store.order.payTransactionId).toBeNull();
      expect(wx.request).not.toHaveBeenCalled();
    });
    it("汇付已出站时微信不能关汇付单或另开一笔", async () => {
      const store = database(), entered = deferred(), response = deferred();
      const hf = service(store.db, jest.fn(async () => { entered.resolve(null); return response.promise; }));
      const first = hf.svc.createPayment("user-1", dto);
      await entered.promise;
      const wx = wechat(store);
      await expect(wx.start(kind)).rejects.toThrow("汇付");
      expect(wx.request).not.toHaveBeenCalled();
      expect(wx.gateway.closeOrder).not.toHaveBeenCalled();
      response.resolve(accepted);
      await first;
    });

    it("微信在调用前持久化占用，汇付不能覆盖", async () => {
      const store = database(), entered = deferred(), response = deferred();
      const wx = wechat(store, jest.fn(async (data) => {
        expect(store.commits).toBeGreaterThan(0);
        expect(store.order.payMethod).toBe("WECHAT_INIT");
        expect(store.order.payTransactionId).toBe(data.outTradeNo);
        entered.resolve(null); return response.promise;
      }));
      const first = wx.start(kind);
      await entered.promise;
      const hf = service(store.db);
      await expect(hf.svc.createPayment("user-1", dto)).rejects.toThrow("其他支付单");
      expect(hf.call).not.toHaveBeenCalled();
      response.resolve({ orderInfo: {}, paySign: {}, codeUrl: "wx://qr", h5Url: "https://wx.test" });
      await first;
      expect(store.order.payMethod).toBe("WECHAT");
    });

    it("同时竞争空订单也只有一个渠道可以出站", async () => {
      const store = database(), hf = service(store.db), wx = wechat(store);
      await Promise.allSettled([wx.start(kind), hf.svc.createPayment("user-1", dto)]);
      expect(wx.request.mock.calls.length + hf.call.mock.calls.length).toBe(1);
    });

    it("微信结果未知后即使锁可再次取得也不重发或跨入口覆盖", async () => {
      const store = database(), wx = wechat(store, jest.fn().mockRejectedValue(new Error("timeout")));
      await expect(wx.start(kind)).rejects.toThrow("timeout");
      const original = store.order.payTransactionId;
      const next = wechat(store);
      await expect(next.start(kind)).rejects.toThrow("结果待确认");
      expect(next.request).not.toHaveBeenCalled();
      expect(next.gateway.closeOrder).not.toHaveBeenCalled();
      expect(store.order.payTransactionId).toBe(original);
    });

    it("数据库占用失败不产生微信孤儿单", async () => {
      const store = database(), wx = wechat(store);
      store.db.order.updateMany.mockResolvedValueOnce({ count: 0 });
      await expect(wx.start(kind)).rejects.toThrow("状态已变更");
      expect(wx.request).not.toHaveBeenCalled();
      expect(store.order.payTransactionId).toBeNull();
    });
  });

  it("普通查询按汇付渠道分流，不把HF流水发微信", async () => {
    const store = database(), hf = service(store.db);
    await hf.svc.createPayment("user-1", dto);
    const wx = wechat(store), queryPayment = jest.fn().mockResolvedValue({ trans_stat: "P" });
    (wx.svc as any).huifu = { queryPayment };
    expect((await wx.svc.queryPaymentStatus("order-1", "user-1")).tradeState).toBe("USERPAYING");
    expect(queryPayment).toHaveBeenCalledWith(store.record.outTradeNo, "user-1");
    expect(wx.gateway.queryOrderVerified).not.toHaveBeenCalled();
    expect(wx.gateway.queryOrder).not.toHaveBeenCalled();
  });

  it("微信严格查单成功交给统一履约，失败则不返回成功", async () => {
    const store = database();
    store.changeOrder({ payMethod: "WECHAT_INIT", payTransactionId: "GX-original" });
    const wx = wechat(store);
    wx.gateway.queryOrderVerified.mockResolvedValue({ trade_state: "SUCCESS", transaction_id: "wx-channel", out_trade_no: "GX-original", amount: { total: 100 } });
    const handler = jest.spyOn(wx.svc, "handlePaymentNotify").mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await expect(wx.svc.queryPaymentStatus("order-1", "user-1")).rejects.toThrow("尚未完成本地入账");
    expect((await wx.svc.queryPaymentStatus("order-1", "user-1")).tradeState).toBe("SUCCESS");
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ attach: "order-1", out_trade_no: "GX-original" }));
  });

  it("payMethod为空的HF遗留单也不能认作微信", async () => {
    const store = database(), wx = wechat(store);
    store.changeOrder({ payTransactionId: "HF-legacy", payMethod: null });
    await expect(wx.start("APP")).rejects.toThrow("汇付");
    expect(wx.request).not.toHaveBeenCalled();
    expect(wx.gateway.closeOrder).not.toHaveBeenCalled();
  });
});
