import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { buildAddressPrompt, extractPreferredName, judgeNickname } from "./preferred-name";

/**
 * 用户称呼的记忆（2026-09-18）
 *
 * 决策人要求：昵称不适合当称呼时，助理主动商量一次，确定后自己记住。
 *
 * 这里管三件事：取当前该用的称呼、把用户说的称呼记下来、记住「已经问过了」。
 * 最后一件最容易被忽略却最重要——**追着问称呼比叫错更烦人**，
 * 所以问过一次就要留痕，用户没答也算问过。
 */
@Injectable()
export class PreferredNameService {
  private readonly logger = new Logger(PreferredNameService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 取该用户当前的称呼状态，并生成给模型的称呼指令。
   * 任何一步出错都不影响对话——称呼是锦上添花，不该因为它让整轮问答失败。
   */
  async addressPrompt(userId?: string | null): Promise<{ prompt: string; preferred: string | null; shouldAsk: boolean }> {
    if (!userId) return { prompt: "", preferred: null, shouldAsk: false };
    try {
      const [row, user] = await Promise.all([
        this.prisma.userPreferredName.findUnique({ where: { userId } }),
        this.prisma.user.findUnique({ where: { id: userId }, select: { nickname: true } }),
      ]);
      const preferred = row?.name?.trim() || null;
      const alreadyAsked = !!row?.askedAt;
      const nickOk = judgeNickname(user?.nickname).ok;

      return {
        prompt: buildAddressPrompt({ preferred, nickname: user?.nickname, alreadyAsked }),
        preferred,
        // 需要问：没有确认过的称呼、昵称也不合适、且还没问过
        shouldAsk: !preferred && !nickOk && !alreadyAsked,
      };
    } catch (error: any) {
      this.logger.warn(`取用户称呼失败（不影响对话）：${error?.message || error}`);
      return { prompt: "", preferred: null, shouldAsk: false };
    }
  }

  /** 标记「已经问过了」——用户没答也要记，否则下次又问一遍 */
  async markAsked(userId: string) {
    try {
      await this.prisma.userPreferredName.upsert({
        where: { userId },
        create: { userId, askedAt: new Date() },
        update: { askedAt: new Date() },
      });
    } catch (error: any) {
      this.logger.warn(`标记称呼已询问失败：${error?.message || error}`);
    }
  }

  /**
   * 从用户这句话里认出他想被怎么称呼，认出来就记住。
   * 认不出返回 null——猜错了比不猜更尴尬。
   */
  async captureFromMessage(userId: string, text?: string | null): Promise<string | null> {
    const name = extractPreferredName(text);
    if (!name) return null;
    try {
      await this.prisma.userPreferredName.upsert({
        where: { userId },
        create: { userId, name, source: "asked", askedAt: new Date() },
        update: { name, source: "asked" },
      });
      this.logger.log(`记住用户称呼：${userId} → ${name}`);
      return name;
    } catch (error: any) {
      this.logger.warn(`保存用户称呼失败：${error?.message || error}`);
      return null;
    }
  }

  /**
   * 设置页要展示的称呼详情。
   * 除了「现在叫什么」，还要说清**这个称呼是哪来的**——
   * 用户看到机器人叫他「老陈」，得知道是自己说过还是系统拿昵称推的。
   */
  async detail(userId: string) {
    const [row, user] = await Promise.all([
      this.prisma.userPreferredName.findUnique({ where: { userId } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { nickname: true } }),
    ]);
    const preferred = row?.name?.trim() || null;
    const v = judgeNickname(user?.nickname);

    return {
      /** 当前实际使用的称呼；为空表示一律用「你」 */
      name: preferred ?? (v.ok ? v.name : null),
      /** asked=你自己说的 / nickname=取自昵称 / null=还没有 */
      source: preferred ? "asked" : v.ok ? "nickname" : null,
      nickname: user?.nickname ?? null,
      /** 昵称能不能直接当称呼——不能时告诉用户为什么，他才知道要不要设一个 */
      nicknameUsable: v.ok,
      askedAt: row?.askedAt ?? null,
    };
  }

  /** 用户在设置里直接改称呼 */
  async set(userId: string, name: string) {
    const v = judgeNickname(name);
    if (!v.ok) return { ok: false as const, reason: v.reason };
    await this.prisma.userPreferredName.upsert({
      where: { userId },
      create: { userId, name: v.name, source: "asked", askedAt: new Date() },
      update: { name: v.name, source: "asked" },
    });
    return { ok: true as const, name: v.name };
  }

  /** 用户要求不再用称呼 */
  async clear(userId: string) {
    await this.prisma.userPreferredName.upsert({
      where: { userId },
      // askedAt 保留：清空称呼不等于「可以再问一遍」
      create: { userId, name: null, askedAt: new Date() },
      update: { name: null },
    });
  }
}
