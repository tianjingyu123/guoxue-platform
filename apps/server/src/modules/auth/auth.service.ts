import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
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
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private redis: RedisService,
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
    // TODO: 对接微信OAuth，用code换取openId
    // const { openid, unionid } = await this.exchangeWechatCode(dto.code);
    throw new BadRequestException("微信登录暂未开放");
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
