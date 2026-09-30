import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { AUDITABLE_KEY } from './audit.decorator';
import { AuditInterceptor } from './audit.interceptor';
import { FeedbackController } from '../modules/user/feedback.controller';

jest.mock('../modules/audit/audit.service', () => ({ AuditService: class {} }));

describe('敏感明文必须先完成审计', () => {
  function setup(required = true) {
    const handler = () => undefined;
    Reflect.defineMetadata(AUDITABLE_KEY, { action: '查看反馈联系方式', targetType: 'FEEDBACK', requireSuccess: required }, handler);
    const context = { getHandler: () => handler, switchToHttp: () => ({ getRequest: () => ({
      method: 'POST', user: { id: 'operator' }, params: { id: 'feedback' }, ip: '127.0.0.1',
      originalUrl: '/api/v1/users/admin/feedback/feedback/reveal-contact?unused=private', body: { unused: 'private' },
    }) }) } as unknown as ExecutionContext;
    const audit = { log: jest.fn().mockResolvedValue({ id: 'audit' }) };
    const interceptor = new AuditInterceptor(audit as any);
    const payload = { contact: '合成明文，仅用于测试' };
    const next: CallHandler = { handle: () => of(payload) };
    return { audit, interceptor, context, payload, next };
  }

  it('联系方式、正文和截图三个真实控制器入口均要求审计成功', () => {
    for (const method of ['adminRevealContact', 'adminRevealContent', 'adminRevealImages'] as const) {
      expect(Reflect.getMetadata(AUDITABLE_KEY, FeedbackController.prototype[method])).toMatchObject({ requireSuccess: true });
    }
  });

  it('审计失败时拒绝明文响应，错误不包含明文或底层数据库错误', async () => {
    const { audit, interceptor, context, next, payload } = setup();
    audit.log.mockRejectedValueOnce(new Error('合成数据库错误，不能写进用户响应'));
    const received: unknown[] = [];
    const failure = await new Promise<any>((resolve) => interceptor.intercept(context, next).subscribe({
      next: (value) => received.push(value), error: resolve,
    }));
    expect(failure.getStatus()).toBe(503);
    expect(JSON.stringify(failure.getResponse())).not.toContain(payload.contact);
    expect(JSON.stringify(failure.getResponse())).not.toContain('合成数据库错误');
    expect(received).toEqual([]);
  });

  it('审计未落库前不发明文，落库后返回原结果且审计不存明文', async () => {
    const { audit, interceptor, context, next, payload } = setup();
    let finish!: (value: any) => void;
    audit.log.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const received: unknown[] = [];
    const result = lastValueFrom(interceptor.intercept(context, next).pipe());
    result.then((value) => received.push(value));
    await Promise.resolve();
    expect(received).toEqual([]);
    finish({ id: 'audit' });
    await expect(result).resolves.toEqual(payload);
    expect(JSON.stringify(audit.log.mock.calls)).not.toContain(payload.contact);
    expect(JSON.stringify(audit.log.mock.calls)).not.toContain('private');
  });

  it('业务入口失败不记录成功查看', async () => {
    const { audit, interceptor, context } = setup();
    await expect(lastValueFrom(interceptor.intercept(context, { handle: () => throwError(() => new Error('原业务失败')) })))
      .rejects.toThrow('原业务失败');
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('普通业务仍保持审计失败不阻断主事务的原约定', async () => {
    const { audit, interceptor, context, next, payload } = setup(false);
    audit.log.mockRejectedValueOnce(new Error('普通异步审计失败'));
    await expect(lastValueFrom(interceptor.intercept(context, next))).resolves.toEqual(payload);
  });
});
