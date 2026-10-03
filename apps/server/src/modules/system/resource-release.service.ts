import { BadRequestException, Injectable } from "@nestjs/common";
import { createPublicKey, verify } from "crypto";
import { Prisma } from "@prisma/client";
import {
  ResourceManifest,
  SignedResourceManifest,
  canonicalManifest,
  assertResourceManifest,
} from "@guoxue/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { DistributionService } from "./distribution.service";
import { distributionKey, inRollout } from "./distribution.util";
import { WgtControlService } from "./wgt-control.service";

@Injectable()
export class ResourceReleaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly distributions: DistributionService,
    private readonly control: WgtControlService,
  ) {}

  async verifyManifest(value: SignedResourceManifest, db?: Prisma.TransactionClient) {
    try {
      assertResourceManifest(value.manifest);
      const key = await this.control.trustedKey(value.manifest.keyId, value.manifest.applicationId, db);
      if (!key || !/^[A-Za-z0-9+/]{86}==$/.test(value.signature)) throw new Error("缺少可信签名");
      const publicKey = createPublicKey(key);
      if (
        publicKey.asymmetricKeyType !== "ed25519" ||
        !verify(
          null,
          Buffer.from(canonicalManifest(value.manifest)),
          publicKey,
          Buffer.from(value.signature, "base64"),
        )
      ) {
        throw new Error("资源清单签名无效");
      }
      const allowed = (process.env.WGT_ALLOWED_ORIGINS || "").split(",").filter(Boolean);
      if (!allowed.includes(new URL(value.manifest.downloadUrl).origin))
        throw new Error("资源域名未在分发白名单内");
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : "资源清单校验失败");
    }
  }

  async draft(
    dto: SignedResourceManifest & { rolloutPercentage: number; targetUserIds?: string[] },
  ) {
    await this.verifyManifest(dto);
    const m = dto.manifest;
    await this.distributions.assertRegistered(m);
    return this.prisma.resourceRelease.create({
      data: {
        id: m.releaseId,
        applicationId: m.applicationId,
        platform: m.platform,
        channelId: m.channelId,
        resourceVersion: m.resourceVersion,
        manifest: m as unknown as Prisma.InputJsonValue,
        signature: dto.signature,
        keyId: m.keyId,
        rolloutPercentage: dto.rolloutPercentage,
        targetUserIds: dto.targetUserIds || [],
      },
    });
  }
  list() {
    return this.prisma.resourceRelease.findMany({ orderBy: { createdAt: "desc" } });
  }

  async activate(id: string, userId: string, rollback = false) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        "SELECT pg_advisory_xact_lock(hashtext($1))",
        "resource-record:" + id,
      );
      const target = await tx.resourceRelease.findUnique({ where: { id } });
      if (!target || target.status !== (rollback ? "RETIRED" : "DRAFT"))
        throw new BadRequestException("资源版本状态不允许发布或回退");
      const manifest = target.manifest as unknown as ResourceManifest;
      await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", "wgt:key:" + manifest.keyId);
      await this.verifyManifest({ manifest, signature: target.signature }, tx);
      const scopeKey = distributionKey(target);
      await tx.$executeRawUnsafe(
        "SELECT pg_advisory_xact_lock(hashtext($1))",
        "resource-scope:" + scopeKey,
      );
      const registry = await tx.appDistribution.findUnique({
        where: {
          applicationId_platform_channelId: {
            applicationId: target.applicationId,
            platform: target.platform,
            channelId: target.channelId,
          },
        },
      });
      if (
        !registry?.enabled ||
        registry.wgtPolicy !== "ALLOWED" ||
        !registry.policyEvidence ||
        !registry.recoveryEvidence ||
        registry.nativeFingerprint !== manifest.nativeFingerprint ||
        registry.packageName !== manifest.packageName ||
        registry.productId !== manifest.productId
      )
        throw new BadRequestException("渠道许可、应用身份或原生恢复证据未通过，禁止发布 WGT");
      const proof = await this.control.assertReady(registry, tx);
      if (proof.runtimeAppId !== manifest.runtimeAppId || proof.nativeFingerprint !== manifest.nativeFingerprint || Number(proof.nativeBuild) < manifest.minNativeBuild || Number(proof.nativeBuild) > manifest.maxNativeBuild) throw new BadRequestException("清单与已验完整包基线不匹配");
      const current = await tx.resourceRelease.findFirst({
        where: {
          applicationId: target.applicationId,
          platform: target.platform,
          channelId: target.channelId,
          status: "ACTIVE",
        },
      });
      if (!rollback && current && target.resourceVersion <= current.resourceVersion)
        throw new BadRequestException("资源版本必须递增");
      if (current)
        await tx.resourceRelease.update({
          where: { id: current.id },
          data: { status: "RETIRED", activeScopeKey: null, retiredAt: new Date() },
        });
      return tx.resourceRelease.update({
        where: { id },
        data: {
          status: "ACTIVE",
          activeScopeKey: scopeKey,
          publishedAt: new Date(),
          publishedBy: userId,
          retiredAt: null,
        },
      });
    });
  }

  async retire(id: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        "SELECT pg_advisory_xact_lock(hashtext($1))",
        "resource-record:" + id,
      );
      const target = await tx.resourceRelease.findUnique({ where: { id } });
      if (!target || target.status !== "ACTIVE")
        throw new BadRequestException("只有已生效资源可以停发");
      await tx.$executeRawUnsafe(
        "SELECT pg_advisory_xact_lock(hashtext($1))",
        "resource-scope:" + distributionKey(target),
      );
      return tx.resourceRelease.update({
        where: { id },
        data: { status: "RETIRED", activeScopeKey: null, retiredAt: new Date() },
      });
    });
  }

  async check(clientKey: string, nativeBuild: number, resourceVersion: number, userId?: string) {
    const distribution = await this.distributions.resolve(clientKey);
    if (
      !distribution ||
      distribution.wgtPolicy !== "ALLOWED" ||
      !distribution.policyEvidence ||
      !distribution.recoveryEvidence
    )
      return null;
    const target = await this.prisma.resourceRelease.findFirst({
      where: {
        applicationId: distribution.applicationId,
        platform: distribution.platform,
        channelId: distribution.channelId,
        status: "ACTIVE",
      },
    });
    if (
      !target ||
      target.resourceVersion <= resourceVersion ||
      !inRollout("resource:" + target.id, userId, target.rolloutPercentage, target.targetUserIds)
    )
      return null;
    const manifest = target.manifest as unknown as ResourceManifest;
    try {
      const proof = await this.control.assertReady(distribution);
      if (proof.runtimeAppId !== manifest.runtimeAppId || proof.nativeFingerprint !== manifest.nativeFingerprint || Number(proof.nativeBuild) < manifest.minNativeBuild || Number(proof.nativeBuild) > manifest.maxNativeBuild) return null;
      await this.verifyManifest({ manifest, signature: target.signature });
    } catch {
      return null;
    }
    if (
      nativeBuild < manifest.minNativeBuild ||
      nativeBuild > manifest.maxNativeBuild ||
      distribution.productId !== manifest.productId ||
      distribution.packageName !== manifest.packageName ||
      distribution.nativeFingerprint !== manifest.nativeFingerprint
    )
      return null;
    return { manifest, signature: target.signature };
  }
}
