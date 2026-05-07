import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../../prisma/prisma.service";
import { RegisterDto, LoginDto } from "./auth.dto";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          dto.phone ? { phone: dto.phone } : {},
          dto.email ? { email: dto.email } : {},
        ].filter((c) => Object.keys(c).length > 0),
      },
    });
    if (existing) {
      throw new ConflictException("手机号或邮箱已被注册");
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        nickname: dto.nickname,
        phone: dto.phone,
        email: dto.email,
        auths: {
          create: { provider: "PASSWORD", passwordHash },
        },
      },
    });

    return { id: user.id, nickname: user.nickname };
  }

  async login(dto: LoginDto) {
    const auth = await this.prisma.auth.findFirst({
      where: {
        provider: "PASSWORD",
        user: {
          OR: [{ phone: dto.account }, { email: dto.account }],
        },
      },
      include: { user: true },
    });
    if (!auth || !auth.passwordHash) {
      throw new UnauthorizedException("账号或密码错误");
    }

    const valid = await bcrypt.compare(dto.password, auth.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("账号或密码错误");
    }

    const token = this.jwt.sign({ sub: auth.user.id });
    return {
      accessToken: token,
      user: {
        id: auth.user.id,
        nickname: auth.user.nickname,
        avatar: auth.user.avatar,
        role: auth.user.role,
      },
    };
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nickname: true,
        avatar: true,
        phone: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
  }
}
