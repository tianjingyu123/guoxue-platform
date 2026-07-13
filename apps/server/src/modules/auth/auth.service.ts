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
import { isUniqueConstraintError } from "../../common/prisma-errors";
import { buildPhoneFields, phoneHmac } from "../../common/crypto.util";
import { ImService } from "../im/im.service";
import { WebhookService } from "../webhook/webhook.service";
import { SmsService } from "../sms/sms.service";
import { PermissionService } from "../system/permission.service";
import {
  PhoneRegisterDto,
  PhoneLoginDto,
  SmsLoginDto,
  SendCodeDto,
  WechatLoginDto,
  MiniPhoneLoginDto,
  UpdateProfileDto,
  ChangePasswordDto,
  ForgotPasswordDto,
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
    private sms: SmsService,
    private permSvc: PermissionService,
  ) {}

  /** 生成 accessToken（2小时） + refreshToken（7天，存Redis可撤销） */
  private async generateTokenPair(userId: string) {
    const accessToken = this.jwt.sign({ sub: userId });
    const refreshToken = crypto.randomUUID();
    // refreshToken 存 Redis，7 天过期；同时挂进用户维度索引，撤销时可精确删除
    await this.redis.set(`refresh:${refreshToken}`, userId, 30 * 24 * 3600);
    await this.redis.sadd(`refresh:user:${userId}`, refreshToken);
    await this.redis.expire(`refresh:user:${userId}`, 30 * 24 * 3600);
    return { accessToken, refreshToken };
  }

  /**
   * 跨端无感登录握手码：签发一次性短时码（60s·绑定当前用户）。
   * 用于"后台点链接跳 C 端发文"场景——避免把可复用的 bearer token 放进 URL（防泄露/会话固定）。
   */
  async issueHandoffCode(userId: string): Promise<{ code: string; expiresIn: number }> {
    const code = crypto.randomBytes(24).toString("hex");
    await this.redis.set(`handoff:${code}`, userId, 60);
    return { code, expiresIn: 60 };
  }

  /** 用握手码换取新会话（用后即焚·单次）。攻击者无法伪造码（签发需登录态），故不产生会话注入。 */
  async exchangeHandoffCode(code: string) {
    if (!code) throw new BusinessException(ErrorCode.AUTH_TOKEN_INVALID, "握手码无效");
    const userId = await this.redis.get(`handoff:${code}`);
    if (!userId) throw new BusinessException(ErrorCode.AUTH_TOKEN_INVALID, "握手码无效或已过期");
    await this.redis.del(`handoff:${code}`); // 单次消费，防重放
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { status: true } });
    if (!user || user.status === "DISABLED") throw new BusinessException(ErrorCode.AUTH_TOKEN_INVALID, "账号不可用");
    return this.generateTokenPair(userId);
  }

  /** 使用 refreshToken 换取新的 accessToken（轮换刷新） */
  async refreshToken(refreshToken: string) {
    const userId = await this.redis.get(`refresh:${refreshToken}`);
    if (!userId) throw new BusinessException(ErrorCode.AUTH_TOKEN_INVALID, "refreshToken 无效或已过期");
    // 轮换宽限（防误登出）：旧 refreshToken 不立即删除，保留 60 秒缓冲——
    // 吸收 H5 多标签页/并发请求/页面刷新时对同一 token 的重复续期（否则第二次续期撞上"已作废"→前端清登录态→掉线）。
    // 60 秒后自动失效，仍保留防重放能力。
    await this.redis.expire(`refresh:${refreshToken}`, 60);
    await this.redis.srem(`refresh:user:${userId}`, refreshToken);
    // 封号用户不再续发（accessToken 侧由 JwtStrategy 拦截，此处断掉 refresh 链路）
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { status: true } });
    if (!user || user.status === "DISABLED") {
      throw new BusinessException(ErrorCode.AUTH_TOKEN_INVALID, "账号不可用");
    }
    return this.generateTokenPair(userId);
  }

  /** 撤销指定用户所有 refreshToken 并使已签发 accessToken 失效（修改密码/封号等场景） */
  async revokeAllRefreshTokens(userId: string) {
    // 精确删除该用户全部 refreshToken（旧 refresh 立即失效，不影响撤销后的新登录）
    const tokens = await this.redis.smembers(`refresh:user:${userId}`);
    for (const t of tokens) {
      await this.redis.del(`refresh:${t}`);
    }
    await this.redis.del(`refresh:user:${userId}`);
    // 记录撤销时刻，JwtStrategy 用 iat 比对拒绝撤销前签发的 accessToken；TTL 需覆盖 accessToken 最长生命期(24h)
    await this.redis.set(`revoked:user:${userId}`, String(Date.now()), 24 * 3600 + 60);
  }

  /** 生成仅 accessToken（兼容旧接口） */
  private async generateToken(userId: string) {
    return this.jwt.sign({ sub: userId });
  }

  async phoneRegister(dto: PhoneRegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { phoneHash: phoneHmac(dto.phone) } });
    if (existing) throw new BusinessException(ErrorCode.AUTH_PHONE_EXISTS, "手机号已注册");

    const passwordHash = await bcrypt.hash(dto.password, 10);
    let user: User;
    try {
      user = await this.prisma.user.create({
        data: {
          nickname: dto.nickname,
          ...buildPhoneFields(dto.phone), // M4 灰度双写：phone + phoneHash + phoneEnc
          auths: { create: { provider: "PASSWORD", credential: passwordHash } },
        },
      });
    } catch (e: unknown) {
      if (isUniqueConstraintError(e)) throw new BusinessException(ErrorCode.AUTH_PHONE_EXISTS, "手机号已注册");
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
    // 账号级失败锁定：防止换 IP 绕过 IP 限流后对单一手机号定向撞库
    const lockKey = `login:lock:${dto.phone}`;
    if (await this.redis.get(lockKey)) {
      throw new BusinessException(ErrorCode.AUTH_PASSWORD_WRONG, "登录失败次数过多，请15分钟后再试");
    }

    const user = await this.prisma.user.findUnique({
      where: { phoneHash: phoneHmac(dto.phone) },
      include: { auths: { where: { provider: "PASSWORD" } } },
    });
    if (!user) {
      // 恒定耗时：用户不存在时也执行一次等价 bcrypt 比较，消除"是否注册"的时序枚举侧信道
      await bcrypt.compare(dto.password, "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy");
      await this.bumpLoginFail(dto.phone);
      throw new BusinessException(ErrorCode.AUTH_PASSWORD_WRONG, "手机号或密码错误");
    }

    const auth = user.auths[0];
    if (!auth?.credential) throw new BusinessException(ErrorCode.BAD_REQUEST, "账号未设置密码");

    const valid = await bcrypt.compare(dto.password, auth.credential);
    if (!valid) {
      await this.bumpLoginFail(dto.phone);
      throw new BusinessException(ErrorCode.AUTH_PASSWORD_WRONG, "手机号或密码错误");
    }

    // 登录成功：清除失败计数
    await this.redis.del(`login:fail:${dto.phone}`);
    this.importToIm(user.id, user.nickname);
    return this.buildLoginResult(user.id);
  }

  /** 登录失败计数：连续 10 次失败锁定该手机号 15 分钟（账号级，补充 IP 级限流抵御换 IP 撞库） */
  private async bumpLoginFail(phone: string) {
    const failKey = `login:fail:${phone}`;
    const count = parseInt((await this.redis.get(failKey)) || "0", 10) + 1;
    await this.redis.set(failKey, String(count), 900);
    if (count >= 10) {
      await this.redis.set(`login:lock:${phone}`, "LOCKED", 900);
    }
  }

  async smsLogin(dto: SmsLoginDto) {
    // 验证短信验证码
    await this.verifySmsCode(dto.phone, dto.code);

    let user = await this.prisma.user.findUnique({ where: { phoneHash: phoneHmac(dto.phone) } });
    if (!user) {
      // 新用户自动注册（并发时捕获 P2002）
      try {
        user = await this.prisma.user.create({
          data: {
            nickname: `用户${dto.phone.slice(-4)}`,
            ...buildPhoneFields(dto.phone), // M4 灰度双写
            auths: { create: { provider: "PHONE", credential: phoneHmac(dto.phone) } }, // M4 Auth不存明文phone
          },
        });
      } catch (e: unknown) {
        if (isUniqueConstraintError(e)) {
          user = await this.prisma.user.findUnique({ where: { phoneHash: phoneHmac(dto.phone) } });
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
    return this.sms.sendVerifyCode(dto.phone, dto.scene || "LOGIN");
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
      if (isUniqueConstraintError(e)) {
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
    let user = await this.prisma.user.findUnique({ where: { phoneHash: phoneHmac(phone) } });

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
            ...buildPhoneFields(phone), // M4 灰度双写
            auths: {
              create: { provider: "WECHAT", openId, unionId: session.unionId },
            },
          },
        });
      } catch (e: unknown) {
        if (isUniqueConstraintError(e)) {
          user = await this.prisma.user.findUnique({ where: { phoneHash: phoneHmac(phone) } });
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
    const [user, permissions, merchant] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, nickname: true, avatar: true, phone: true, email: true,
          gender: true, birthday: true, bio: true, interestCategories: true,
          identityVerified: true, paymentPasswordHash: true,
          memberLevel: true, memberExpire: true,
          createdAt: true,
          roles: { select: { roleType: true, bindId: true } },
        },
      }),
      this.permSvc.getUserPermissions(userId),
      this.prisma.merchant.findUnique({
        where: { userId },
        select: { id: true, status: true, shopName: true, shopLogo: true },
      }),
    ]);
    // 商家身份 = 自营 owner 或 受雇操作员(MerchantMember·官方旗舰店多管理员场景)
    let effectiveMerchant = merchant;
    if (!effectiveMerchant) {
      const membership = await this.prisma.merchantMember.findFirst({
        where: { userId, status: "ACTIVE" },
        select: { merchant: { select: { id: true, status: true, shopName: true, shopLogo: true } } },
      });
      effectiveMerchant = membership?.merchant ?? null;
    }
    // 不回传支付密码哈希，仅暴露是否已设置的布尔值
    const { paymentPasswordHash, roles, ...rest } = user ?? {};
    // 有 ACTIVE 商家（自营/受雇）则注入 MERCHANT 身份：个人中心"身份切换"统一从此进商家管理台，权限天然由此控制
    const mergedRoles: Array<{ roleType: string; bindId: string | null }> = [
      ...(roles ?? []).map((r) => ({ roleType: String(r.roleType), bindId: r.bindId ?? null })),
      ...(effectiveMerchant && effectiveMerchant.status === "ACTIVE"
        ? [{ roleType: "MERCHANT", bindId: effectiveMerchant.id }]
        : []),
    ];
    return { ...rest, roles: mergedRoles, paymentPasswordSet: !!paymentPasswordHash, permissions, merchant: effectiveMerchant };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const data: Record<string, unknown> = {};
    if (dto.nickname !== undefined) data.nickname = dto.nickname;
    if (dto.avatar !== undefined) data.avatar = dto.avatar;
    if (dto.gender !== undefined) data.gender = dto.gender;
    if (dto.birthday !== undefined) data.birthday = new Date(dto.birthday);
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
    const newHash = await bcrypt.hash(dto.newPassword, 10);

    if (!auth?.credential) {
      // 首次设置密码：验证码/微信登录用户从无 PASSWORD 凭证，本人已登录态即可信任，
      // 无需旧密码，直接创建凭证（原先在此抛"未设置密码"导致这类用户永远设不了密码）。
      await this.prisma.auth.create({
        data: { userId, provider: "PASSWORD", credential: newHash },
      });
    } else {
      // 已有密码：必须校验旧密码
      if (!dto.oldPassword) throw new BusinessException(ErrorCode.BAD_REQUEST, "请输入当前密码");
      const valid = await bcrypt.compare(dto.oldPassword, auth.credential);
      if (!valid) throw new BusinessException(ErrorCode.AUTH_PASSWORD_WRONG, "原密码错误");
      await this.prisma.auth.update({
        where: { id: auth.id },
        data: { credential: newHash },
      });
    }
    await this.revokeAllRefreshTokens(userId);
    return { success: true };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    await this.sms.verifyCode(dto.phone, dto.code, "RESET");

    const user = await this.prisma.user.findUnique({ where: { phoneHash: phoneHmac(dto.phone) } });
    if (!user) throw new BusinessException(ErrorCode.USER_NOT_FOUND, "该手机号未注册");

    const auth = await this.prisma.auth.findFirst({
      where: { userId: user.id, provider: "PASSWORD" },
    });

    const newHash = await bcrypt.hash(dto.password, 10);
    if (!auth) {
      // 短信注册用户无 PASSWORD 凭据行：验证码已核验，本通道兼作「首次设置密码」
      await this.prisma.auth.create({
        data: { userId: user.id, provider: "PASSWORD", credential: newHash },
      });
    } else {
      await this.prisma.auth.update({
        where: { id: auth.id },
        data: { credential: newHash },
      });
    }

    await this.revokeAllRefreshTokens(user.id);
    return { success: true, message: "密码已重置" };
  }

  // ── 设备管理 ──

  async registerDevice(userId: string, deviceName?: string, deviceType?: string, ip?: string) {
    await this.prisma.loginDevice.updateMany({ where: { userId }, data: { isCurrent: false } });
    return this.prisma.loginDevice.create({
      data: { userId, deviceName: deviceName || "未知设备", deviceType: deviceType || "WEB", ipAddress: ip, isCurrent: true },
    });
  }

  async listDevices(userId: string) {
    return this.prisma.loginDevice.findMany({
      where: { userId },
      orderBy: { lastLogin: "desc" },
      select: { id: true, deviceName: true, deviceType: true, ipAddress: true, location: true, isCurrent: true, lastLogin: true, createdAt: true },
    });
  }

  async removeDevice(userId: string, deviceId: string) {
    await this.prisma.loginDevice.deleteMany({ where: { id: deviceId, userId } });
    return { success: true };
  }

  // ── 绑定 ──

  async bindPhone(userId: string, phone: string, code: string) {
    await this.sms.verifyCode(phone, code);

    // 检查手机号是否已被其他用户占用
    const phoneTaken = await this.prisma.user.findUnique({ where: { phoneHash: phoneHmac(phone) } });
    if (phoneTaken && phoneTaken.id !== userId) {
      throw new BusinessException(ErrorCode.AUTH_PHONE_EXISTS, "手机号已被其他账号绑定");
    }

    // 检查 openId 是否已被其他 Auth 记录占用
    const openIdTaken = await this.prisma.auth.findUnique({ where: { openId: phoneHmac(phone) } });
    if (openIdTaken && openIdTaken.userId !== userId) {
      throw new BusinessException(ErrorCode.AUTH_PHONE_EXISTS, "手机号已被其他账号绑定");
    }

    // Auth: openId存手机号作为唯一标识
    const existing = await this.prisma.auth.findFirst({ where: { userId, provider: "PHONE" } });
    if (existing) {
      await this.prisma.auth.update({ where: { id: existing.id }, data: { openId: phoneHmac(phone), credential: phoneHmac(phone)} });
    } else {
      await this.prisma.auth.create({ data: { userId, provider: "PHONE", openId: phoneHmac(phone), credential: phoneHmac(phone)} });
    }
    await this.prisma.user.update({ where: { id: userId }, data: buildPhoneFields(phone) }); // M4 灰度双写
    return { success: true };
  }

  async bindWechat(userId: string, code: string) {
    const wxUser = await this.wechat.exchangeOAuthCode(code);
    if (!wxUser?.openId) throw new BusinessException(ErrorCode.BAD_REQUEST, "获取微信信息失败");
    const existing = await this.prisma.auth.findFirst({ where: { userId, provider: "WECHAT" } });
    if (existing) {
      await this.prisma.auth.update({ where: { id: existing.id }, data: { openId: wxUser.openId, unionId: wxUser.unionId } });
    } else {
      await this.prisma.auth.create({ data: { userId, provider: "WECHAT", openId: wxUser.openId, unionId: wxUser.unionId } });
    }
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

  /**
   * 注册归属绑定（永久归属真源=ReferralRelation）。
   * referrerCode 兼容两种取值（全平台单一分享链接的 ref 参数）：分站推广码 或 分享者用户ID（须为站长）。
   */
  private async bindReferral(userId: string, referrerCode: string) {
    let station = await this.prisma.station.findUnique({ where: { code: referrerCode } });
    if (!station) {
      station = await this.prisma.station.findUnique({ where: { userId: referrerCode } });
    }
    if (station && station.status === "ACTIVE" && station.userId !== userId) {
      await this.prisma.referralRelation
        .create({
          data: {
            userId,
            referrerId: station.userId,
            referrerType: "STATION_MASTER",
            sourceChannel: "INVITE_CODE",
          },
        })
        .catch((e) => {
          // @@unique([userId, referrerId]) 重复绑定幂等忽略
          this.logger?.warn?.(`归属绑定跳过(user=${userId})`, e);
        });
    }
  }

  private async verifySmsCode(phone: string, code: string) {
    return this.sms.verifyCode(phone, code, "LOGIN");
  }
}
