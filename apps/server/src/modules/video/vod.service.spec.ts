import { VodService } from './vod.service';
import { Logger } from '@nestjs/common';
import { createHmac } from 'crypto';

const ORIGINAL_ENV = process.env;

describe('VodService', () => {
  let service: VodService;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    process.env.COS_SECRET_ID = 'test-secret-id';
    process.env.COS_SECRET_KEY = 'test-secret-key';
    process.env.VOD_SUB_APP_ID = '1500012345';
    process.env.VOD_PLAY_KEY = 'test-vod-play-key';

    // Jest node 环境中 global.fetch 不存在属性，直接赋值 mock
    (global as any).fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({ Response: { RequestId: 'mock-rid' } }),
      status: 200,
    } as any);
    mockFetch = (global as any).fetch;

    service = new VodService();
  });

  afterEach(() => {
    delete (global as any).fetch;
    jest.restoreAllMocks();
    process.env = ORIGINAL_ENV;
  });

  /** 提取 fetch 调用参数验证 */
  function getFetchCall(index = 0) {
    const [url, init] = mockFetch.mock.calls[index] as [string, any];
    return {
      url,
      action: init.headers['X-TC-Action'] as string,
      body: JSON.parse(init.body as string),
    };
  }

  // ── 1. 构造函数 ──────────────────────────────────────────────
  describe('constructor', () => {
    it('应从环境变量读取密钥', () => {
      expect((service as any).secretId).toBe('test-secret-id');
      expect((service as any).secretKey).toBe('test-secret-key');
      expect((service as any).subAppId).toBe('1500012345');
    });

    it('COS_ 为空时应回退到 TENCENT_SECRET_ID/KEY', () => {
      process.env = { ...ORIGINAL_ENV };
      process.env.TENCENT_SECRET_ID = 'tencent-id';
      process.env.TENCENT_SECRET_KEY = 'tencent-key';
      process.env.VOD_SUB_APP_ID = '1500012345';
      const svc = new VodService();
      expect((svc as any).secretId).toBe('tencent-id');
      expect((svc as any).secretKey).toBe('tencent-key');
    });

    it('密钥未配置时应发出 warn 日志', () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
      process.env = { ...ORIGINAL_ENV };
      const svc = new VodService();
      expect(warnSpy).toHaveBeenCalledWith('腾讯云密钥未配置，VOD服务将不可用');
    });
  });

  // ── 2. 上传签名 genUploadSignature ──────────────────────────
  // 注：2026-07-08 修复「VOD 签名真 bug」后已是 UGC 客户端上传签名（base64(hmac+原文)·小写参数），
  // 断言按解码后的原文校验（原云 API 大写参数断言随修复作废）。
  const decodeSignature = (sig: string) => Buffer.from(sig, 'base64').toString('utf8');

  describe('genUploadSignature', () => {
    it('应生成基本签名，包含 secretId / currentTimeStamp / expireTime / random / vodSubAppId', () => {
      const result = service.genUploadSignature();
      const decoded = decodeSignature(result.signature);
      expect(decoded).toContain('secretId=test-secret-id');
      expect(decoded).toContain('currentTimeStamp=');
      expect(decoded).toContain('expireTime=');
      expect(decoded).toContain('random=');
      expect(decoded).toContain('oneTimeValid=1');
      expect(decoded).toContain('vodSubAppId=1500012345');
      expect(result.expiredTime).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('procedure 参数应出现在签名字符串中', () => {
      const result = service.genUploadSignature({ procedure: 'MyProcedure' });
      expect(decodeSignature(result.signature)).toContain('procedure=MyProcedure');
    });

    it('classId 参数应出现在签名字符串中', () => {
      const result = service.genUploadSignature({ classId: 42 });
      expect(decodeSignature(result.signature)).toContain('classId=42');
    });

    it('subAppId 为空时应不包含 VodSubAppId', () => {
      process.env = { ...ORIGINAL_ENV };
      process.env.COS_SECRET_ID = 'test-id';
      process.env.COS_SECRET_KEY = 'test-key';
      const svc = new VodService();
      const result = svc.genUploadSignature();
      expect(result.signature).not.toContain('VodSubAppId=');
    });

    it('应服从 expireSeconds 参数', () => {
      const t = Math.floor(Date.now() / 1000);
      const result = service.genUploadSignature({ expireSeconds: 3600 });
      expect(result.expiredTime).toBe(t + 3600);
    });
  });

  // ── 3. 播放器签名 genPlayerSignature ─────────────────────────
  describe('genPlayerSignature', () => {
    it('应使用独立播放密钥生成符合腾讯云规范的 HS256 JWT', async () => {
      const result = await service.genPlayerSignature('file-123', 3600);
      expect(result.fileId).toBe('file-123');
      const [header, payload, signature] = result.psign.split('.');
      expect(JSON.parse(Buffer.from(header, 'base64url').toString('utf8'))).toEqual({
        alg: 'HS256',
        typ: 'JWT',
      });
      expect(JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))).toEqual(expect.objectContaining({
        appId: 1500012345,
        fileId: 'file-123',
        contentInfo: { audioVideoType: 'Original' },
        currentTimeStamp: expect.any(Number),
        expireTimeStamp: expect.any(Number),
        urlAccessInfo: { t: expect.any(String) },
      }));
      expect(signature).toBe(
        createHmac('sha256', 'test-vod-play-key').update(`${header}.${payload}`).digest('base64url'),
      );
      expect(result.expireTime).toBeGreaterThan(Date.now());
      expect(result.expireTime).toBeLessThan(Date.now() + 4000 * 1000);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('缺少独立播放密钥时拒绝签发，禁止使用云 API 密钥降级', async () => {
      delete process.env.VOD_PLAY_KEY;
      const svc = new VodService();
      await expect(svc.genPlayerSignature('file-123')).rejects.toThrow('VOD 播放密钥未配置');
    });

    it('应返回 { fileId, psign, expireTime } 结构', async () => {
      const result = await service.genPlayerSignature('file-123');
      expect(result).toEqual({
        fileId: 'file-123',
        psign: expect.any(String),
        expireTime: expect.any(Number),
      });
    });

    it('拒绝超出安全窗口的有效期', async () => {
      await expect(service.genPlayerSignature('file-123', 59)).rejects.toThrow('60 到 86400 秒');
      await expect(service.genPlayerSignature('file-123', 86401)).rejects.toThrow('60 到 86400 秒');
    });
  });

  // ── 4. getMediaInfo ─────────────────────────────────────────
  describe('getMediaInfo', () => {
    it('应成功返回媒资信息', async () => {
      const data = await service.getMediaInfo('file-123');
      expect(data).toEqual({ RequestId: 'mock-rid' });
      const call = getFetchCall();
      expect(call.action).toBe('DescribeMediaInfos');
      expect(call.body).toEqual({ FileIds: ['file-123'], SubAppId: 1500012345 });
    });

    it('API 错误时应抛出异常', async () => {
      mockFetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue({
          Response: { Error: { Code: 'ResourceNotFound', Message: '媒体不存在' } },
        }),
        status: 200,
      } as any);

      await expect(service.getMediaInfo('bad-id')).rejects.toThrow(
        'VOD DescribeMediaInfos 请求失败（ResourceNotFound）',
      );
    });
  });

  // ── 5. pullUpload ───────────────────────────────────────────
  describe('pullUpload', () => {
    it('应拉取单 URL', async () => {
      await service.pullUpload(
        [{ url: 'https://example.com/video.mp4', fileName: 'test.mp4' }],
        { mediaName: '我的视频' },
      );
      const call = getFetchCall();
      expect(call.action).toBe('PullUpload');
      expect(call.body.MediaUrl).toBe('https://example.com/video.mp4');
      expect(call.body.MediaName).toBe('我的视频');
      expect(call.body.Procedure).toBe('SimpleHlsEncrypt');
      expect(call.body.ExtInfo).toBeUndefined();
    });

    it('URL 超过 1 个时应为每个媒资创建独立 PullUpload 任务', async () => {
      const result = await service.pullUpload([
        { url: 'https://example.com/v1.mp4', fileName: 'v1.mp4' },
        { url: 'https://example.com/v2.mp4', fileName: 'v2.mp4' },
      ]);
      expect(result).toEqual({
        count: 2,
        tasks: [{ RequestId: 'mock-rid' }, { RequestId: 'mock-rid' }],
      });
      expect(mockFetch).toHaveBeenCalledTimes(2);
      const first = getFetchCall(0);
      const second = getFetchCall(1);
      expect(first.action).toBe('PullUpload');
      expect(first.body).toMatchObject({
        MediaUrl: 'https://example.com/v1.mp4',
        MediaName: 'v1.mp4',
        SubAppId: 1500012345,
      });
      expect(second.body).toMatchObject({
        MediaUrl: 'https://example.com/v2.mp4',
        MediaName: 'v2.mp4',
        SubAppId: 1500012345,
      });
      expect(first.body).not.toHaveProperty('ExtInfo');
      expect(second.body).not.toHaveProperty('ExtInfo');
    });

    it('拒绝非 HTTP/HTTPS 拉取地址', async () => {
      await expect(service.pullUpload([{ url: 'file:///etc/passwd' }]))
        .rejects.toThrow('仅支持 HTTP/HTTPS');
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // ── 6. modifyMediaInfo ──────────────────────────────────────
  describe('modifyMediaInfo', () => {
    it('应修改名称和描述', async () => {
      await service.modifyMediaInfo('file-123', {
        name: '新名称',
        description: '新描述',
      });
      const call = getFetchCall();
      expect(call.action).toBe('ModifyMediaInfo');
      expect(call.body).toEqual({
        FileId: 'file-123',
        Name: '新名称',
        Description: '新描述',
        SubAppId: 1500012345,
      });
    });
  });

  // ── 7. deleteMedia ──────────────────────────────────────────
  describe('deleteMedia', () => {
    it('应删除指定媒资', async () => {
      await service.deleteMedia('file-123');
      const call = getFetchCall();
      expect(call.action).toBe('DeleteMedia');
      expect(call.body).toEqual({ FileId: 'file-123', SubAppId: 1500012345 });
    });
  });

  // ── 8. searchMedia ──────────────────────────────────────────
  describe('searchMedia', () => {
    it('应携带关键字、分页及排序参数', async () => {
      await service.searchMedia({ keyword: '测试', offset: 10, limit: 5 });
      const call = getFetchCall();
      expect(call.action).toBe('SearchMedia');
      expect(call.body).toMatchObject({
        Text: '测试',
        Sort: { Field: 'CreateTime', Order: 'Desc' },
        Offset: 10,
        Limit: 5,
        SubAppId: 1500012345,
      });
    });

    it('未传 offset/limit 时应使用默认值 0/20', async () => {
      await service.searchMedia({});
      const call = getFetchCall();
      expect(call.body.Offset).toBe(0);
      expect(call.body.Limit).toBe(20);
    });
  });

  // ── 9. processMedia ─────────────────────────────────────────
  describe('processMedia', () => {
    it('无参数时应使用默认转码模板 [10,20,30] 并生成截图', async () => {
      await service.processMedia('file-123');
      const call = getFetchCall();
      expect(call.action).toBe('ProcessMedia');
      expect(call.body.MediaProcessTask.TranscodeTaskSet).toEqual([
        { Definition: 10 },
        { Definition: 20 },
        { Definition: 30 },
      ]);
      expect(call.body.MediaProcessTask.CoverBySnapshotTaskSet).toEqual([
        { Definition: 10 },
      ]);
      expect(call.body.AiContentReviewTask).toEqual({ Definition: 10 });
    });

    it('应使用自定义转码模板', async () => {
      await service.processMedia('file-123', { transcodeDefinitions: [100, 200] });
      const call = getFetchCall();
      expect(call.body.MediaProcessTask.TranscodeTaskSet).toEqual([
        { Definition: 100 },
        { Definition: 200 },
      ]);
    });

    it('应包含自适应码流配置', async () => {
      await service.processMedia('file-123', {
        adaptiveDynamicStreamingDefinition: 10,
      });
      const call = getFetchCall();
      expect(
        call.body.MediaProcessTask.AdaptiveDynamicStreamingTaskSet,
      ).toEqual([{ Definition: 10 }]);
    });

    it('应使用自定义截图模板', async () => {
      await service.processMedia('file-123', { snapshotDefinition: 20 });
      const call = getFetchCall();
      expect(call.body.MediaProcessTask.CoverBySnapshotTaskSet).toEqual([
        { Definition: 20 },
      ]);
    });

    it('应包含雪碧图模板', async () => {
      await service.processMedia('file-123', { spriteDefinition: 10 });
      const call = getFetchCall();
      expect(call.body.MediaProcessTask.SampleSnapshotTaskSet).toEqual([
        { Definition: 10 },
      ]);
    });

    it('水印应附着到每个转码任务而不是静默丢弃', async () => {
      await service.processMedia('file-123', {
        transcodeDefinitions: [20, 30],
        watermarkDefinition: 15780,
      });
      const call = getFetchCall();
      expect(call.body.MediaProcessTask.TranscodeTaskSet).toEqual([
        { Definition: 20, WatermarkSet: [{ Definition: 15780 }] },
        { Definition: 30, WatermarkSet: [{ Definition: 15780 }] },
      ]);
      expect(call.body.AiContentReviewTask).toEqual({ Definition: 10 });
    });
  });

  // ── 10. clipVideo / clipVideoByUrl ──────────────────────────
  describe('clipVideo / clipVideoByUrl', () => {
    it('clipVideo 应按 FileId 剪辑', async () => {
      await service.clipVideo({
        fileId: 'file-123',
        startTimeOffset: 10,
        endTimeOffset: 60,
        clipName: '片段',
      });
      const call = getFetchCall();
      expect(call.action).toBe('EditMedia');
      expect(call.body).toMatchObject({
        InputType: 'File',
        FileInfos: [{
          FileId: 'file-123',
          StartTimeOffset: 10,
          EndTimeOffset: 60,
        }],
        OutputConfig: { MediaName: '片段' },
        SubAppId: 1500012345,
      });
    });

    it('clipVideoByUrl 应拒绝生成腾讯云不支持的伪 ClipMedia 请求', async () => {
      await expect(service.clipVideoByUrl({
        url: 'https://example.com/video.mp4',
        startTimeOffset: 5,
        endTimeOffset: 30,
        clipName: 'url片段',
      })).rejects.toThrow('请先拉取上传并取得 FileId');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('拒绝结束时间不大于起始时间的剪辑请求', async () => {
      await expect(service.clipVideo({
        fileId: 'file-123',
        startTimeOffset: 30,
        endTimeOffset: 30,
      })).rejects.toThrow('结束时间必须大于起始时间');
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // ── 11. getDailyPlayStat / getPlayStatSummary ────────────────
  describe('getDailyPlayStat / getPlayStatSummary', () => {
    it('getDailyPlayStat 应传入 FileId', async () => {
      await service.getDailyPlayStat('file-123', '2026-05-01', '2026-05-10');
      const call = getFetchCall();
      expect(call.action).toBe('DescribeDailyPlayStatFileList');
      expect(call.body).toMatchObject({
        FileId: 'file-123',
        StartDate: '2026-05-01',
        EndDate: '2026-05-10',
      });
    });

    it('getPlayStatSummary 不应传 FileId', async () => {
      await service.getPlayStatSummary('2026-05-01', '2026-05-10');
      const call = getFetchCall();
      expect(call.action).toBe('DescribeDailyPlayStatFileList');
      expect(call.body).not.toHaveProperty('FileId');
      expect(call.body).toMatchObject({
        StartDate: '2026-05-01',
        EndDate: '2026-05-10',
      });
    });
  });

  // ── 12. 事件通知与回调 ──────────────────────────────────────
  describe('setEventNotificationUrl / pullEvents / confirmEvent', () => {
    it('setEventNotificationUrl 应设置 URL 和事件类型', async () => {
      await service.setEventNotificationUrl('https://api.example.com/callback');
      const call = getFetchCall();
      expect(call.action).toBe('SetEventNotification');
      expect(call.body).toMatchObject({
        Url: 'https://api.example.com/callback',
        EventTypes: [
          'FileUploadComplete',
          'FileDeleteComplete',
          'ProcedureStateChanged',
        ],
      });
    });

    it('pullEvents 应拉取待处理事件', async () => {
      await service.pullEvents();
      const call = getFetchCall();
      expect(call.action).toBe('PullEvents');
      expect(call.body).toEqual({ SubAppId: 1500012345 });
    });

    it('confirmEvent 应确认事件处理完成', async () => {
      await service.confirmEvent('handle-001');
      const call = getFetchCall();
      expect(call.action).toBe('ConfirmEvents');
      expect(call.body).toEqual({ EventHandles: ['handle-001'], SubAppId: 1500012345 });
    });
  });

  // ── 13. parseEventNotification ──────────────────────────────
  describe('parseEventNotification', () => {
    it('应解析 TranscodeComplete 事件', () => {
      const body = {
        EventType: 'TranscodeComplete',
        TranscodeCompleteEvent: {
          FileId: 'file-001',
          Status: 'SUCCESS',
          MediaProcessResultSet: [
            {
              Type: 'Transcode',
              TranscodeTask: {
                Output: { Url: 'https://cdn.example.com/play.mp4', Duration: 120 },
              },
            },
          ],
        },
      };
      const result = service.parseEventNotification(body);
      expect(result).toEqual({
        eventType: 'TranscodeComplete',
        fileId: 'file-001',
        status: 'SUCCESS',
        playUrl: 'https://cdn.example.com/play.mp4',
        coverUrl: undefined,
        duration: 120,
        adaptiveStreamingUrl: undefined,
        imageSpriteUrl: undefined,
      });
    });

    it('应解析 ProcedureStateChange 事件（含自适应流 / 截图 / 雪碧图）', () => {
      const body = {
        EventType: 'ProcedureStateChanged',
        ProcedureStateChangeEvent: {
          FileId: 'file-002',
          Status: 'PROCESSING',
          MediaProcessResultSet: [
            {
              Type: 'Transcode',
              TranscodeTask: {
                Output: { Url: 'https://cdn.example.com/play.mp4', Duration: 180 },
              },
            },
            {
              Type: 'AdaptiveDynamicStreaming',
              AdaptiveDynamicStreamingTask: {
                Output: { Url: 'https://cdn.example.com/adaptive.m3u8' },
              },
            },
            {
              Type: 'CoverBySnapshot',
              CoverBySnapshotTask: {
                Output: { CoverUrl: 'https://cdn.example.com/cover.jpg' },
              },
            },
            {
              Type: 'SampleSnapshot',
              SampleSnapshotTask: {
                Output: { ImageUrl: 'https://cdn.example.com/sprites.jpg' },
              },
            },
          ],
        },
      };
      const result = service.parseEventNotification(body);
      expect(result).toEqual({
        eventType: 'ProcedureStateChanged',
        fileId: 'file-002',
        status: 'PROCESSING',
        playUrl: 'https://cdn.example.com/play.mp4',
        coverUrl: 'https://cdn.example.com/cover.jpg',
        duration: 180,
        adaptiveStreamingUrl: 'https://cdn.example.com/adaptive.m3u8',
        imageSpriteUrl: 'https://cdn.example.com/sprites.jpg',
      });
    });

    it('应解析 NewFileUpload 事件', () => {
      const body = {
        EventType: 'NewFileUpload',
        NewFileUploadEvent: {
          FileId: 'file-003',
          Status: 'SUCCESS',
          PlayUrl: 'https://cdn.example.com/play.mp4',
          CoverUrl: 'https://cdn.example.com/cover.jpg',
          Duration: 300,
        },
      };
      const result = service.parseEventNotification(body);
      expect(result).toEqual({
        eventType: 'NewFileUpload',
        fileId: 'file-003',
        status: 'SUCCESS',
        playUrl: 'https://cdn.example.com/play.mp4',
        coverUrl: 'https://cdn.example.com/cover.jpg',
        duration: 300,
        adaptiveStreamingUrl: undefined,
        imageSpriteUrl: undefined,
      });
    });

    it('应解析 FileDeleteComplete 事件', () => {
      const body = {
        EventType: 'FileDeleteComplete',
        FileDeleteCompleteEvent: {
          FileId: 'file-004',
          Status: 'SUCCESS',
        },
      };
      const result = service.parseEventNotification(body);
      expect(result).toEqual({
        eventType: 'FileDeleteComplete',
        fileId: 'file-004',
        status: 'SUCCESS',
        playUrl: undefined,
        coverUrl: undefined,
        duration: undefined,
        adaptiveStreamingUrl: undefined,
        imageSpriteUrl: undefined,
      });
    });

    it('非法入参（null）应返回 null', () => {
      const result = service.parseEventNotification(null as unknown as Record<string, unknown>);
      expect(result).toBeNull();
    });
  });

  // ── 14. 通用 callVodApi 错误处理 ────────────────────────────
  describe('callVodApi error handling', () => {
    it('pullUpload API 错误时应抛出异常', async () => {
      mockFetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue({
          Response: {
            Error: { Code: 'InvalidParameterValue', Message: 'URL不合法' },
          },
        }),
        status: 200,
      } as any);
      await expect(
        service.pullUpload([{ url: 'https://bad.example/video.mp4' }]),
      ).rejects.toThrow('VOD PullUpload 请求失败（InvalidParameterValue）');
    });

    it('processMedia API 错误时应抛出异常', async () => {
      mockFetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue({
          Response: {
            Error: { Code: 'ResourceNotFound', Message: '文件不存在' },
          },
        }),
        status: 200,
      } as any);
      await expect(
        service.processMedia('not-exist'),
      ).rejects.toThrow('VOD ProcessMedia 请求失败（ResourceNotFound）');
    });
  });
});
