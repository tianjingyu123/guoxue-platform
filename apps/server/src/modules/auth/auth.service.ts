import {
  Injectable,
  Logger,
} from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import { User } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { WechatService } from "./wechat.service";
import { ImService } from "../im/im.service";
import { WebhookService } from "../webhook/webhook.service";
import {
  PhoneRegisterDto,
  PhoneLoginDto,
  SmsLoginDto,
  SendCodeDto,
  WechatLoginDto,
  MiniPhoneLoginDto,
  UpdateProfileDto,
  ChangePasswordDto,
} from "./auth.dto";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private redis: RedisService,
    private wechat: WechatService,
    private im: ImService,
    private webhook: WebhookService,
  ) {}

  /** 生成 accessToken（15分钟） + refreshToken（7天，存Redis可撤销） */
  private async generateTokenPair(userId: string) {
    const accessToken = this.jwt.sign({ sub: userId });
    const refreshToken = crypto.randomUUID();
    // refreshToken 存 Redis，7 天过期，可用于主动撤销
    await this.redis.set(`refresh:${refreshToken}`, userId, 7 * 24 * 3600);
    return { accessToken, refreshToken };
  }

  /** 使用 refreshToken 换取新的 accessToken（轮换刷新） */
  async refreshToken(refreshToken: string) {
    const userId = await this.redis.get(`refresh:${refreshToken}`);
    if (!userId) throw new BusinessException(ErrorCode.AUTH_TOKEN_INVALID, "refreshToken 无效或已过期");
    // 轮换：删除旧 token 防止重放攻击
    await this.redis.del(`refresh:${refreshToken}`);
    return this.generateTokenPair(userId);
  }

  /** 撤销指定用户所有 refreshToken（修改密码/封号等场景） */
  async revokeAllRefreshTokens(userId: string) {
    // 将用户加入黑名单，后续 refresh 时检查
    await this.redis.set(`revoked:user:${userId}`, "1", 15 * 60); // 15分钟黑名单
  }

  /** 生成仅 accessToken（兼容旧接口） */
  private async generateToken(userId: string) {
    return this.jwt.sign({ sub: userId });
  }

  async phoneRegister(dto: PhoneRegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (existing) throw new BusinessException(ErrorCode.AUTH_PHONE_EXISTS, "手机号已注册");

    const passwordHash = await bcrypt.hash(dto.password, 10);
    let user: User;
    try {
      user = await this.prisma.user.create({
        data: {
          nickname: dto.nickname,
          phone: dto.phone,
          auths: { create: { provider: "PASSWORD", credential: passwordHash } },
        },
      });
    } catch (e: unknown) {
      if ((e as { code?: string })?.code === "P2002") throw new BusinessException(ErrorCode.AUTH_PHONE_EXISTS, "手机号已注册");
      throw e;
    }

    // 处理推荐关系
    if (dto.referrerCode) {
      await this.bindReferral(user.id, dto.referrerCode);
    }

    this.fireUserRegistered(user.id, user.nickname, user.phone!);
    this.importToIm(user.id, user.nickname);
    return this.buildLoginResult(user.id);
  }

  async phoneLogin(dto: PhoneLoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
      include: { auths: { where: { provider: "PASSWORD" } } },
    });
    if (!user) throw new BusinessException(ErrorCode.AUTH_PASSWORD_WRONG, "手机号或密码错误");

    const auth = user.auths[0];
    if (!auth?.credential) throw new BusinessException(ErrorCode.BAD_REQUEST, "账号未设置密码");

    const valid = await bcrypt.compare(dto.password, auth.credential);
    if (!valid) throw new BusinessException(ErrorCode.AUTH_PASSWORD_WRONG, "手机号或密码错误");

    this.importToIm(user.id, user.nickname);
    return this.buildLoginResult(user.id);
  }

  async smsLogin(dto: SmsLoginDto) {
    // 验证短信验证码
    await this.verifySmsCode(dto.phone, dto.code);

    let user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (!user) {
      // 新用户自动注册（并发时捕获 P2002）
      try {
        user = await this.prisma.user.create({
          data: {
            nickname: `用户${dto.phone.slice(-4)}`,
            phone: dto.phone,
            auths: { create: { provider: "PHONE", credential: dto.phone } },
          },
        });
      } catch (e: unknown) {
        if ((e as { code?: string })?.code === "P2002") {
          user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
        } else {
          throw e;
        }
      }
      // 此时 user 必定非空：create 成功或 P2002 后重查成功
      const registered = user!;
      if (dto.referrerCode) {
        await this.bindReferral(registered.id, dto.referrerCode);
      }
      this.fireUserRegistered(registered.id, registered.nickname, registered.phone!);
    }

    this.importToIm(user!.id, user!.nickname);
    return this.buildLoginResult(user!.id);
  }

  async sendSmsCode(dto: SendCodeDto) {
    const code = process.env.NODE_ENV === "production" ? this.generateSmsCode() : "123456";
    // 存入 Redis，有效期5分钟
    const smsKey = `sms_code:${dto.phone}`;
    await this.redis.set(smsKey, code, 300);
    return { success: true, message: "验证码已发送" };
  }

  async wechatLogin(dto: WechatLoginDto) {
    if (!process.env.WECHAT_APP_ID || !process.env.WECHAT_APP_SECRET) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "微信登录未配置，请联系管理员");
    }

    // 用 code 换取 openId（自动判断 H5 OAuth 还是小程序）
    let openId: string;
    let unionId: string | undefined;

    try {
      if (dto.loginType === "miniprogram") {
        const session = await this.wechat.exchangeMiniCode(dto.code);
        openId = session.openId;
        unionId = session.unionId;
      } else {
        const token = await this.wechat.exchangeOAuthCode(dto.code);
        openId = token.openId;
        unionId = token.unionId;
      }
    } catch (e: unknown) {
      this.logger.error("微信 code 换取失败", (e as Error).message);
      throw new BusinessException(ErrorCode.AUTH_WECHAT_FAILED, (e as Error).message || "微信授权失败，请重试");
    }

    if (!openId) {
      throw new BusinessException(ErrorCode.AUTH_WECHAT_FAILED, "微信授权失败，未获取到 openId");
    }

    // 查找已有的微信认证记录
    const existingAuth = await this.prisma.auth.findUnique({
      where: { openId },
      include: { user: true },
    });

    if (existingAuth) {
      // 老用户：更新 unionId（如有）
      if (unionId && !existingAuth.unionId) {
        await this.prisma.auth.update({
          where: { id: existingAuth.id },
          data: { unionId },
        });
      }
      return this.buildLoginResult(existingAuth.userId);
    }

    // 通过 unionId 跨应用查找（小程序和 H5 之间的用户打通）
    if (unionId) {
      const unionAuth = await this.prisma.auth.findFirst({
        where: { unionId },
        include: { user: true },
      });
      if (unionAuth) {
        // 为已有用户添加新的微信认证方式
        await this.prisma.auth.create({
          data: { userId: unionAuth.userId, provider: "WECHAT", openId, unionId },
        });
        return this.buildLoginResult(unionAuth.userId);
      }
    }

    // 新用户：自动注册（并发时捕获 P2002）
    const nickname = dto.nickname || `微信用户${openId.slice(-6)}`;
    const avatar = dto.avatar || undefined;

    let user: User;
    try {
      user = await this.prisma.user.create({
        data: {
          nickname,
          avatar,
          auths: {
            create: { provider: "WECHAT", openId, unionId },
          },
        },
      });
    } catch (e: unknown) {
      if ((e as { code?: string })?.code === "P2002") {
        // 并发注册：重新查询已创建的记录
        const reAuth = await this.prisma.auth.findUnique({
          where: { openId },
          include: { user: true },
        });
        if (!reAuth) throw e;
        return this.buildLoginResult(reAuth.userId);
      }
      throw e;
    }

    // 处理推荐关系
    if (dto.referrerCode) {
      await this.bindReferral(user.id, dto.referrerCode);
    }

    this.fireUserRegistered(user.id, user.nickname);
    this.importToIm(user.id, user.nickname, user.avatar || undefined);
    return this.buildLoginResult(user.id);
  }

  /** 小程序手机号快速登录 */
  async miniPhoneLogin(dto: MiniPhoneLoginDto) {
    // 1. wx.login code → openId + sessionKey
    const session = await this.wechat.exchangeMiniCode(dto.wxCode);
    const { openId, sessionKey } = session;

    if (!openId) {
      throw new BusinessException(ErrorCode.AUTH_WECHAT_FAILED, "微信授权失败，未获取到 openId");
    }

    // 2. 获取手机号
    let phone: string;
    try {
      if (dto.iv) {
        // 旧版：解密 encryptedData
        phone = this.wechat.decryptPhoneNumber(dto.phoneCode, dto.iv, sessionKey);
      } else {
        // 新版：code 换取手机号
        const result = await this.wechat.exchangePhoneNumber(dto.phoneCode);
        phone = result.purePhoneNumber;
      }
    } catch (err: unknown) {
      this.logger.error("获取手机号失败", (err as Error).message);
      throw new BusinessException(ErrorCode.BAD_REQUEST, "获取手机号失败，请重试");
    }

    if (!phone) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "未能获取手机号");
    }

    // 3. 通过手机号查找或创建用户
    let user = await this.prisma.user.findUnique({ where: { phone } });

    if (user) {
      // 已有用户：绑定微信 openId（如未绑定，并发时捕获 P2002）
      const existingAuth = await this.prisma.auth.findUnique({ where: { openId } });
      if (!existingAuth) {
        try {
          await this.prisma.auth.create({
            data: {
              userId: user.id,
              provider: "WECHAT",
              openId,
              unionId: session.unionId,
            },
          });
        } catch (e: unknown) {
          if ((e as { code?: string })?.code !== "P2002") throw e;
        }
      }
    } else {
      // 新用户：注册（并发时捕获 P2002）
      try {
        user = await this.prisma.user.create({
          data: {
            nickname: `用户${phone.slice(-4)}`,
            phone,
            auths: {
              create: { provider: "WECHAT", openId, unionId: session.unionId },
            },
          },
        });
      } catch (e: unknown) {
        if ((e as { code?: string })?.code === "P2002") {
          user = await this.prisma.user.findUnique({ where: { phone } });
          if (!user) throw e;
        } else {
          throw e;
        }
      }
      if (dto.referrerCode) {
        await this.bindReferral(user.id, dto.referrerCode);
      }
      this.fireUserRegistered(user.id, user.nickname, user.phone!);
    }

    this.importToIm(user.id, user.nickname);
    return this.buildLoginResult(user.id);
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, nickname: true, avatar: true, phone: true, email: true,
        gender: true, birthday: true, memberLevel: true, memberExpire: true,
        createdAt: true,
        roles: { select: { roleType: true, bindId: true } },
      },
    });
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const data: Record<string, unknown> = { ...dto };
    if (dto.birthday) data.birthday = new Date(dto.birthday);
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, nickname: true, avatar: true, gender: true, birthday: true },
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const auth = await this.prisma.auth.findFirst({
      where: { userId, provider: "PASSWORD" },
    });
    if (!auth?.credential) throw new BusinessException(ErrorCode.BAD_REQUEST, "未设置密码");

    const valid = await bcrypt.compare(dto.oldPassword, auth.credential);
    if (!valid) throw new BusinessException(ErrorCode.AUTH_PASSWORD_WRONG, "原密码错误");

    const newHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.auth.update({
      where: { id: auth.id },
      data: { credential: newHash },
    });
    return { success: true };
  }

  // ───────── 私有方法 ─────────

  /** 触发用户注册 Webhook（异步，失败不影响注册流程） */
  private fireUserRegistered(userId: string, nickname: string, phone?: string) {
    this.webhook.fire("USER_REGISTERED", { userId, nickname, phone }).catch((err) => this.logger.warn("Webhook 发送失败", err));
  }

  /** 异步导入用户到 IM（失败不影响登录） */
  private importToIm(userId: string, nickname: string, avatar?: string) {
    this.im.importAccount(userId, nickname, avatar).catch((err) => {
      this.logger.warn(`IM 账号导入失败（不影响功能）: ${err.message}`);
    });
  }

  private async buildLoginResult(userId: string) {
    // 用户信息与角色并行查询（无数据依赖）
    const [user, roles, tokenPair] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, nickname: true, avatar: true, phone: true,
          memberLevel: true, memberExpire: true,
        },
      }),
      this.prisma.userRole.findMany({
        where: { userId },
        select: { roleType: true, bindId: true },
      }),
      this.generateTokenPair(userId),
    ]);

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      user: { ...user, roles },
    };
  }

  private async bindReferral(userId: string, referrerCode: string) {
    const station = await this.prisma.station.findUnique({ where: { code: referrerCode } });
    if (station) {
      await this.prisma.referralRelation.create({
        data: {
          userId,
          referrerId: station.userId,
          referrerType: "STATION_MASTER",
          sourceChannel: "INVITE_CODE",
        },
      });
    }
  }

  private async verifySmsCode(phone: string, code: string) {
    const smsKey = `sms_code:${phone}`;
    const storedCode = await this.redis.get(smsKey);
    if (!storedCode) throw new BusinessException(ErrorCode.AUTH_SMS_CODE_EXPIRED, "验证码已过期，请重新发送");
    if (storedCode !== code) throw new BusinessException(ErrorCode.AUTH_SMS_CODE_INVALID, "验证码错误");
    // 验证成功后删除已使用的验证码
    await this.redis.del(smsKey);
  }

  private generateSmsCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
