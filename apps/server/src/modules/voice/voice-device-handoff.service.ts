import { Injectable, Logger } from "@nestjs/common";
import { RedisService } from "../../redis/redis.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { VoiceDeviceService } from "./voice-device.service";
import { VoiceContextBuilder, VoiceContextRequest } from "./voice-context.builder";
import type { VoiceScene } from "./provider/voice-provider.types";

/**
 * 场景接续：在 App 里选好场景（报告 / 古籍段落 / 圈子助理 / 广场角色），让小卜硬件「接着聊」。
 *
 * - 设置时：设备必须是本人名下、可用；场景上下文按用户身份当场校验（报告归属、古籍公开口径、圈子成员有效期）
 * - 使用时：硬件每次开会话都**重新校验**一次（期间圈子过期、报告被删等都会失效），失效就清掉、回到普通硬件对话
 * - 绑定「设备 + 绑定代次 + 用户」：转赠、解绑后自动失效，新主人拿不到上一任设置的场景
 * - 有效期 2 小时，期间每按一次键都接着这个场景聊；在 App 里可随时清除或换一个
 * - 只存场景引用（场景类型、对象编号、小节），不存上下文正文
 */

export const HANDOFF_TTL_SECONDS = 2 * 3600;
export const HANDOFF_SCENES: readonly VoiceScene[] = ["report_dialogue", "classic_companion", "circle_assistant", "plaza", "content_guide"];

export interface DeviceHandoff {
  userId: string;
  deviceId: string;
  bindingVersion: number;
  request: Pick<VoiceContextRequest, "scene" | "contextId" | "sectionId" | "selectedText" | "intent">;
  /** 给用户看的一句话，如「命书 · 事业运」 */
  displayTopic: string;
  setAt: string;
  expiresAt: string;
}

@Injectable()
export class VoiceDeviceHandoffService {
  private readonly logger = new Logger(VoiceDeviceHandoffService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly devices: VoiceDeviceService,
    private readonly contexts: VoiceContextBuilder,
  ) {}

  private key(deviceId: string) {
    return `xb:handoff:${deviceId}`;
  }

  async set(userId: string, deviceId: string, input: DeviceHandoff["request"]) {
    const d = await this.devices.assertUsable(userId, deviceId);
    if (!HANDOFF_SCENES.includes(input.scene)) throw new BusinessException(ErrorCode.BAD_REQUEST, "该场景暂不支持在硬件上继续");
    const request: DeviceHandoff["request"] = {
      scene: input.scene,
      contextId: input.contextId ?? null,
      sectionId: input.sectionId ?? null,
      selectedText: input.selectedText ?? null,
      intent: input.intent ?? null,
    };
    // 当场按用户身份校验：没权限的场景设置不上
    const resolved = await this.contexts.resolve(userId, request);
    const now = Date.now();
    const rec: DeviceHandoff = {
      userId,
      deviceId: d.id,
      bindingVersion: d.bindingVersion,
      request,
      displayTopic: resolved.displayTopic,
      setAt: new Date(now).toISOString(),
      expiresAt: new Date(now + HANDOFF_TTL_SECONDS * 1000).toISOString(),
    };
    await this.redis.setJson(this.key(d.id), rec, HANDOFF_TTL_SECONDS);
    return this.view(rec);
  }

  /** 当前有效的接续场景（必须是本人、同一绑定代次） */
  async current(userId: string, device: { id: string; bindingVersion: number }): Promise<DeviceHandoff | null> {
    const rec = await this.redis.getJson<DeviceHandoff>(this.key(device.id));
    if (!rec) return null;
    if (rec.userId !== userId || rec.bindingVersion !== device.bindingVersion) {
      await this.redis.del(this.key(device.id));
      return null;
    }
    return rec;
  }

  async get(userId: string, deviceId: string) {
    const d = await this.devices.assertUsable(userId, deviceId);
    const rec = await this.current(userId, d);
    return rec ? this.view(rec) : null;
  }

  async clear(userId: string, deviceId: string) {
    const d = await this.devices.assertUsable(userId, deviceId);
    await this.redis.del(this.key(d.id));
    return { cleared: true };
  }

  /** 会话编排调用：场景已失效（权限变化、对象被删）时清掉，回到普通硬件对话 */
  async drop(deviceId: string, reason: string) {
    await this.redis.del(this.key(deviceId));
    this.logger.log(`硬件接续场景已失效并清除：设备 ${deviceId.slice(0, 8)} 原因 ${reason}`);
  }

  view(rec: DeviceHandoff) {
    return { deviceId: rec.deviceId, scene: rec.request.scene, displayTopic: rec.displayTopic, setAt: rec.setAt, expiresAt: rec.expiresAt };
  }
}
