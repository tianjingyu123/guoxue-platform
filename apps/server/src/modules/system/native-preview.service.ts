import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { createHash } from "crypto";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { NATIVE_PAIPAN_PREVIEW_KEY } from "../../common/paipan-runtime.service";
import { PAIPAN_SUITE_MODE_KEY, normalizePaipanSuiteMode, PaipanSuiteMode } from "../../common/paipan-suite-policy";

@Injectable()
export class NativePreviewService {
  constructor(private readonly prisma: PrismaService) {}

  private async authorize(tx: Prisma.TransactionClient, userId: string) {
    // 锁定当前身份及未绑定业务范围的超级管理员角色，防止撤权与保存交错。
    const users = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "User" WHERE id=${userId} AND status='ACTIVE'
      AND "deletedAt" IS NULL FOR SHARE`;
    if (!users.length) throw new NotFoundException("页面不存在");
    const roles = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "UserRole" WHERE "userId"=${userId}
      AND "roleType"='SUPER_ADMIN' AND "bindId" IS NULL FOR SHARE`;
    if (!roles.length) throw new NotFoundException("页面不存在");
  }

  private async snapshot(tx: Prisma.TransactionClient) {
    const row = await tx.configSystem.findUnique({ where: { configKey: NATIVE_PAIPAN_PREVIEW_KEY } });
    const modeRow = await tx.configSystem.findUnique({ where: { configKey: PAIPAN_SUITE_MODE_KEY } });
    const last = await tx.configVersion.findFirst({
      where: { configKey: NATIVE_PAIPAN_PREVIEW_KEY }, orderBy: { version: "desc" },
    });
    const version = last?.version ?? 0;
    const revision = createHash("sha256").update(JSON.stringify([
      row?.id ?? null, row?.configValue ?? null, row?.updatedAt.toISOString() ?? null, version,
      modeRow?.id ?? null, modeRow?.configValue ?? null, modeRow?.updatedAt.toISOString() ?? null,
    ])).digest("hex");
    return { enabled: row?.configValue === "true", mode: normalizePaipanSuiteMode(modeRow?.configValue ?? process.env.PAIPAN_MODE), revision, version };
  }

  async get(userId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.authorize(tx, userId);
      const { enabled, mode, revision } = await this.snapshot(tx);
      return { enabled, mode, revision };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async set(userId: string, enabled: boolean, expectedRevision: string, mode?: PaipanSuiteMode) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.authorize(tx, userId);
        // 专用入口串行化；不通过通用配置服务，避免权限与历史旁路。
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${NATIVE_PAIPAN_PREVIEW_KEY}))`;
        const before = await this.snapshot(tx);
        if (before.revision !== expectedRevision) {
          throw new ConflictException("设置已变化，请重新加载后确认");
        }
        await tx.configSystem.upsert({
          where: { configKey: NATIVE_PAIPAN_PREVIEW_KEY },
          create: { configKey: NATIVE_PAIPAN_PREVIEW_KEY, configValue: String(enabled), updatedBy: userId },
          update: { configValue: String(enabled), updatedBy: userId },
        });
        const nextMode = mode ?? before.mode;
        await tx.configSystem.upsert({
          where: { configKey: PAIPAN_SUITE_MODE_KEY },
          create: { configKey: PAIPAN_SUITE_MODE_KEY, configValue: nextMode, updatedBy: userId },
          update: { configValue: nextMode, updatedBy: userId },
        });
        // 私有审计与开关同事务；任何台账失败都不允许开关单独生效。
        await tx.configVersion.create({ data: {
          configKey: NATIVE_PAIPAN_PREVIEW_KEY, value: { enabled, previousEnabled: before.enabled, mode: nextMode, previousMode: before.mode },
          version: before.version + 1, changedBy: userId, comment: "整套排盘模式与开发预览设置",
        } });
        const { revision } = await this.snapshot(tx);
        return { enabled, mode: nextMode, revision };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if ((error as { code?: string }).code === "P2034") {
        throw new ConflictException("设置发生并发变化，请重新加载后确认");
      }
      throw error;
    }
  }
}
