import { BadRequestException, Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import {
  APP_CHANNELS,
  CLIENT_CAPABILITY_PROFILES,
  ClientPresentation,
  parseClientPresentation,
  PRESENTATION_CAPABILITY,
} from "@guoxue/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { DistributionScope, distributionKey, inRollout } from "../system/distribution.util";
const KEY = "client_presentation:v1";
interface Rule extends DistributionScope {
  id: string;
  priority: number;
  percentage: number;
  minNativeBuild: string;
  maxNativeBuild: string;
  minResourceVersion: string;
  maxResourceVersion: string;
  config: ClientPresentation;
}
interface Payload {
  schemaVersion: 1;
  rules: Rule[];
}
interface Capability extends DistributionScope {
  nativeBuild: string;
  minResourceVersion: string;
  maxResourceVersion: string;
  profileId: keyof typeof CLIENT_CAPABILITY_PROFILES;
  sourceSha: string;
  installedPackageSha256: string;
  verificationLevel: "formal-package" | "synthetic";
}
const CAP = "client_capability:";
@Injectable()
export class ClientPresentationService {
  constructor(private readonly prisma: PrismaService) {}
  private fail(message: string): never {
    throw new BadRequestException(message);
  }
  private parse(value: unknown): Payload {
    try {
      const raw = value as Payload;
      if (
        !raw ||
        Object.keys(raw).some((key) => !["schemaVersion", "rules"].includes(key)) ||
        raw.schemaVersion !== 1 ||
        !Array.isArray(raw.rules) ||
        raw.rules.length > 50 ||
        JSON.stringify(raw).length > 64000
      )
        this.fail("声明式规则格式或大小非法");
      const ids = new Set<string>();
      const rules = raw.rules.map((rule) => {
        if (
          !rule ||
          Object.keys(rule).some(
            (key) =>
              ![
                "id",
                "priority",
                "percentage",
                "applicationId",
                "platform",
                "channelId",
                "minNativeBuild",
                "maxNativeBuild",
                "minResourceVersion",
                "maxResourceVersion",
                "config",
              ].includes(key),
          ) ||
          !/^[a-z][a-z0-9-]{1,47}$/.test(rule.applicationId) ||
          !APP_CHANNELS.some(
            (channel) =>
              channel.id === rule.channelId &&
              (channel.platforms as readonly string[]).includes(rule.platform),
          )
        )
          this.fail("应用/渠道/平台非法");
        if (
          !/^\d{1,15}$/.test(rule.minNativeBuild) ||
          !/^\d{1,15}$/.test(rule.maxNativeBuild) ||
          BigInt(rule.minNativeBuild) > BigInt(rule.maxNativeBuild)
        )
          this.fail("必须指定有效原生版本范围");
        this.range(rule.minResourceVersion, rule.maxResourceVersion);
        if (
          !/^[a-z][a-z0-9-]{1,47}$/.test(rule.id) ||
          ids.has(rule.id) ||
          !Number.isInteger(rule.priority) ||
          rule.priority < 0 ||
          rule.priority > 100 ||
          !Number.isInteger(rule.percentage) ||
          rule.percentage < 0 ||
          rule.percentage > 100
        )
          this.fail("规则标识、优先级或灰度非法");
        ids.add(rule.id);
        return { ...rule, config: parseClientPresentation(rule.config) };
      });
      return { schemaVersion: 1, rules };
    } catch (error) {
      this.fail(error instanceof Error ? error.message : "声明式配置非法");
    }
  }
  private async latest(tx = this.prisma) {
    return tx.configVersion.findFirst({ where: { configKey: KEY }, orderBy: { version: "desc" } });
  }
  private async registered(payload: Payload, tx = this.prisma) {
    for (const rule of payload.rules)
      if (
        !(await tx.appDistribution.findFirst({
          where: {
            applicationId: rule.applicationId,
            platform: rule.platform,
            channelId: rule.channelId,
            enabled: true,
          },
        }))
      )
        this.fail("配置渠道未登记或已停用");
  }
  private range(a: string, b: string) {
    if (!/^\d{1,15}$/.test(a) || !/^\d{1,15}$/.test(b) || BigInt(a) > BigInt(b))
      this.fail("必须指定有效版本范围");
  }
  private async select(
    payload: Payload,
    scope: DistributionScope | null | undefined,
    build: string,
    capabilities: string,
    resource = "0",
    userId?: string,
  ) {
    const reasons: string[] = [];
    if (
      !scope ||
      !/^\d{1,15}$/.test(build) ||
      !/^\d{1,15}$/.test(resource) ||
      !capabilities.split(",").includes(PRESENTATION_CAPABILITY)
    )
      return {
        config: null,
        ruleId: null,
        reasons: ["客户端未报告声明式协议、身份未登记或版本不完整"],
      };
    const rows = await this.prisma.configVersion.findMany({
      where: { configKey: { startsWith: CAP + distributionKey(scope) + ":" + build + ":" } },
      orderBy: { createdAt: "desc" },
    });
    const registered = rows
      .map((row) => row.value as unknown as Capability)
      .find(
        (row) =>
          BigInt(resource) >= BigInt(row.minResourceVersion) &&
          BigInt(resource) <= BigInt(row.maxResourceVersion),
      );
    if (!registered || registered.profileId === "legacy-v1")
      return {
        config: null,
        ruleId: null,
        reasons: ["完整包能力未登记或旧包缺少声明式消费能力；保留默认与历史服务"],
        profileId: registered?.profileId ?? null,
      };
    const matching = payload.rules.filter(
      (rule) =>
        rule.applicationId === scope.applicationId &&
        rule.platform === scope.platform &&
        rule.channelId === scope.channelId &&
        BigInt(build) >= BigInt(rule.minNativeBuild) &&
        BigInt(build) <= BigInt(rule.maxNativeBuild) &&
        BigInt(resource) >= BigInt(rule.minResourceVersion) &&
        BigInt(resource) <= BigInt(rule.maxResourceVersion),
    );
    // 重叠按优先级降序、原生范围较窄、资源范围较窄、规则 ID 字典序决定。
    matching.sort(
      (a, b) =>
        b.priority - a.priority ||
        Number(
          BigInt(a.maxNativeBuild) -
            BigInt(a.minNativeBuild) -
            BigInt(b.maxNativeBuild) +
            BigInt(b.minNativeBuild),
        ) ||
        Number(
          BigInt(a.maxResourceVersion) -
            BigInt(a.minResourceVersion) -
            BigInt(b.maxResourceVersion) +
            BigInt(b.minResourceVersion),
        ) ||
        a.id.localeCompare(b.id),
    );
    const chosen = matching.find((rule) => {
      const accepted = inRollout(KEY + ":" + rule.id, userId, rule.percentage);
      if (!accepted) reasons.push(rule.id + "：账号未进入灰度");
      return accepted;
    });
    if (!chosen)
      return {
        config: null,
        ruleId: null,
        reasons: [...reasons, "无匹配规则，保留默认"],
        profileId: registered.profileId,
      };
    const profile = CLIENT_CAPABILITY_PROFILES[registered.profileId],
      config = JSON.parse(JSON.stringify(chosen.config)) as ClientPresentation;
    for (const surface of Object.keys(config.pages)) {
      if (!(profile.surfaces as readonly string[]).includes(surface)) {
        delete config.pages[surface as keyof typeof config.pages];
        reasons.push(surface + "：包内无页面，已省略");
        continue;
      }
      config.pages[surface as keyof typeof config.pages] = config.pages[
        surface as keyof typeof config.pages
      ]!.filter((block) => {
        const supported = (profile.components as readonly string[]).includes(block.type);
        if (!supported) reasons.push(block.id + "：包内无组件，已省略");
        return supported;
      });
    }
    return {
      config,
      ruleId: chosen.id,
      profileId: registered.profileId,
      reasons,
      matchingRuleIds: matching.map((rule) => rule.id),
      priority: chosen.priority,
    };
  }
  async client(
    scope: DistributionScope | null | undefined,
    build: string,
    capabilities: string,
    resource = "0",
    userId?: string,
  ) {
    const current = await this.latest();
    return current
      ? {
          ...(await this.select(
            this.parse(current.value),
            scope,
            build,
            capabilities,
            resource,
            userId,
          )),
          version: current.version,
        }
      : { config: null, ruleId: null, reasons: ["尚无已发布配置"] };
  }
  async saveDraft(value: unknown, reason: string, actor: string) {
    const payload = this.parse(value);
    await this.registered(payload);
    const current = await this.latest();
    return this.prisma.configVersion.create({
      data: {
        configKey: KEY + ":draft:" + randomUUID(),
        version: 1,
        value: {
          state: "DRAFT",
          baseVersion: current?.version ?? 0,
          payload,
        } as unknown as Prisma.InputJsonValue,
        changedBy: actor,
        comment: reason,
      },
    });
  }
  async preview(
    id: string,
    scope: DistributionScope | null | undefined,
    build: string,
    resource = "0",
    userId?: string,
  ) {
    const draft = await this.prisma.configVersion.findUnique({ where: { id } });
    if (!draft?.configKey.startsWith(KEY + ":draft:")) this.fail("草稿不存在");
    const record = draft.value as any;
    return {
      draftId: id,
      baseVersion: record.baseVersion,
      ...(await this.select(
        this.parse(record.payload),
        scope,
        build,
        PRESENTATION_CAPABILITY,
        resource,
        userId,
      )),
      operationsUnchanged: true,
    };
  }
  private async lock(tx: any) {
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", KEY);
  }
  async publish(id: string, actor: string, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.lock(tx);
      const draft = await tx.configVersion.findUnique({ where: { id } });
      if (!draft?.configKey.startsWith(KEY + ":draft:")) this.fail("草稿不存在");
      const record = draft.value as any,
        current = await this.latest(tx as any);
      if (record.state !== "DRAFT" || record.baseVersion !== (current?.version ?? 0))
        this.fail("草稿已发布或基于旧版本，请重新保存预览");
      const payload = this.parse(record.payload);
      await this.registered(payload, tx as any);
      const published = await tx.configVersion.create({
        data: {
          configKey: KEY,
          version: (current?.version ?? 0) + 1,
          value: payload as unknown as Prisma.InputJsonValue,
          changedBy: actor,
          comment: reason,
        },
      });
      await tx.configVersion.update({
        where: { id },
        data: {
          value: {
            ...record,
            state: "PUBLISHED",
            publishedVersion: published.version,
          } as Prisma.InputJsonValue,
        },
      });
      return published;
    });
  }
  async rollback(version: number, actor: string, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.lock(tx);
      const previous = await tx.configVersion.findFirst({ where: { configKey: KEY, version } });
      if (!previous) this.fail("历史版本不存在");
      const payload = this.parse(previous.value);
      await this.registered(payload, tx as any);
      const current = await this.latest(tx as any);
      return tx.configVersion.create({
        data: {
          configKey: KEY,
          version: (current?.version ?? 0) + 1,
          value: payload as unknown as Prisma.InputJsonValue,
          changedBy: actor,
          comment: reason + "；回退到版本 " + version,
        },
      });
    });
  }
  history() {
    return this.prisma.configVersion.findMany({
      where: { configKey: KEY },
      orderBy: { version: "desc" },
      take: 50,
    });
  }
  capabilityHistory() {
    return this.prisma.configVersion.findMany({
      where: { configKey: { startsWith: CAP } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }
  /** 管理员根据核验后的完整包清单登记；不以客户端自报作为真实安装证明。 */
  async registerCapabilities(raw: Record<string, unknown>, actor: string, reason: string) {
    const record = { ...raw } as unknown as Capability;
    if (
      Object.keys(raw).some(
        (key) =>
          ![
            "applicationId",
            "platform",
            "channelId",
            "nativeBuild",
            "minResourceVersion",
            "maxResourceVersion",
            "profileId",
            "sourceSha",
            "installedPackageSha256",
            "verificationLevel",
          ].includes(key),
      )
    )
      this.fail("能力登记含未知字段");
    if (
      !/^[a-z][a-z0-9-]{1,47}$/.test(record.applicationId) ||
      !APP_CHANNELS.some(
        (channel) =>
          channel.id === record.channelId &&
          (channel.platforms as readonly string[]).includes(record.platform),
      )
    )
      this.fail("应用/渠道/平台非法");
    if (
      typeof record.nativeBuild !== "string" ||
      typeof record.minResourceVersion !== "string" ||
      typeof record.maxResourceVersion !== "string"
    )
      this.fail("能力登记版本必须是整数字符串");
    this.range(record.nativeBuild, record.nativeBuild);
    this.range(record.minResourceVersion, record.maxResourceVersion);
    // 规范化后再生成锁与登记前缀，防止同一构建因前导零形成不同冲突范围。
    record.nativeBuild = BigInt(record.nativeBuild).toString();
    record.minResourceVersion = BigInt(record.minResourceVersion).toString();
    record.maxResourceVersion = BigInt(record.maxResourceVersion).toString();
    if (
      !Object.hasOwn(CLIENT_CAPABILITY_PROFILES, record.profileId) ||
      !/^[a-f0-9]{40}$/.test(record.sourceSha) ||
      !/^[a-f0-9]{64}$/.test(record.installedPackageSha256) ||
      !["formal-package", "synthetic"].includes(record.verificationLevel)
    )
      this.fail("能力声明、源码或完整包摘要非法");
    if (
      record.verificationLevel === "synthetic" &&
      (process.env.NODE_ENV !== "test" || process.env.CLIENT_CAPABILITY_ENVIRONMENT !== "test")
    )
      this.fail("合成能力记录仅允许独立测试环境");
    if (
      !(await this.prisma.appDistribution.findFirst({
        where: {
          applicationId: record.applicationId,
          platform: record.platform,
          channelId: record.channelId,
          enabled: true,
        },
      }))
    )
      this.fail("渠道未登记");
    const scopePrefix = CAP + distributionKey(record) + ":";
    const prefix = scopePrefix + record.nativeBuild + ":";
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", prefix);
      const existing = await tx.configVersion.findMany({
        where: { configKey: { startsWith: scopePrefix } },
      });
      if (
        existing.some((row) => {
          const other = row.value as unknown as Capability;
          // 历史记录可能在规范化前登记；兼容旧字符串及当时可写入的整数值，不覆盖旧记录。
          const storedVersion = (value: unknown) => {
            if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0)
              value = String(value);
            if (typeof value !== "string" || !/^\d{1,15}$/.test(value))
              this.fail("既有能力记录版本无效，请核查历史登记");
            return BigInt(value as string);
          };
          if (storedVersion(other.nativeBuild) !== BigInt(record.nativeBuild)) return false;
          return (
            BigInt(record.minResourceVersion) <= storedVersion(other.maxResourceVersion) &&
            storedVersion(other.minResourceVersion) <= BigInt(record.maxResourceVersion)
          );
        })
      )
        this.fail("能力记录不可覆盖，资源版本范围不能重叠");
      return tx.configVersion.create({
        data: {
          configKey: prefix + record.minResourceVersion + "-" + record.maxResourceVersion,
          version: 1,
          value: record as unknown as Prisma.InputJsonValue,
          changedBy: actor,
          comment: reason,
        },
      });
    });
  }
}
