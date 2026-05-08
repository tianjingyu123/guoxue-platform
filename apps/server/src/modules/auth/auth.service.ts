import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { WechatService } from "./wechat.service";
import { ImService } from "../im/im.service";
import {
  PhoneRegisterDto,
  PhoneLoginDto,
  SmsLoginDto,
  SendCodeDto,
  WechatLoginDto,
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
  ) {}

  private generateToken(userId: string) {
    return this.jwt.sign({ sub: userId });
  }

  async phoneRegister(dto: PhoneRegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (existing) throw new ConflictException("手机号已注册");

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        nickname: dto.nickname,
        phone: dto.phone,
        auths: { create: { provider: "PASSWORD", credential: passwordHash } },
      },
    });

    // 处理推荐关系
    if (dto.referrerCode) {
      await this.bindReferral(user.id, dto.referrerCode);
    }

    this.importToIm(user.id, user.nickname);
    return this.buildLoginResult(user.id);
  }

  async phoneLogin(dto: PhoneLoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
      include: { auths: { where: { provider: "PASSWORD" } } },
    });
    if (!user) throw new UnauthorizedException("手机号或密码错误");

    const auth = user.auths[0];
    if (!auth?.credential) throw new UnauthorizedException("账号未设置密码");

    const valid = await bcrypt.compare(dto.password, auth.credential);
    if (!valid) throw new UnauthorizedException("手机号或密码错误");

    this.importToIm(user.id, user.nickname);
    return this.buildLoginResult(user.id);
  }

  async smsLogin(dto: SmsLoginDto) {
    // 验证短信验证码
    await this.verifySmsCode(dto.phone, dto.code);

    let user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (!user) {
      // 新用户自动注册
      user = await this.prisma.user.create({
        data: {
          nickname: `用户${dto.phone.slice(-4)}`,
          phone: dto.phone,
          auths: { create: { provider: "PHONE", credential: dto.phone } },
        },
      });
      if (dto.referrerCode) {
        await this.bindReferral(user.id, dto.referrerCode);
      }
    }

    this.importToIm(user.id, user.nickname);
    return this.buildLoginResult(user.id);
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
      throw new BadRequestException("微信登录未配置，请联系管理员");
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
    } catch (e: any) {
      this.logger.error("微信 code 换取失败", e.message);
      throw new BadRequestException(e.message || "微信授权失败，请重试");
    }

    if (!openId) {
      throw new BadRequestException("微信授权失败，未获取到 openId");
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

    // 新用户：自动注册
    const nickname = dto.nickname || `微信用户${openId.slice(-6)}`;
    const avatar = dto.avatar || undefined;

    const user = await this.prisma.user.create({
      data: {
        nickname,
        avatar,
        auths: {
          create: { provider: "WECHAT", openId, unionId },
        },
      },
    });

    // 处理推荐关系
    if (dto.referrerCode) {
      await (this as any).bindReferral(user.id, dto.referrerCode);
    }

    this.importToIm(user.id, user.nickname, user.avatar || undefined);
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
    const data: any = { ...dto };
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
    if (!auth?.credential) throw new BadRequestException("未设置密码");

    const valid = await bcrypt.compare(dto.oldPassword, auth.credential);
    if (!valid) throw new BadRequestException("原密码错误");

    const newHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.auth.update({
      where: { id: auth.id },
      data: { credential: newHash },
    });
    return { success: true };
  }

  // ───────── 私有方法 ─────────

  /** 异步导入用户到 IM（失败不影响登录） */
  private importToIm(userId: string, nickname: string, avatar?: string) {
    this.im.importAccount(userId, nickname, avatar).catch((err) => {
      this.logger.warn(`IM 账号导入失败（不影响功能）: ${err.message}`);
    });
  }

  private async buildLoginResult(userId: string) {
    // 用户角色和会员等级
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, nickname: true, avatar: true, phone: true,
        memberLevel: true, memberExpire: true,
      },
    });
    const roles = await this.prisma.userRole.findMany({
      where: { userId },
      select: { roleType: true, bindId: true },
    });

    return {
      accessToken: this.generateToken(userId),
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
    if (!storedCode) throw new BadRequestException("验证码已过期，请重新发送");
    if (storedCode !== code) throw new BadRequestException("验证码错误");
    // 验证成功后删除已使用的验证码
    await this.redis.del(smsKey);
  }

  private generateSmsCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
