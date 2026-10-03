import { BadRequestException, ConflictException } from "@nestjs/common";
import { Environment, Type } from "@apple/app-store-server-library";
import { AppleIapService } from "./apple-iap.service";

function createPrismaMock() {
  const tx = {
    appleIapPurchase: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    appleIapNotification: {
      create: jest.fn(),
    },
    virtualCoinAccount: {
      upsert: jest.fn(),
      update: jest.fn(),
    },
    virtualCoinRecharge: {
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    virtualCoinTransaction: {
      create: jest.fn(),
    },
  };

  return {
    tx,
    prisma: {
      appleIapPurchase: {
        findUnique: jest.fn(),
      },
      appleIapNotification: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(async (handler: (client: typeof tx) => unknown) => handler(tx)),
    },
  };
}

describe("AppleIapService", () => {
  const transactionId = "2000000123456789";
  const productId = "com.rebu.iosapprebu.coins1000";

  it("正式服务不回退沙盒免费交易", () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const { prisma } = createPrismaMock();
      expect((new AppleIapService(prisma as never) as any).configuredEnvironments())
        .toEqual([Environment.PRODUCTION]);
    } finally {
      if (previous === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
    }
  });

  it.each([undefined, "other-user"])("首次交易账号标记缺失或不匹配时拒绝发币：%s", async (token) => {
    const { prisma, tx } = createPrismaMock();
    const service = new AppleIapService(prisma as never);
    prisma.appleIapPurchase.findUnique.mockResolvedValue(null);
    jest.spyOn(service as never, "fetchVerifiedTransaction" as never).mockResolvedValue({
      environment: Environment.SANDBOX,
      payload: { transactionId, productId, bundleId: "com.rebu.iosapprebu",
        type: Type.CONSUMABLE, quantity: 1, appAccountToken: token },
    } as never);
    await expect(service.verifyPurchase("user-1", { transactionId, productId })).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.virtualCoinAccount.upsert).not.toHaveBeenCalled();
  });

  it("并发退款状态已被其他通知更新时不重复扣币", async () => {
    const { prisma, tx } = createPrismaMock();
    tx.appleIapPurchase.findUnique.mockResolvedValue({ userId: "user-1", status: "VERIFIED", amountCoin: 1000 });
    tx.appleIapPurchase.updateMany.mockResolvedValue({ count: 0 });
    await expect((new AppleIapService(prisma as never) as any).applyChargeback(tx, transactionId, "REFUNDED"))
      .resolves.toBe("ALREADY_CHARGED_BACK");
    expect(tx.virtualCoinAccount.update).not.toHaveBeenCalled();
    expect(tx.virtualCoinTransaction.create).not.toHaveBeenCalled();
  });

  it("两条不同退款通知同时读取旧状态后只扣币一次", async () => {
    const { prisma, tx } = createPrismaMock();
    let storedStatus = "VERIFIED";
    let readers = 0;
    let release!: () => void;
    const bothRead = new Promise<void>((resolve) => { release = resolve; });
    tx.appleIapPurchase.findUnique.mockImplementation(async () => {
      const snapshot = { userId: "user-1", status: storedStatus, amountCoin: 1000 };
      if (++readers === 2) release();
      await bothRead;
      return snapshot;
    });
    tx.appleIapPurchase.updateMany.mockImplementation(async ({ where, data }) => {
      if (storedStatus !== where.status) return { count: 0 };
      storedStatus = data.status;
      return { count: 1 };
    });
    tx.virtualCoinAccount.update.mockResolvedValue({ balance: 0 });
    const service = new AppleIapService(prisma as never) as any;
    const results = await Promise.all([
      service.applyChargeback(tx, transactionId, "REFUNDED"),
      service.applyChargeback(tx, transactionId, "REFUNDED"),
    ]);
    expect(results.sort()).toEqual(["ALREADY_CHARGED_BACK", "REFUNDED"]);
    expect(tx.virtualCoinAccount.update).toHaveBeenCalledTimes(1);
    expect(tx.virtualCoinTransaction.create).toHaveBeenCalledTimes(1);
  });

  it("退款撤销抢占失败不能重复发币", async () => {
    const { prisma, tx } = createPrismaMock();
    tx.appleIapPurchase.findUnique.mockResolvedValue({ userId: "user-1", status: "REFUNDED", amountCoin: 1000 });
    tx.appleIapPurchase.updateMany.mockResolvedValue({ count: 0 });
    await expect((new AppleIapService(prisma as never) as any).reverseChargeback(tx, transactionId)).resolves.toBe("STATE_CHANGED");
    expect(tx.virtualCoinAccount.update).not.toHaveBeenCalled();
  });

  it("退款撤销不能恢复已被撤销资格的交易", async () => {
    const { prisma, tx } = createPrismaMock();
    tx.appleIapPurchase.findUnique.mockResolvedValue({ status: "REVOKED" });
    await expect((new AppleIapService(prisma as never) as any).reverseChargeback(tx, transactionId)).resolves.toBe("NOT_REFUNDED");
    expect(tx.appleIapPurchase.updateMany).not.toHaveBeenCalled();
    expect(tx.virtualCoinAccount.update).not.toHaveBeenCalled();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("服务端验签成功后只入账一次", async () => {
    const { prisma, tx } = createPrismaMock();
    const service = new AppleIapService(prisma as never);
    prisma.appleIapPurchase.findUnique.mockResolvedValue(null);
    tx.appleIapPurchase.create.mockResolvedValue({
      transactionId,
      productId,
      amountCoin: 1000,
    });
    tx.virtualCoinAccount.upsert.mockResolvedValue({ balance: 1600 });
    jest.spyOn(service as never, "fetchVerifiedTransaction" as never).mockResolvedValue({
      environment: Environment.SANDBOX,
      signedTransactionInfo: "signed-transaction",
      payload: {
        transactionId,
        originalTransactionId: transactionId,
        productId,
        bundleId: "com.rebu.iosapprebu",
        type: Type.CONSUMABLE,
        quantity: 1,
        currency: "CNY",
        price: 100000,
        purchaseDate: 1_750_000_000_000,
        appAccountToken: "user-1",
      },
    } as never);

    await expect(service.verifyPurchase("user-1", { transactionId, productId })).resolves.toEqual({
      success: true,
      duplicate: false,
      transactionId,
      productId,
      amountCoin: 1000,
    });
    expect(tx.appleIapPurchase.create).toHaveBeenCalledTimes(1);
    expect(tx.virtualCoinAccount.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "user-1" },
      create: expect.objectContaining({ balance: 1000, totalRecharged: 1000 }),
    }));
    expect(tx.virtualCoinRecharge.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        orderNo: `APPLE_IAP_${transactionId}`,
        amountCoin: 1000,
        payMethod: "APPLE_IAP",
        status: "PAID",
      }),
    }));
    expect(tx.virtualCoinTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ amountCoin: 1000, balanceAfter: 1600, refId: transactionId }),
    }));
  });

  it("重复回调直接返回既有结果，不重复验签和入账", async () => {
    const { prisma } = createPrismaMock();
    const service = new AppleIapService(prisma as never);
    prisma.appleIapPurchase.findUnique.mockResolvedValue({
      userId: "user-1",
      transactionId,
      productId,
      amountCoin: 1000,
      status: "VERIFIED",
    });
    const verifySpy = jest.spyOn(service as never, "fetchVerifiedTransaction" as never);

    await expect(service.verifyPurchase("user-1", { transactionId, productId })).resolves.toEqual({
      success: true,
      duplicate: true,
      transactionId,
      productId,
      amountCoin: 1000,
    });
    expect(verifySpy).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("拒绝把已入账交易绑定到另一个用户", async () => {
    const { prisma } = createPrismaMock();
    const service = new AppleIapService(prisma as never);
    prisma.appleIapPurchase.findUnique.mockResolvedValue({
      userId: "user-2",
      transactionId,
      productId,
      amountCoin: 1000,
      status: "VERIFIED",
    });

    await expect(service.verifyPurchase("user-1", { transactionId, productId }))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it("拒绝交易凭证中的商品与客户端申报商品不一致", async () => {
    const { prisma } = createPrismaMock();
    const service = new AppleIapService(prisma as never);
    prisma.appleIapPurchase.findUnique.mockResolvedValue(null);
    jest.spyOn(service as never, "fetchVerifiedTransaction" as never).mockResolvedValue({
      environment: Environment.SANDBOX,
      signedTransactionInfo: "signed-transaction",
      payload: {
        transactionId,
        productId: "com.rebu.iosapprebu.coins5000",
        bundleId: "com.rebu.iosapprebu",
        type: Type.CONSUMABLE,
        quantity: 1,
      },
    } as never);

    await expect(service.verifyPurchase("user-1", { transactionId, productId }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("Apple 退款通知会冲正余额并记录冲正流水", async () => {
    const { prisma, tx } = createPrismaMock();
    const service = new AppleIapService(prisma as never);
    tx.appleIapPurchase.findUnique.mockResolvedValue({
      userId: "user-1",
      transactionId,
      amountCoin: 1000,
      status: "VERIFIED",
    });
    tx.virtualCoinAccount.update.mockResolvedValue({ balance: -200 });

    await expect((service as never as {
      applyChargeback: (...args: unknown[]) => Promise<string>;
    }).applyChargeback(tx, transactionId, "REFUNDED", 1_750_000_000_000, 1))
      .resolves.toBe("REFUNDED");
    expect(tx.appleIapPurchase.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { transactionId, status: "VERIFIED" },
      data: expect.objectContaining({ status: "REFUNDED", revocationReason: 1 }),
    }));
    expect(tx.virtualCoinTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        type: "CHARGEBACK",
        amountCoin: -1000,
        balanceAfter: -200,
        scene: "APPLE_IAP_CHARGEBACK",
      }),
    }));
  });
});
