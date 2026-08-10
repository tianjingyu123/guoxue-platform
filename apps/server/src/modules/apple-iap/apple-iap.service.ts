import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import {
  AppStoreServerAPIClient,
  Environment,
  JWSTransactionDecodedPayload,
  ResponseBodyV2DecodedPayload,
  SignedDataVerifier,
  Type,
} from "@apple/app-store-server-library";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { APPLE_ROOT_CERTIFICATES } from "./apple-root-certificates";
import { getAppleIapSettings } from "./apple-iap.config";
import { VerifyAppleIapPurchaseDto } from "./apple-iap.dto";

interface VerifiedTransaction {
  environment: Environment;
  signedTransactionInfo: string;
  payload: JWSTransactionDecodedPayload;
}

@Injectable()
export class AppleIapService {
  private readonly logger = new Logger(AppleIapService.name);

  constructor(private readonly prisma: PrismaService) {}

  getProducts() {
    const settings = getAppleIapSettings();
    return {
      ready: settings.enabled,
      bundleId: settings.bundleId,
      products: settings.products.map((item) => ({
        productId: item.productId,
        amountCoin: item.amountCoin,
        popular: Boolean(item.popular),
      })),
    };
  }

  private configuredEnvironments(): Environment[] {
    const configured = getAppleIapSettings().environment;
    if (configured === "SANDBOX") return [Environment.SANDBOX];
    if (configured === "PRODUCTION") return [Environment.PRODUCTION];
    // TestFlight/开发包产生 Sandbox 交易，正式商店产生 Production 交易。
    return [Environment.PRODUCTION, Environment.SANDBOX];
  }

  private createClient(environment: Environment): AppStoreServerAPIClient {
    const settings = getAppleIapSettings();
    if (!settings.enabled) {
      throw new ServiceUnavailableException("Apple 应用内购买尚未完成服务端密钥配置");
    }
    return new AppStoreServerAPIClient(
      settings.privateKey,
      settings.keyId,
      settings.issuerId,
      settings.bundleId,
      environment,
    );
  }

  private createVerifier(environment: Environment): SignedDataVerifier {
    const settings = getAppleIapSettings();
    return new SignedDataVerifier(
      APPLE_ROOT_CERTIFICATES,
      true,
      environment,
      settings.bundleId,
      environment === Environment.PRODUCTION ? settings.appAppleId : undefined,
    );
  }

  private async fetchVerifiedTransaction(transactionId: string): Promise<VerifiedTransaction> {
    let lastError: unknown;
    for (const environment of this.configuredEnvironments()) {
      try {
        const response = await this.createClient(environment).getTransactionInfo(transactionId);
        if (!response.signedTransactionInfo) throw new Error("Apple 未返回签名交易信息");
        const payload = await this.createVerifier(environment).verifyAndDecodeTransaction(
          response.signedTransactionInfo,
        );
        return { environment, signedTransactionInfo: response.signedTransactionInfo, payload };
      } catch (error) {
        lastError = error;
        this.logger.debug(`Apple 交易在 ${environment} 环境验证未通过`);
      }
    }
    this.logger.warn(`Apple 交易验证失败: ${lastError instanceof Error ? lastError.name : "UnknownError"}`);
    throw new BadRequestException("无法验证该 Apple 交易，请稍后重试");
  }

  private validateTransaction(
    verified: VerifiedTransaction,
    expectedTransactionId: string,
    expectedProductId: string,
  ) {
    const settings = getAppleIapSettings();
    const product = settings.products.find((item) => item.productId === expectedProductId);
    if (!product) throw new BadRequestException("未配置的 Apple 内购商品");

    const { payload } = verified;
    if (payload.transactionId !== expectedTransactionId) throw new BadRequestException("Apple 交易号不一致");
    if (payload.productId !== expectedProductId) throw new BadRequestException("Apple 商品与订单不一致");
    if (payload.bundleId !== settings.bundleId) throw new BadRequestException("Apple 交易不属于当前应用");
    if (payload.type !== Type.CONSUMABLE) throw new BadRequestException("Apple 商品类型必须为消耗型项目");
    if ((payload.quantity ?? 1) !== 1) throw new BadRequestException("暂不支持一次购买多份商品");
    if (payload.revocationDate) throw new BadRequestException("该 Apple 交易已退款或撤销");
    return product;
  }

  private duplicateResult(purchase: {
    userId: string;
    transactionId: string;
    productId: string;
    amountCoin: number;
    status: string;
  }, userId: string) {
    if (purchase.userId !== userId) throw new ConflictException("该 Apple 交易已绑定其他账号");
    if (purchase.status !== "VERIFIED") throw new ConflictException("该 Apple 交易已退款或撤销");
    return {
      success: true,
      duplicate: true,
      transactionId: purchase.transactionId,
      productId: purchase.productId,
      amountCoin: purchase.amountCoin,
    };
  }

  async verifyPurchase(userId: string, dto: VerifyAppleIapPurchaseDto) {
    const transactionId = dto.transactionId.trim();
    const productId = dto.productId.trim();
    const existing = await this.prisma.appleIapPurchase.findUnique({ where: { transactionId } });
    if (existing) return this.duplicateResult(existing, userId);

    const verified = await this.fetchVerifiedTransaction(transactionId);
    const product = this.validateTransaction(verified, transactionId, productId);
    const { payload } = verified;
    const receiptHash = dto.transactionReceipt
      ? createHash("sha256").update(dto.transactionReceipt, "utf8").digest("hex")
      : undefined;
    const actualRmb = payload.currency === "CNY" && payload.price !== undefined
      ? payload.price / 1000
      : product.referenceRmb;

    try {
      const purchase = await this.prisma.$transaction(async (tx) => {
        const created = await tx.appleIapPurchase.create({
          data: {
            userId,
            productId,
            transactionId,
            originalTransactionId: payload.originalTransactionId,
            environment: verified.environment,
            amountCoin: product.amountCoin,
            referenceRmb: new Prisma.Decimal(actualRmb),
            currency: payload.currency,
            priceMilliunits: payload.price,
            storefront: payload.storefront,
            receiptHash,
            appAccountToken: payload.appAccountToken,
            purchasedAt: payload.purchaseDate ? new Date(payload.purchaseDate) : undefined,
            signedTransactionInfo: verified.signedTransactionInfo,
          },
        });
        const account = await tx.virtualCoinAccount.upsert({
          where: { userId },
          create: {
            userId,
            balance: product.amountCoin,
            totalRecharged: product.amountCoin,
          },
          update: {
            balance: { increment: product.amountCoin },
            totalRecharged: { increment: product.amountCoin },
          },
        });
        await tx.virtualCoinRecharge.create({
          data: {
            userId,
            amountRmb: new Prisma.Decimal(actualRmb),
            amountCoin: product.amountCoin,
            payMethod: "APPLE_IAP",
            orderNo: `APPLE_IAP_${transactionId}`,
            status: "PAID",
            paidAt: payload.purchaseDate ? new Date(payload.purchaseDate) : new Date(),
          },
        });
        await tx.virtualCoinTransaction.create({
          data: {
            userId,
            type: "RECHARGE",
            amountCoin: product.amountCoin,
            balanceAfter: account.balance,
            scene: "RECHARGE",
            refId: transactionId,
            description: `Apple 应用内购买 ${productId}`,
          },
        });
        return created;
      });
      return {
        success: true,
        duplicate: false,
        transactionId: purchase.transactionId,
        productId: purchase.productId,
        amountCoin: purchase.amountCoin,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const duplicate = await this.prisma.appleIapPurchase.findUnique({ where: { transactionId } });
        if (duplicate) return this.duplicateResult(duplicate, userId);
      }
      throw error;
    }
  }

  private async verifyNotification(signedPayload: string): Promise<{
    environment: Environment;
    payload: ResponseBodyV2DecodedPayload;
  }> {
    let lastError: unknown;
    for (const environment of this.configuredEnvironments()) {
      try {
        const payload = await this.createVerifier(environment).verifyAndDecodeNotification(signedPayload);
        return { environment, payload };
      } catch (error) {
        lastError = error;
      }
    }
    this.logger.warn(`Apple 通知验签失败: ${lastError instanceof Error ? lastError.name : "UnknownError"}`);
    throw new BadRequestException("Apple 通知验签失败");
  }

  private async applyChargeback(
    tx: Prisma.TransactionClient,
    transactionId: string,
    status: "REFUNDED" | "REVOKED",
    revokedAt?: number,
    reason?: number,
  ): Promise<string> {
    const purchase = await tx.appleIapPurchase.findUnique({ where: { transactionId } });
    if (!purchase) return "PURCHASE_NOT_FOUND";
    if (purchase.status !== "VERIFIED") return "ALREADY_CHARGED_BACK";

    const account = await tx.virtualCoinAccount.update({
      where: { userId: purchase.userId },
      data: {
        balance: { decrement: purchase.amountCoin },
        totalRecharged: { decrement: purchase.amountCoin },
      },
    });
    await tx.appleIapPurchase.update({
      where: { transactionId },
      data: {
        status,
        refundedAt: revokedAt ? new Date(revokedAt) : new Date(),
        revocationReason: reason,
      },
    });
    await tx.virtualCoinRecharge.updateMany({
      where: { orderNo: `APPLE_IAP_${transactionId}` },
      data: { status: "REFUNDED" },
    });
    await tx.virtualCoinTransaction.create({
      data: {
        userId: purchase.userId,
        type: "CHARGEBACK",
        amountCoin: -purchase.amountCoin,
        balanceAfter: account.balance,
        scene: "APPLE_IAP_CHARGEBACK",
        refId: transactionId,
        description: status === "REFUNDED" ? "Apple 内购退款冲正" : "Apple 内购撤销冲正",
      },
    });
    return status;
  }

  private async reverseChargeback(tx: Prisma.TransactionClient, transactionId: string): Promise<string> {
    const purchase = await tx.appleIapPurchase.findUnique({ where: { transactionId } });
    if (!purchase) return "PURCHASE_NOT_FOUND";
    if (purchase.status === "VERIFIED") return "ALREADY_VERIFIED";

    const account = await tx.virtualCoinAccount.update({
      where: { userId: purchase.userId },
      data: {
        balance: { increment: purchase.amountCoin },
        totalRecharged: { increment: purchase.amountCoin },
      },
    });
    await tx.appleIapPurchase.update({
      where: { transactionId },
      data: { status: "VERIFIED", refundedAt: null, revocationReason: null },
    });
    await tx.virtualCoinRecharge.updateMany({
      where: { orderNo: `APPLE_IAP_${transactionId}` },
      data: { status: "PAID" },
    });
    await tx.virtualCoinTransaction.create({
      data: {
        userId: purchase.userId,
        type: "RECHARGE",
        amountCoin: purchase.amountCoin,
        balanceAfter: account.balance,
        scene: "RECHARGE",
        refId: transactionId,
        description: "Apple 退款撤销，恢复内购国学币",
      },
    });
    return "REFUND_REVERSED";
  }

  async handleNotification(signedPayload: string) {
    const payloadHash = createHash("sha256").update(signedPayload, "utf8").digest("hex");
    const existing = await this.prisma.appleIapNotification.findFirst({
      where: { payloadHash },
    });
    if (existing) return { received: true, duplicate: true };

    const verified = await this.verifyNotification(signedPayload);
    const notificationType = String(verified.payload.notificationType || "UNKNOWN");
    const notificationUuid = verified.payload.notificationUUID || payloadHash;
    const signedTransaction = verified.payload.data?.signedTransactionInfo;
    const transaction = signedTransaction
      ? await this.createVerifier(verified.environment).verifyAndDecodeTransaction(signedTransaction)
      : undefined;
    const transactionId = transaction?.transactionId;

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        let processingResult = "ACKNOWLEDGED";
        if (transactionId && notificationType === "REFUND") {
          processingResult = await this.applyChargeback(
            tx,
            transactionId,
            "REFUNDED",
            transaction?.revocationDate,
            typeof transaction?.revocationReason === "number" ? transaction.revocationReason : undefined,
          );
        } else if (transactionId && notificationType === "REVOKE") {
          processingResult = await this.applyChargeback(
            tx,
            transactionId,
            "REVOKED",
            transaction?.revocationDate,
            typeof transaction?.revocationReason === "number" ? transaction.revocationReason : undefined,
          );
        } else if (transactionId && notificationType === "REFUND_REVERSED") {
          processingResult = await this.reverseChargeback(tx, transactionId);
        }

        await tx.appleIapNotification.create({
          data: {
            notificationUuid,
            notificationType,
            subtype: verified.payload.subtype ? String(verified.payload.subtype) : undefined,
            environment: verified.environment,
            transactionId,
            payloadHash,
            result: processingResult,
          },
        });
        return processingResult;
      });
      return { received: true, duplicate: false, result };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return { received: true, duplicate: true };
      }
      throw error;
    }
  }
}
