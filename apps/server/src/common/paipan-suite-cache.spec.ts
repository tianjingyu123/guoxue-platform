import { HEADERS_METADATA, GUARDS_METADATA } from '@nestjs/common/constants';
import { PaipanController } from '../modules/paipan/paipan.controller';
import { NativePaipanGuard } from './paipan-runtime.service';

describe('整套排盘权限与响应缓存一致', () => {
  it('控制器使用统一整套门禁，方法不能覆盖为公开缓存', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, PaipanController)).toContain(NativePaipanGuard);
    let checked = 0;
    for (const name of Object.getOwnPropertyNames(PaipanController.prototype)) {
      const handler = PaipanController.prototype[name as keyof PaipanController];
      if (typeof handler !== 'function') continue;
      const headers = Reflect.getMetadata(HEADERS_METADATA, handler) || [];
      for (const header of headers) {
        if (header.name.toLowerCase() !== 'cache-control') continue;
        checked++;
        expect({ method: name, cache: header.value }).toEqual({ method: name, cache: 'private, no-store' });
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});
