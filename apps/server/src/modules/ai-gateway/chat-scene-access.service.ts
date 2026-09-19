import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PUBLIC_CHAT_SCENES, KNOWN_INTERNAL_SCENES, type ChatSceneRule } from "./chat-scene-registry";

export interface ChatSceneCaller {
  id?: string;
  roles?: readonly string[];
}

export interface ChatSceneInput {
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
}

/** 通过校验后交给网关的可选参数：**只包含调用方真正传了的键**，不含 undefined。 */
export type ResolvedChatOptions = Partial<{
  temperature: number;
  maxTokens: number;
  topP: number;
}>;

/**
 * 通用 AI 对话接口的场景准入与输入校验。
 *
 * 调用契约：控制器必须在**调用供应商之前、且在写出任何 SSE 响应头之前**调用 `authorize()`。
 * 该方法要么抛异常（此时响应仍是普通 JSON 错误），要么返回可直接透传给网关的 options。
 */
@Injectable()
export class ChatSceneAccessService {
  private readonly logger = new Logger(ChatSceneAccessService.name);

  /**
   * 场景准入 + 输入校验，一次做完。
   *
   * 拒绝顺序刻意如此：先判场景准入，再判输入规模，最后判数值参数。
   * 未授权的调用者拿不到"参数为什么不合法"的信息，避免把场景的参数边界当探测面。
   */
  authorize(scene: string, caller: ChatSceneCaller, input: ChatSceneInput): ResolvedChatOptions {
    const rule = this.resolveRule(scene, caller);
    this.assertInputSize(scene, rule, input.messages);
    return this.resolveOptions(scene, rule, input);
  }

  /** 场景是否存在于公开表，以及调用者是否有权使用 */
  private resolveRule(scene: string, caller: ChatSceneCaller): ChatSceneRule {
    const rule = Object.prototype.hasOwnProperty.call(PUBLIC_CHAT_SCENES, scene)
      ? PUBLIC_CHAT_SCENES[scene]
      : undefined;

    if (!rule) {
      // 未登记场景与"已登记但无权"返回同一个错误，避免此接口变成场景名探测器。
      // 服务端日志里区分两者，便于排查误配。
      const internal = KNOWN_INTERNAL_SCENES[scene];
      this.logger.warn(
        internal
          ? `拒绝：场景 [${scene}] 是内部场景，不经通用接口开放（${internal}）caller=${caller.id ?? "anonymous"}`
          : `拒绝：场景 [${scene}] 未登记 caller=${caller.id ?? "anonymous"}`,
      );
      throw this.denied();
    }

    if (rule.access.kind === "roles") {
      const roles = caller.roles ?? [];
      const ok = rule.access.roles.some((r) => roles.includes(r));
      if (!ok) {
        this.logger.warn(
          `拒绝：场景 [${scene}] 需要角色 ${rule.access.roles.join("/")}，caller=${caller.id ?? "anonymous"} 实际角色=${roles.join("/") || "无"}`,
        );
        throw this.denied();
      }
    }

    return rule;
  }

  /** 消息条数、单条长度、总长度 */
  private assertInputSize(scene: string, rule: ChatSceneRule, messages: ChatSceneInput["messages"]): void {
    const { maxMessages, maxContentChars, maxTotalContentChars } = rule.input;

    if (messages.length > maxMessages.max) {
      throw new BusinessException(
        ErrorCode.BAD_REQUEST,
        `消息条数超出场景 [${scene}] 上限（${messages.length} > ${maxMessages.max}）`,
      );
    }

    let total = 0;
    for (let i = 0; i < messages.length; i++) {
      const len = messages[i].content.length;
      if (len > maxContentChars.max) {
        throw new BusinessException(
          ErrorCode.BAD_REQUEST,
          `第 ${i + 1} 条消息超出场景 [${scene}] 单条长度上限（${len} > ${maxContentChars.max}）`,
        );
      }
      total += len;
    }

    if (total > maxTotalContentChars.max) {
      throw new BusinessException(
        ErrorCode.BAD_REQUEST,
        `输入总长度超出场景 [${scene}] 上限（${total} > ${maxTotalContentChars.max}）`,
      );
    }
  }

  /**
   * 数值参数校验。
   *
   * 关键：**调用方没传的参数一个键都不放进返回值**。
   * 网关的 `{ ...routeOptions, ...reqOptions }` 合并是按键覆盖的，
   * 一个值为 undefined 的键同样会把路由配置覆盖掉——这正是此前场景路由参数在这两个接口上失效的原因。
   */
  private resolveOptions(scene: string, rule: ChatSceneRule, input: ChatSceneInput): ResolvedChatOptions {
    const out: ResolvedChatOptions = {};

    if (input.temperature !== undefined) {
      this.assertRange(scene, "temperature", input.temperature, rule.params.temperature);
      out.temperature = input.temperature;
    }
    if (input.topP !== undefined) {
      this.assertRange(scene, "topP", input.topP, rule.params.topP);
      out.topP = input.topP;
    }
    if (input.maxTokens !== undefined) {
      // 整数由 DTO 的 @IsInt 保证，这里只判区间
      this.assertRange(scene, "maxTokens", input.maxTokens, rule.params.maxTokens);
      out.maxTokens = input.maxTokens;
    }

    return out;
  }

  private assertRange(
    scene: string,
    name: string,
    value: number,
    range: { min: number; max: number },
  ): void {
    if (!Number.isFinite(value) || value < range.min || value > range.max) {
      throw new BusinessException(
        ErrorCode.BAD_REQUEST,
        `参数 ${name} 超出场景 [${scene}] 允许范围 [${range.min}, ${range.max}]`,
      );
    }
  }

  /** 场景不可用：未登记与无权限共用同一个响应 */
  private denied(): BusinessException {
    return new BusinessException(ErrorCode.FORBIDDEN, "该场景不通过此接口开放，或当前账号无权使用");
  }
}
