import { BadRequestException, Injectable } from "@nestjs/common";
import { createPublicKey, verify } from "crypto";
import { Prisma, AppDistribution } from "@prisma/client";
import {
  canonicalWgtControl,
  SignedWgtControl,
  NATIVE_RECOVERY_CASES,
  WGT_PROTOCOL_BLOCKED_CHANNELS,
} from "@guoxue/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { distributionKey } from "./distribution.util";

@Injectable()
export class WgtControlService {
  constructor(private readonly prisma: PrismaService) {}
  private publicPem(pem: unknown): string {
    if (
      typeof pem !== "string" ||
      !/^-----BEGIN PUBLIC KEY-----\r?\n[A-Za-z0-9+/=\r\n]+-----END PUBLIC KEY-----\r?\n?$/.test(
        pem,
      )
    )
      this.fail("只接受 SPKI 公钥 PEM，禁止私钥或附加内容");
    return pem;
  }
  private fail(message: string): never {
    throw new BadRequestException(message);
  }
  private verify(value: SignedWgtControl, kind: string) {
    const p = value?.payload;
    if (
      !p ||
      p.schemaVersion !== 1 ||
      p.kind !== kind ||
      typeof p.rootKeyId !== "string" ||
      canonicalWgtControl(p).length > 32000
    )
      this.fail("证据格式或类型不正确");
    const root = (
      JSON.parse(process.env.WGT_CONTROL_PUBLIC_ROOTS || "{}") as Record<string, string>
    )[p.rootKeyId as string];
    if (!root || !/^[A-Za-z0-9+/]{86}==$/.test(value.signature || ""))
      this.fail("缺少可信证据根签名");
    const key = createPublicKey(this.publicPem(root));
    if (
      key.asymmetricKeyType !== "ed25519" ||
      !verify(
        null,
        Buffer.from(canonicalWgtControl(p)),
        key,
        Buffer.from(value.signature, "base64"),
      )
    )
      this.fail("证据根签名无效");
    const issued = Date.parse(String(p.issuedAt)),
      expiry = Date.parse(String(p.expiresAt));
    if (
      !Number.isFinite(issued) ||
      !Number.isFinite(expiry) ||
      issued > Date.now() ||
      expiry <= Date.now() ||
      expiry <= issued
    )
      this.fail("授权或证据未生效/过期");
    return p;
  }
  private latest(configKey: string, db: Prisma.TransactionClient | PrismaService = this.prisma) {
    return db.configVersion.findFirst({ where: { configKey }, orderBy: { version: "desc" } });
  }
  private async append(
    configKey: string,
    value: unknown,
    actor: string,
    comment: string,
    expectedId?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", configKey);
      const latest = await this.latest(configKey, tx);
      if (expectedId && latest?.id !== expectedId) this.fail("证据已被新提交替换，请重新审核");
      return tx.configVersion.create({
        data: {
          configKey,
          version: (latest?.version || 0) + 1,
          value: value as Prisma.InputJsonValue,
          changedBy: actor,
          comment,
        },
      });
    });
  }
  async registerKey(value: SignedWgtControl, actor: string) {
    const p = this.verify(value, "resource-key");
    const expected = [
      "schemaVersion",
      "kind",
      "rootKeyId",
      "issuedAt",
      "expiresAt",
      "keyId",
      "applicationId",
      "publicKeyPem",
    ].sort();
    if (
      Object.keys(p).sort().join(",") !== expected.join(",") ||
      typeof p.keyId !== "string" ||
      typeof p.applicationId !== "string" ||
      typeof p.publicKeyPem !== "string"
    )
      this.fail("公钥授权必须为规定的扁平字段");
    if (
      !/^[a-z][a-z0-9._-]{1,79}$/.test(String(p.keyId)) ||
      !/^[a-z][a-z0-9-]{1,47}$/.test(String(p.applicationId))
    )
      this.fail("公钥身份非法");
    if (createPublicKey(this.publicPem(p.publicKeyPem)).asymmetricKeyType !== "ed25519")
      this.fail("资源公钥必须为 Ed25519");
    return this.prisma.$transaction(async (tx) => {
      const configKey = "wgt:key:" + p.keyId;
      await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", configKey);
      if (await this.latest(configKey, tx))
        this.fail("keyId 已使用；轮换需新 keyId，不能覆盖或复活旧钥");
      return tx.configVersion.create({
        data: {
          configKey,
          version: 1,
          value: { authorization: value, state: "ACTIVE" } as unknown as Prisma.InputJsonValue,
          changedBy: actor,
          comment: "登记根签名资源公钥",
        },
      });
    });
  }
  async revokeKey(keyId: string, actor: string) {
    const old = await this.latest("wgt:key:" + keyId);
    if (!old) this.fail("公钥不存在");
    const value = old.value as unknown as { authorization: SignedWgtControl };
    return this.append(
      "wgt:key:" + keyId,
      { ...value, state: "REVOKED" },
      actor,
      "撤销资源公钥，停止后续分发",
    );
  }
  async trustedKey(
    keyId: string,
    applicationId: string,
    db: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const record = await this.latest("wgt:key:" + keyId, db);
    const value = record?.value as unknown as
      | { state: string; authorization: SignedWgtControl }
      | undefined;
    if (!value || value.state !== "ACTIVE") this.fail("资源公钥未登记或已撤销");
    const p = this.verify(value.authorization, "resource-key");
    if (p.applicationId !== applicationId || p.keyId !== keyId) this.fail("资源公钥不属于此应用");
    return String(p.publicKeyPem);
  }
  async trustBundle(applicationId: string) {
    const rows = await this.prisma.configVersion.findMany({
      where: { configKey: { startsWith: "wgt:key:" } },
      orderBy: { version: "desc" },
    });
    const seen = new Set<string>(),
      keys: SignedWgtControl[] = [];
    for (const row of rows) {
      if (seen.has(row.configKey)) continue;
      seen.add(row.configKey);
      const value = row.value as unknown as { state: string; authorization: SignedWgtControl };
      try {
        const p = this.verify(value.authorization, "resource-key");
        if (value.state === "ACTIVE" && p.applicationId === applicationId)
          keys.push(value.authorization);
      } catch {
        /* 不下发失效公钥 */
      }
    }
    return { keys };
  }
  private matchIdentity(registry: AppDistribution, p: Record<string, unknown>) {
    for (const name of [
      "productId",
      "applicationId",
      "platform",
      "channelId",
      "packageName",
    ] as const)
      if (registry[name] !== p[name]) this.fail("证据与登记渠道身份不一致");
    if (
      !registry.signingCertificateSha256 ||
      registry.signingCertificateSha256.toLowerCase() !==
        String(p.signingCertificateSha256).toLowerCase()
    )
      this.fail("证据与登记安装证书不一致");
  }
  private validateEvidence(registry: AppDistribution, value: SignedWgtControl, kind: string) {
    const p = this.verify(value, kind);
    this.matchIdentity(registry, p);
    const environment = process.env.WGT_DEPLOYMENT_ENVIRONMENT || "disabled";
    const testMode = process.env.NODE_ENV === "test" && environment === "test";
    if (environment === "test" && !testMode) this.fail("正式进程不能使用 test 准入环境");
    if (
      environment === "disabled" ||
      p.environment !== environment ||
      (!testMode && p.verificationLevel !== "release-native")
    )
      this.fail("环境/实测级别不匹配，合成证据不能用于预发布或正式");
    if (
      !/^[a-f0-9]{64}$/.test(String(p.sourceSha256)) ||
      !/^[a-f0-9]{40}$/.test(String(p.sourceSha)) ||
      !/^https:\/\//.test(String(p.artifactUrl))
    )
      this.fail("缺少证据源码、摘要和 HTTPS 来源");
    if (kind === "native-recovery") {
      const cases = p.cases as Record<string, boolean> | undefined;
      if (
        !Number.isSafeInteger(p.nativeBuild) ||
        Number(p.nativeBuild) < 1 ||
        !/^[a-f0-9]{64}$/.test(String(p.nativeFingerprint)) ||
        p.beforeJavascript !== true ||
        typeof p.runtimeAppId !== "string" ||
        NATIVE_RECOVERY_CASES.some((name) => cases?.[name] !== true)
      )
        this.fail("原生启动前恢复或必验场景缺失");
      if (
        !testMode &&
        (!/^[a-f0-9]{64}$/.test(String(p.installedPackageSha256)) ||
          p.compilerVersion !== p.runtimeVersion ||
          typeof p.runtimeVersion !== "string" ||
          !/^\d+\.\d+/.test(p.runtimeVersion))
      )
        this.fail("正式匹配安装包或编译器/运行时证据缺失");
    } else if (
      p.decision !== "PERMITTED_WEB_RESOURCES" ||
      !Array.isArray(p.officialSources) ||
      !p.officialSources.length ||
      p.officialSources.some((url) => typeof url !== "string" || !url.startsWith("https://"))
    )
      this.fail("缺少具体应用允许页面资源更新的官方策略证据");
    return p;
  }
  async submitEvidence(id: string, value: SignedWgtControl, actor: string) {
    const kind = String(value?.payload?.kind);
    if (!["native-recovery", "channel-policy"].includes(kind)) this.fail("证据种类非法");
    const registry = await this.prisma.appDistribution.findUnique({ where: { id } });
    if (!registry) this.fail("渠道不存在");
    this.validateEvidence(registry, value, kind);
    return this.append(
      "wgt:evidence:" + id + ":" + kind,
      { evidence: value, status: "PENDING" },
      actor,
      "提交签名准入证据（未批准）",
    );
  }
  async approveEvidence(id: string, actor: string) {
    const record = await this.prisma.configVersion.findUnique({ where: { id } });
    if (!record || !record.configKey.startsWith("wgt:evidence:")) this.fail("准入证据不存在");
    const current = await this.latest(record.configKey);
    if (current?.id !== id) this.fail("只能批准最新证据");
    const value = record.value as unknown as { evidence: SignedWgtControl; status: string };
    if (value.status !== "PENDING") this.fail("证据不在待审核状态");
    const distributionId = record.configKey.split(":")[2];
    const registry = await this.prisma.appDistribution.findUnique({
      where: { id: distributionId },
    });
    if (!registry) this.fail("渠道不存在");
    this.validateEvidence(registry, value.evidence, String(value.evidence.payload.kind));
    return this.append(
      record.configKey,
      { ...value, status: "APPROVED", approvedBy: actor },
      actor,
      "批准签名准入证据",
      id,
    );
  }
  async assertReady(
    registry: AppDistribution,
    db: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    if (registry.platform !== "android") this.fail("当前协议仅支持 Android 页面资源");
    if (WGT_PROTOCOL_BLOCKED_CHANNELS.includes(registry.channelId))
      this.fail("当前含原生桥接的 WGT 方案按此商店条款禁用；须重新评审实现与政策");
    let native: Record<string, unknown> | undefined;
    for (const kind of ["native-recovery", "channel-policy"]) {
      const row = await this.latest("wgt:evidence:" + registry.id + ":" + kind, db);
      const value = row?.value as unknown as
        | { evidence: SignedWgtControl; status: string }
        | undefined;
      if (value?.status !== "APPROVED") this.fail("原生/渠道策略证据尚未批准");
      const p = this.validateEvidence(registry, value.evidence, kind);
      if (kind === "native-recovery") native = p;
    }
    return native!;
  }
  async setEnabled(id: string, enabled: boolean, actor: string) {
    return this.prisma.$transaction(async (tx) => {
      const registry = await tx.appDistribution.findUnique({ where: { id } });
      if (!registry) this.fail("渠道不存在");
      await tx.$executeRawUnsafe(
        "SELECT pg_advisory_xact_lock(hashtext($1))",
        "resource-scope:" + distributionKey(registry),
      );
      const proof = enabled ? await this.assertReady(registry, tx) : null;
      const configKey = "wgt:enable:" + id;
      const previous = await this.latest(configKey, tx);
      await tx.configVersion.create({
        data: {
          configKey,
          version: (previous?.version || 0) + 1,
          value: { enabled },
          changedBy: actor,
          comment: enabled ? "证据复核后启用" : "禁用并停发渠道资源",
        },
      });
      if (!enabled)
        await tx.resourceRelease.updateMany({
          where: {
            applicationId: registry.applicationId,
            platform: registry.platform,
            channelId: registry.channelId,
            status: "ACTIVE",
          },
          data: { status: "RETIRED", activeScopeKey: null, retiredAt: new Date() },
        });
      return tx.appDistribution.update({
        where: { id },
        data: {
          wgtPolicy: enabled ? "ALLOWED" : "DENIED",
          ...(proof
            ? {
                nativeFingerprint: String(proof.nativeFingerprint),
                recoveryEvidence: "signed-approved-native",
                policyEvidence: "signed-approved-policy",
              }
            : {}),
        },
      });
    });
  }
  overview() {
    return this.prisma.configVersion.findMany({
      where: { configKey: { startsWith: "wgt:" } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }
}
