import { INestApplication, Injectable } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PassportModule, PassportStrategy } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { ExtractJwt, Strategy } from 'passport-jwt';
import request from 'supertest';
import { PaipanController } from '../src/modules/paipan/paipan.controller';
import { PaipanService } from '../src/modules/paipan/paipan.service';
import { PaipanAiService } from '../src/modules/paipan/paipan-ai.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { NativePaipanGuard, PaipanRuntimeService } from '../src/common/paipan-runtime.service';
import { StrictRedisThrottleGuard } from '../src/common/redis-throttle.guard';

// 本地合成身份；真实HTTP/JWT/整套守卫，数据库、计算和限流使用替身。
const secret = 'local-suite-cache-test-only';
@Injectable()
class LocalStrategy extends PassportStrategy(Strategy) {
  constructor() { super({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), secretOrKey: secret }); }
  validate(payload: { sub: string; roles: string[] }) { return { id: payload.sub, roles: payload.roles }; }
}

describe('整套排盘真实HTTP缓存边界', () => {
  let app: INestApplication;
  const prisma = { $queryRaw: jest.fn() };
  const service = { calcBaziPreview: jest.fn().mockResolvedValue({ result: 'synthetic' }) };
  const jwt = new JwtService({ secret });
  const token = jwt.sign({ sub: 'local-consumer', roles: ['CONSUMER'] });
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [PassportModule], controllers: [PaipanController],
      providers: [LocalStrategy, NativePaipanGuard, PaipanRuntimeService,
        { provide: PrismaService, useValue: prisma }, { provide: PaipanService, useValue: service },
        { provide: PaipanAiService, useValue: {} }],
    }).overrideGuard(StrictRedisThrottleGuard).useValue({ canActivate: () => true }).compile();
    app = module.createNestApplication({ logger: false }); await app.init();
  });
  afterAll(async () => { await app?.close(); });
  beforeEach(() => { jest.clearAllMocks(); });

  it('主库允许普通账号后返回结果，方法头不得覆盖为公共缓存', async () => {
    prisma.$queryRaw.mockResolvedValue([{ allowed: true }]);
    await request(app.getHttpServer()).post('/paipan/bazi/preview')
      .set('Authorization', `Bearer ${token}`).send({}).expect(201)
      .expect('Cache-Control', 'private, no-store');
    expect(service.calcBaziPreview).toHaveBeenCalledTimes(1);
    // 普通账号无管理员预览资格，是否开放由整套模式主库查询决定。
    expect(prisma.$queryRaw.mock.calls[0]).toContain(false);
  });

  it('同一账号下一次被主库拒绝后不进入计算，404同样禁止共享缓存', async () => {
    prisma.$queryRaw.mockResolvedValue([{ allowed: true }]);
    await request(app.getHttpServer()).post('/paipan/bazi/preview')
      .set('Authorization', `Bearer ${token}`).send({}).expect(201);
    service.calcBaziPreview.mockClear();
    prisma.$queryRaw.mockResolvedValue([{ allowed: false }]);
    await request(app.getHttpServer()).post('/paipan/bazi/preview')
      .set('Authorization', `Bearer ${token}`).send({}).expect(404)
      .expect('Cache-Control', 'private, no-store');
    expect(service.calcBaziPreview).not.toHaveBeenCalled();
  });

  it('未登录不得进入计算，也不能缓存拒绝响应', async () => {
    await request(app.getHttpServer()).post('/paipan/bazi/preview').send({}).expect(404)
      .expect('Cache-Control', 'private, no-store');
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(service.calcBaziPreview).not.toHaveBeenCalled();
  });
});
