import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { ModelRouterService, type ModelRoutingConfig } from "./model-router.service";
import {
  PUBLIC_CHAT_SCENES,
  KNOWN_INTERNAL_SCENES,
  type ChatSceneRule,
  type SceneParamRange,
} from "./chat-scene-registry";

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

/** 最终生效参数：三项全部显式给出 */
export interface EffectiveChatOptions {
  temperature: number;
  maxTokens: number;
  topP: number;
}

/** 因**路由配置**取值越界而被裁剪的项（调用方传入越界是直接拒绝，不会出现在这里） */
export interface ClampedParam {
  param: "temperature" | "topP" | "maxTokens";
  routeValue: number;
  bound: number;
  applied: number;
}

export interface ChatSceneAuthorization {
  /** 交给网关的 options。三项齐全，网关侧 { ...routeOptions, ...req.options } 无法再改写它们 */
  options: EffectiveChatOptions;
  /** 被裁剪的项，控制器据此告警。空数组表示路由配置与场景约束一致 */
  clamped: ClampedParam[];
}

/**
 * 通用 AI 对话接口（`POST /ai/chat`、`POST /ai/chat/stream`）的场景准入与输入校验。
 *
 * ## 调用契约
 * 控制器必须在**调用供应商之前、且在写出任何 SSE 响应头之前** `await authorize()`。
 * 该方法要么抛异常（此时响应仍是普通 JSON 错误，不会留下半截 SSE），
 * 要么返回**最终生效参数**。
 *
 * ## 为什么返回的是"最终生效参数"而不是"调用方传了什么"
 * 早先只校验显式传入的参数，**省略的参数会走路由默认值，而路由默认值可能超过场景上限**：
 * 例如 `nl2sql` 的场景上限是 `maxTokens ≤ 500`，而 `ai_model_routing` 的 default 是 2048，
 * 调用方只要不传 `maxTokens`，发给供应商的就是 2048 —— 场景约束形同虚设。
 *
 * 现在改为：先把路由默认值与调用方覆盖合并成**最终生效参数**，再对最终值做约束判定，
 * 并把三项**全部显式**交给网关。网关内部的 `{ ...routeOptions, ...req.options }` 是按键覆盖的，
 * 三项齐全意味着它无法再解析出一份不同的参数 —— 校验过的值就是发出去的值。
 *
 * （网关仍会自行解析 model / provider：灰度与预算封顶只改模型，不改这三个参数，故不受影响。）
 *
 * ## 越界时是拒绝还是裁剪：按"谁的错"区分
 * - **调用方传入越界 → 拒绝（400）。** 输入是调用方给的，必须让它知道被拒绝了，否则它会以为参数生效了。
 * - **路由默认值越界 → 裁剪到场景边界，并打 `warn` 日志。** 这是平台自己的配置与场景约束冲突，
 *   让用户请求失败等于拿运维问题惩罚用户；而裁剪永远只会让请求更小、不会突破上限，成本目标照样达成。
 *   裁剪**不是静默的**：每次都会以 `AI_SCENE_PARAM_CLAMPED` 前缀记录 scene、参数、路由值、边界与实际取值，
 *   控制器另记一条，便于告警。长期正确的做法是修路由配置或调整场景边界，而不是靠裁剪长期兜着。
 */
@Injectable()
export class ChatSceneAccessService {
  private readonly logger = new Logger(ChatSceneAccessService.name);

  constructor(private readonly router: ModelRouterService) {}

  /**
   * 场景准入 + 输入校验 + 最终参数解析，一次做完。
   *
   * 拒绝顺序刻意如此：先判场景准入，再判输入规模，最后判数值参数。
   * 未授权的调用者拿不到"参数为什么不合法"的信息，避免把场景的参数边界当探测面。
   */
  async authorize(
    scene: string,
    caller: ChatSceneCaller,
    input: ChatSceneInput,
  ): Promise<ChatSceneAuthorization> {
    const rule = this.resolveRule(scene, caller);
    this.assertInputSize(scene, rule, input.messages);

    const routeDefaults = this.resolveRouteDefaults(await this.router.getRoutingConfig(), scene);
    return this.resolveEffectiveOptions(scene, rule, input, routeDefaults);
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
   * 从路由配置推导该场景的三个参数默认值。
   *
   * 取值链必须与 `ModelRouterService.resolve()` 逐字一致，否则准入时算出的默认值
   * 和网关调用时用的默认值会不同——那正是这次要消除的东西。
   * 对照：`model-router.service.ts` 的 `resolve()` 返回的 `options` 块。
   */
  private resolveRouteDefaults(config: ModelRoutingConfig | undefined, scene: string): EffectiveChatOptions {
    // 配置缺失时退到与 resolve() 同一组硬编码兜底值，不另立一套
    const sceneConfig = config?.scenes?.[scene] || config?.default;
    return {
      temperature: sceneConfig?.temperature ?? config?.default?.temperature ?? 0.3,
      maxTokens: sceneConfig?.maxTokens ?? config?.default?.maxTokens ?? 2048,
      topP: sceneConfig?.topP ?? config?.default?.topP ?? 0.9,
    };
  }

  /** 合并路由默认值与调用方覆盖，对**最终值**做约束判定 */
  private resolveEffectiveOptions(
    scene: string,
    rule: ChatSceneRule,
    input: ChatSceneInput,
    routeDefaults: EffectiveChatOptions,
  ): ChatSceneAuthorization {
    const clamped: ClampedParam[] = [];

    const resolveOne = (
      param: ClampedParam["param"],
      supplied: number | undefined,
      range: SceneParamRange,
    ): number => {
      if (supplied !== undefined) {
        // 调用方传入越界 → 拒绝，不裁剪：静默改小调用方给的值会让它误以为参数生效了
        if (!Number.isFinite(supplied) || supplied < range.min || supplied > range.max) {
          throw new BusinessException(
            ErrorCode.BAD_REQUEST,
            `参数 ${param} 超出场景 [${scene}] 允许范围 [${range.min}, ${range.max}]`,
          );
        }
        return supplied;
      }

      // 未传 → 用路由默认值；路由配置越界是平台自己的问题，裁剪并告警，不让调用方请求失败
      const routeValue = routeDefaults[param];
      if (!Number.isFinite(routeValue)) {
        const applied = range.max;
        clamped.push({ param, routeValue, bound: range.max, applied });
        return applied;
      }
      if (routeValue > range.max) {
        clamped.push({ param, routeValue, bound: range.max, applied: range.max });
        return range.max;
      }
      if (routeValue < range.min) {
        clamped.push({ param, routeValue, bound: range.min, applied: range.min });
        return range.min;
      }
      return routeValue;
    };

    const options: EffectiveChatOptions = {
      temperature: resolveOne("temperature", input.temperature, rule.params.temperature),
      maxTokens: resolveOne("maxTokens", input.maxTokens, rule.params.maxTokens),
      topP: resolveOne("topP", input.topP, rule.params.topP),
    };

    for (const c of clamped) {
      this.logger.warn(
        `AI_SCENE_PARAM_CLAMPED scene=${scene} param=${c.param} routeValue=${c.routeValue} bound=${c.bound} applied=${c.applied} ` +
          `（路由配置该项超出场景约束，已裁剪到场景边界；请修正 ai_model_routing 或调整场景边界，不要长期依赖裁剪）`,
      );
    }

    return { options, clamped };
  }

  /** 场景不可用：未登记与无权限共用同一个响应 */
  private denied(): BusinessException {
    return new BusinessException(ErrorCode.FORBIDDEN, "该场景不通过此接口开放，或当前账号无权使用");
  }
}
