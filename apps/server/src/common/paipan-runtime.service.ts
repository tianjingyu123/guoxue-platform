import { CanActivate, ExecutionContext, Injectable, NotFoundException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

export type PaipanMode = "legacy" | "native";

@Injectable()
export class PaipanRuntimeService {
  getMode(): PaipanMode {
    const configured = String(process.env.PAIPAN_MODE || "")
      .trim()
      .toLowerCase();
    if (configured === "legacy" || configured === "native") return configured;
    // 兼容旧变量；全新环境缺省必须安全地使用旧排盘。
    if (
      String(process.env.PAIPAN_LEGACY_MODE || "")
        .trim()
        .toLowerCase() === "false"
    ) {
      return "native";
    }
    return "legacy";
  }

  isNative(): boolean {
    return this.getMode() === "native";
  }

  isQaRequestAllowed(host: string, user?: { id?: string; roles?: string[] }): boolean {
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
 * 自研排盘总门禁：native 模式公开按原逻辑工作；legacy 模式只有预发布 QA 白名单可访问。
 * 所有拒绝统一伪装成 404，避免泄露测试入口和能力边界。
 */
@Injectable()
export class NativePaipanGuard extends AuthGuard("jwt") implements CanActivate {
  constructor(private readonly runtime: PaipanRuntimeService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.runtime.isNative()) return true;
    const request = context.switchToHttp().getRequest();
    try {
      const authenticated = await super.canActivate(context);
      if (!authenticated) throw new Error("not authenticated");
    } catch {
      throw new NotFoundException("页面不存在");
    }
    if (!this.runtime.isQaRequestAllowed(request.hostname || request.headers?.host, request.user)) {
      throw new NotFoundException("页面不存在");
    }
    return true;
  }
}

/** QA 探针始终要求登录、预发布域名和白名单；失败只返回 404。 */
@Injectable()
export class NativePaipanQaGuard extends AuthGuard("jwt") implements CanActivate {
  constructor(private readonly runtime: PaipanRuntimeService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    try {
      const authenticated = await super.canActivate(context);
      if (!authenticated) throw new Error("not authenticated");
    } catch {
      throw new NotFoundException("页面不存在");
    }
    if (!this.runtime.isQaRequestAllowed(request.hostname || request.headers?.host, request.user)) {
      throw new NotFoundException("页面不存在");
    }
    return true;
  }
}
