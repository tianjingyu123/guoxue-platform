import { CanActivate, ExecutionContext, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { PrismaService } from "../prisma/prisma.service";
import { normalizePaipanSuiteMode, PAIPAN_SUITE_MODE_KEY } from "./paipan-suite-policy";

export const NATIVE_PAIPAN_PREVIEW_KEY = "paipan.native-preview.enabled";

function markPrivatePreviewResponse(context: ExecutionContext): void {
  const response = context.switchToHttp().getResponse?.();
  response?.setHeader?.("Cache-Control", "private, no-store");
  response?.setHeader?.("X-Robots-Tag", "noindex, nofollow, noarchive");
}

/** 单条主库查询核对开关与未绑定业务范围的当前超级管理员，不缓存预览权限。 */
export async function currentNativePreviewAllowed(prisma: PrismaService, userId?: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const rows = await prisma.$queryRaw<Array<{ allowed: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM "User" u
        JOIN "UserRole" r ON r."userId" = u.id
        JOIN "ConfigSystem" c ON c."configKey" = ${NATIVE_PAIPAN_PREVIEW_KEY}
        WHERE u.id = ${userId} AND u.status = 'ACTIVE' AND u."deletedAt" IS NULL
          AND r."roleType" = 'SUPER_ADMIN' AND r."bindId" IS NULL
          AND c."configValue" = 'true'
      ) AS allowed`;
    return rows[0]?.allowed === true;
  } catch { return false; }
}

export type PaipanMode = "legacy" | "native";

/** 单条主库语句决定整套权限；正式自研与管理员预览共享账号有效性检查。 */
export async function currentNativeSuiteAllowed(prisma: PrismaService, userId: string | undefined, previewEnvironmentAllowed: boolean): Promise<boolean> {
  if (!userId) return false;
  try {
    const fallback = normalizePaipanSuiteMode(process.env.PAIPAN_MODE);
    const rows = await prisma.$queryRaw<Array<{ allowed: boolean }>>`
      WITH mode AS (SELECT COALESCE(
        (SELECT "configValue" FROM "ConfigSystem" WHERE "configKey"=${PAIPAN_SUITE_MODE_KEY}), ${fallback}
      ) AS value)
      SELECT EXISTS (
        SELECT 1 FROM "User" u CROSS JOIN mode
        WHERE u.id=${userId} AND u.status='ACTIVE' AND u."deletedAt" IS NULL
          AND (mode.value='native' OR (mode.value='legacy' AND ${previewEnvironmentAllowed} AND EXISTS (
            SELECT 1 FROM "UserRole" r JOIN "ConfigSystem" c ON c."configKey"=${NATIVE_PAIPAN_PREVIEW_KEY}
            WHERE r."userId"=u.id AND r."roleType"='SUPER_ADMIN' AND r."bindId" IS NULL AND c."configValue"='true'
          )))
      ) AS allowed`;
    return rows[0]?.allowed === true;
  } catch { return false; }
}

@Injectable()
export class PaipanRuntimeService {
  getMode(): PaipanMode {
    // 未显式配置时按正式业务口径失败关闭为 legacy。旧变量
    // PAIPAN_LEGACY_MODE 不再具备开放 native 的能力；新排盘必须显式配置
    // PAIPAN_MODE 仅在数据库尚无整套设置时作为兼容默认值。
    return normalizePaipanSuiteMode(process.env.PAIPAN_MODE);
  }

  isNative(): boolean {
    return this.getMode() === "native";
  }

  async getCurrentMode(prisma: PrismaService): Promise<PaipanMode> {
    try {
      const row = await prisma.configSystem.findUnique({ where: { configKey: PAIPAN_SUITE_MODE_KEY }, select: { configValue: true } });
      if (!row) return this.getMode();
      if (row.configValue === "legacy" || row.configValue === "native") return row.configValue;
    } catch { /* 未核实配置时不使用进程旧值继续路由 */ }
    throw new ServiceUnavailableException("排盘服务状态暂时无法确认，请稍后重试");
  }

  isQaRequestAllowed(host: string, user?: { id?: string; roles?: string[] }): boolean {
    // 开发预览仅限超级管理员；旧账号/员工白名单不能提升为预览权限。
    if (!Array.isArray(user?.roles) || !user.roles.includes("SUPER_ADMIN")) return false;
    if (String(process.env.PAIPAN_NATIVE_QA_ENABLED || "").toLowerCase() !== "true") return false;

    const expectedHost = String(process.env.PAIPAN_NATIVE_QA_HOST || "pre-api.rebugx.cn")
      .trim()
      .toLowerCase();
    const requestHost = String(host || "")
      .split(":")[0]
      .trim()
      .toLowerCase();
    let configuredApiHost = "";
    try {
      configuredApiHost = new URL(String(process.env.PUBLIC_API_URL || "")).hostname.toLowerCase();
    } catch {
      return false;
    }
    if (!expectedHost || requestHost !== expectedHost || configuredApiHost !== expectedHost)
      return false;

    const allowlist = String(process.env.PAIPAN_NATIVE_QA_ALLOWLIST || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (!user || allowlist.length === 0) return false;
    const roles = Array.isArray(user.roles) ? user.roles : [];
    return allowlist.some((item) => {
      if (item.startsWith("user:")) return user.id === item.slice(5);
      if (item.startsWith("role:")) return roles.includes(item.slice(5));
      return user.id === item || roles.includes(item);
    });
  }
}

/**
 * 整套自研总门禁：正式模式要求有效登录账号，第三方模式只允许受控管理员预览。
 * 所有拒绝统一伪装成 404，避免泄露测试入口和能力边界。
 */
@Injectable()
export class NativePaipanGuard extends AuthGuard("jwt") implements CanActivate {
  constructor(private readonly runtime: PaipanRuntimeService, private readonly prisma: PrismaService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    markPrivatePreviewResponse(context);
    const request = context.switchToHttp().getRequest();
    try {
      const authenticated = await super.canActivate(context);
      if (!authenticated) throw new Error("not authenticated");
    } catch {
      throw new NotFoundException("页面不存在");
    }
    if (!await currentNativeSuiteAllowed(this.prisma, request.user?.id,
        this.runtime.isQaRequestAllowed(request.hostname || request.headers?.host, request.user))) {
      throw new NotFoundException("页面不存在");
    }
    return true;
  }
}

/** QA 探针始终要求登录、预发布域名和白名单；失败只返回 404。 */
@Injectable()
export class NativePaipanQaGuard extends AuthGuard("jwt") implements CanActivate {
  constructor(private readonly runtime: PaipanRuntimeService, private readonly prisma: PrismaService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    markPrivatePreviewResponse(context);
    const request = context.switchToHttp().getRequest();
    try {
      const authenticated = await super.canActivate(context);
      if (!authenticated) throw new Error("not authenticated");
    } catch {
      throw new NotFoundException("页面不存在");
    }
    if (!this.runtime.isQaRequestAllowed(request.hostname || request.headers?.host, request.user) ||
        !await currentNativePreviewAllowed(this.prisma, request.user?.id)) {
      throw new NotFoundException("页面不存在");
    }
    return true;
  }
}
