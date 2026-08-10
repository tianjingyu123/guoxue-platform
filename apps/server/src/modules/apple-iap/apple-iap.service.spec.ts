import { BadRequestException, ConflictException } from "@nestjs/common";
import { Environment, Type } from "@apple/app-store-server-library";
import { AppleIapService } from "./apple-iap.service";

function createPrismaMock() {
  const tx = {
    appleIapPurchase: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
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
    expect(tx.appleIapPurchase.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { transactionId },
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
