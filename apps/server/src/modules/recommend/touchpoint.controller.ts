import { createHash } from "crypto";
import { Request } from "express";
import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { OptionalAuthGuard } from "../../common/optional-auth.guard";
import { ThrottleGuard } from "../../common/throttle.guard";
import { TouchpointService } from "./touchpoint.service";

/**
 * 无痕商业化触点端点（触-P1 机制层）。
 * ⚠️ 路由注意：本控制器必须在 RecommendController 之前注册（recommend.module.ts controllers 顺序），
 * 否则 GET /recommend/touchpoint 会被其 @Get(":scene") 通配拦截。
 */
@ApiTags("智能推荐")
@Controller("recommend")
export class TouchpointController {
  constructor(private svc: TouchpointService) {}

  @Get("touchpoint")
  @UseGuards(OptionalAuthGuard, ThrottleGuard)
  @ApiOperation({ summary: "无痕商业化触点卡（服务端裁决：频控/开关/相关性硬门槛·无卡返回 show:false）" })
  @ApiQuery({ name: "scene", required: true, description: "触点场景 key（TOUCHPOINTS 枚举，如 levelup_course）" })
  @ApiQuery({ name: "ctx", required: false, description: "场景上下文 JSON 字符串（如 {\"category\":\"易学\"}）" })
  @ApiResponse({ status: 200, description: "成功（show:false 时前端不渲染）" })
  async getTouchpoint(
    @Req() req: Request,
    @Query("scene") scene?: string,
    @Query("ctx") ctx?: string,
  ) {
    if (!scene) return { show: false };
    // 频控主体：登录用 userId，匿名用 ip+UA 指纹（弱指纹够用——频控是克制手段非安全边界）
    const subject = req.user?.id ?? this.anonFingerprint(req);
    return this.svc.getTouchpoint(scene, subject, req.user?.id, this.parseCtx(ctx));
  }

  /** ctx JSON 解析：畸形输入静默忽略（触点永不因参数报错） */
  private parseCtx(ctx?: string): Record<string, unknown> | undefined {
    if (!ctx) return undefined;
    // 全局 SanitizePipe 会把查询串中的 &<>"'/ 转义为 HTML 实体（{"term":"冬至"} → {&quot;term&quot;:…}）
    // 导致 JSON.parse 恒失败、ctx 恒丢失（levelup_course 的 category / jieqi_gift 的 term 均收不到）。
    // 此处先还原实体再解析；解析后的值仅用于 Prisma 参数化查询与文案拼接，无 XSS 注入面。
    const raw = ctx
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, "/")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }

  /** 匿名指纹：ip + user-agent 哈希 */
  private anonFingerprint(req: Request): string {
    const ua = req.headers["user-agent"] || "";
    return "anon:" + createHash("sha1").update(`${req.ip}|${ua}`).digest("hex").slice(0, 16);
  }
}
