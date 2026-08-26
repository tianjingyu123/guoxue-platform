import { Injectable, Logger } from "@nestjs/common";
import { createHmac } from "crypto";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { tc3Sign, TencentCloudResponse } from "../../common/tc3.util";
import {
  getTencentCredentialMode,
  getTencentInstanceRoleCredentialProvider,
} from "../../common/tencent-instance-role-credentials";

/** 腾讯云点播回调事件数据结构 */
interface VodCallbackEventData {
  FileId?: string;
  Status?: string;
  PlayUrl?: string;
  CoverUrl?: string;
  Duration?: number;
  MediaProcessResultSet?: Array<{
    Type: string;
    TranscodeTask?: { Output?: { Url?: string; Duration?: number } };
    AdaptiveDynamicStreamingTask?: { Output?: { Url?: string } };
    CoverBySnapshotTask?: { Output?: { CoverUrl?: string } };
    SampleSnapshotTask?: { Output?: { ImageUrl?: string } };
  }>;
}

/**
 * 腾讯云点播 VOD API 服务（纯原生API，不依赖SDK）
 * 负责上传签名、播放鉴权、媒资管理、转码/水印、回调处理
 */
@Injectable()
export class VodService {
  private readonly logger = new Logger(VodService.name);
  private readonly secretId: string;
  private readonly secretKey: string;
  private readonly subAppId: string;
  private readonly playKey: string;
  private readonly host = "vod.tencentcloudapi.com";
  private readonly apiVersion = "2018-07-17";

  constructor() {
    this.secretId = process.env.COS_SECRET_ID || process.env.TENCENT_SECRET_ID || "";
    this.secretKey = process.env.COS_SECRET_KEY || process.env.TENCENT_SECRET_KEY || "";
    this.subAppId = process.env.VOD_SUB_APP_ID || "";
    this.playKey = process.env.VOD_PLAY_KEY || "";

    if (getTencentCredentialMode() === "static" && (!this.secretId || !this.secretKey)) {
      this.logger.warn("腾讯云密钥未配置，VOD服务将不可用");
    }
  }

  // ───────── 通用请求签名 ─────────

  /** 调用腾讯云VOD API（v3签名） */
  private async callVodApi(action: string, params: Record<string, unknown> = {}) {
    const credentials = await this.resolveCredentials();
    const scopedParams = { ...params };
    if (this.subAppId && scopedParams.SubAppId === undefined) {
      const subAppId = Number(this.subAppId);
      if (!Number.isSafeInteger(subAppId) || subAppId <= 0) {
        throw new BusinessException(
          ErrorCode.VALIDATION_ERROR,
          "VOD_SUB_APP_ID 必须是正整数",
        );
      }
      // 腾讯云要求访问点播应用资源时显式携带 SubAppId，且该字段参与 TC3 签名。
      scopedParams.SubAppId = subAppId;
    }
    const { host, headers, payloadStr } = tc3Sign({
      secretId: credentials.secretId,
      secretKey: credentials.secretKey,
      securityToken: credentials.securityToken,
      service: "vod",
      action,
      version: this.apiVersion,
      payload: scopedParams,
    });

    const resp = await fetch(`https://${host}`, {
      method: "POST",
      headers,
      body: payloadStr,
      signal: AbortSignal.timeout(10000), // 防腾讯 VOD 无响应挂死请求线程
    });

    const data = await resp.json() as TencentCloudResponse;
    if (data.Response?.Error) {
      this.logger.error(`VOD API错误 [${action}]`, data.Response.Error);
      const code = data.Response.Error.Code || "UnknownError";
      const message = code.includes("UnauthorizedOperation")
        ? `VOD ${action} 权限不足`
        : `VOD ${action} 请求失败（${code}）`;
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, message);
    }
    return data.Response!;
  }

  private async resolveCredentials(): Promise<{
    secretId: string;
    secretKey: string;
    securityToken?: string;
  }> {
    if (getTencentCredentialMode() === "instance-role") {
      const credentials = await getTencentInstanceRoleCredentialProvider().getCredentials();
      return {
        secretId: credentials.TmpSecretId,
        secretKey: credentials.TmpSecretKey,
        securityToken: credentials.SecurityToken,
      };
    }

    if (!this.secretId || !this.secretKey) {
      throw new BusinessException(ErrorCode.THIRD_AI_FAILED, "VOD 静态凭据未配置");
    }
    return { secretId: this.secretId, secretKey: this.secretKey };
  }

  // ───────── 上传签名 ─────────

  /** 生成客户端上传签名（用于Web/小程序直传VOD） */
  genUploadSignature(params: {
    videoName?: string;
    procedure?: string;
    classId?: number;
    expireSeconds?: number;
  } = {}) {
    if (!this.secretId || !this.secretKey) {
      throw new BusinessException(
        ErrorCode.THIRD_AI_FAILED,
        "VOD 客户端上传签名需要受限静态密钥；当前实例角色仅用于服务端 API",
      );
    }
    const currentTimeStamp = Math.floor(Date.now() / 1000);
    const expireTime = currentTimeStamp + (params.expireSeconds || 7200);
    const random = Math.floor(Math.random() * 0xffffffff);

    // 腾讯云 VOD【客户端上传签名】规范（注意：不是云 API 请求签名，两者算法完全不同）
    // 文档：https://cloud.tencent.com/document/product/266/9221
    // ① 字段小写驼峰，按固定顺序明文拼接为 original（value 做 urlencode）
    // ② signatureTmp = HMAC-SHA1(secretKey, original) 的【原始字节】
    // ③ signature = Base64( signatureTmp 字节 ++ original 的 UTF-8 字节 )
    // 之前的实现误用了云 API 签名套路（PascalCase 字段 + 排序 + "POST"+host+"?"+query 的待签串
    // + query&Signature= 格式），腾讯云一律拒绝 → 客户端上传必失败。
    const parts = [
      `secretId=${encodeURIComponent(this.secretId)}`,
      `currentTimeStamp=${currentTimeStamp}`,
      `expireTime=${expireTime}`,
      `random=${random}`,
      // 用户上传签名默认单次有效，缩小签名泄露后的重放窗口。
      "oneTimeValid=1",
    ];
    if (this.subAppId) parts.push(`vodSubAppId=${this.subAppId}`);
    if (params.procedure) parts.push(`procedure=${encodeURIComponent(params.procedure)}`);
    if (params.classId !== undefined) parts.push(`classId=${params.classId}`);
    const original = parts.join("&");

    const signatureTmp = createHmac("sha1", this.secretKey).update(original, "utf8").digest();
    const signature = Buffer.concat([signatureTmp, Buffer.from(original, "utf8")]).toString("base64");

    return { signature, expiredTime: expireTime };
  }

  // ───────── 播放器签名 ─────────

  /**
   * 生成播放器鉴权签名（psign）。
   * 腾讯云播放器签名是使用“默认分发配置-播放密钥”的 HS256 JWT，
   * 不能复用云 API SecretKey、媒资 ContentKey 或直播播放 Key。
   */
  async genPlayerSignature(fileId: string, expireSeconds: number = 3600): Promise<{
    fileId: string;
    psign: string;
    expireTime: number;
  }> {
    const appId = Number(this.subAppId);
    if (!Number.isSafeInteger(appId) || appId <= 0) {
      throw new BusinessException(ErrorCode.VALIDATION_ERROR, "VOD_SUB_APP_ID 必须是正整数");
    }
    if (!this.playKey) {
      throw new BusinessException(
        ErrorCode.THIRD_AI_FAILED,
        "VOD 播放密钥未配置，不能签发播放器签名",
      );
    }
    if (!fileId.trim()) {
      throw new BusinessException(ErrorCode.VALIDATION_ERROR, "VOD FileId 不能为空");
    }
    if (!Number.isInteger(expireSeconds) || expireSeconds < 60 || expireSeconds > 86400) {
      throw new BusinessException(
        ErrorCode.VALIDATION_ERROR,
        "播放器签名有效期必须在 60 到 86400 秒之间",
      );
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const expireTime = currentTime + expireSeconds;
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({
      appId,
      fileId,
      contentInfo: { audioVideoType: "Original" },
      currentTimeStamp: currentTime,
      expireTimeStamp: expireTime,
      urlAccessInfo: { t: expireTime.toString(16) },
    })).toString("base64url");
    const signingInput = `${header}.${payload}`;
    const signature = createHmac("sha256", this.playKey)
      .update(signingInput)
      .digest("base64url");
    const psign = `${signingInput}.${signature}`;

    return { fileId, psign, expireTime: expireTime * 1000 };
  }

  // ───────── URL 拉取上传 ─────────

  /**
   * 从源URL拉取视频上传到VOD（支持批量）
   * @param urls 拉取的源URL列表
   * @param options 可选配置
   */
  async pullUpload(urls: { url: string; fileName?: string }[], options?: {
    mediaName?: string;
    coverUrl?: string;
    procedure?: string;        // 上传后自动执行的任务流
    classId?: number;
    sourceContext?: string;    // 来源上下文（用于回调关联）
  }) {
    if (!urls.length || urls.length > 10) {
      throw new BusinessException(ErrorCode.VALIDATION_ERROR, "VOD 拉取上传每次仅允许 1 到 10 个 URL");
    }
    for (const item of urls) {
      let parsed: URL;
      try {
        parsed = new URL(item.url);
      } catch {
        throw new BusinessException(ErrorCode.VALIDATION_ERROR, "VOD 拉取地址格式无效");
      }
      if (!(["http:", "https:"] as string[]).includes(parsed.protocol)) {
        throw new BusinessException(ErrorCode.VALIDATION_ERROR, "VOD 拉取地址仅支持 HTTP/HTTPS");
      }
    }

    const tasks = await Promise.all(urls.map((item, index) => this.callVodApi("PullUpload", {
      MediaUrl: item.url,
      MediaName: (urls.length === 1 ? options?.mediaName : undefined)
        || item.fileName
        || `pull_${Date.now()}_${index}`,
      CoverUrl: options?.coverUrl,
      Procedure: options?.procedure || "SimpleHlsEncrypt",
      ClassId: options?.classId,
      SourceContext: options?.sourceContext,
    })));
    return tasks.length === 1 ? tasks[0] : { count: tasks.length, tasks };
  }

  // ───────── 媒资管理 ─────────

  /** 获取媒资信息 */
  async getMediaInfo(fileId: string) {
    return this.callVodApi("DescribeMediaInfos", { FileIds: [fileId] });
  }

  /** 修改媒资信息 */
  async modifyMediaInfo(fileId: string, info: { name?: string; description?: string; category?: string; expireTime?: string }) {
    const params: Record<string, unknown> = { FileId: fileId };
    if (info.name) params.Name = info.name;
    if (info.description) params.Description = info.description;
    if (info.category) params.Category = info.category;
    if (info.expireTime) params.ExpireTime = info.expireTime;
    return this.callVodApi("ModifyMediaInfo", params);
  }

  /** 删除媒资 */
  async deleteMedia(fileId: string) {
    return this.callVodApi("DeleteMedia", { FileId: fileId });
  }

  /** 搜索媒资 */
  async searchMedia(params: {
    keyword?: string;
    classIds?: number[];
    sort?: string;
    offset?: number;
    limit?: number;
    streamIds?: string[];
  }) {
    return this.callVodApi("SearchMedia", {
      Text: params.keyword,
      ClassIds: params.classIds,
      StreamIds: params.streamIds,
      Sort: { Field: "CreateTime", Order: "Desc" },
      Offset: params.offset || 0,
      Limit: params.limit || 20,
    });
  }

  // ───────── 转码与水印 ─────────

  /**
   * 发起处理任务（转码 + 截图 + 水印）
   * @param fileId 文件ID
   * @param options 处理选项
   */
  async processMedia(fileId: string, options?: {
    /** 转码模板ID列表（默认 10=LD, 20=SD, 30=HD），传空数组跳过转码 */
    transcodeDefinitions?: number[];
    /** 截图模板ID */
    snapshotDefinition?: number;
    /** 雪碧图模板ID */
    spriteDefinition?: number;
    /** 自适应码流模板ID，传入后自动生成多码率自适应流 */
    adaptiveDynamicStreamingDefinition?: number;
    /** 水印模板ID */
    watermarkDefinition?: number;
    /** 任务优先级 */
    tasksPriority?: number;
  }) {
    const req: Record<string, unknown> = { FileId: fileId };

    const transcodeDefs = options?.transcodeDefinitions ?? [10, 20, 30];
    const mediaProcessTask: Record<string, unknown> = {};

    if (transcodeDefs.length > 0) {
      mediaProcessTask.TranscodeTaskSet = transcodeDefs.map(d => ({
        Definition: d,
        ...(options?.watermarkDefinition
          ? { WatermarkSet: [{ Definition: options.watermarkDefinition }] }
          : {}),
      }));
    }

    if (options?.adaptiveDynamicStreamingDefinition) {
      mediaProcessTask.AdaptiveDynamicStreamingTaskSet = [
        { Definition: options.adaptiveDynamicStreamingDefinition },
      ];
    }

    if (options?.snapshotDefinition || transcodeDefs.length > 0) {
      mediaProcessTask.CoverBySnapshotTaskSet = [
        { Definition: options?.snapshotDefinition || 10 },
      ];
    }

    if (options?.spriteDefinition) {
      mediaProcessTask.SampleSnapshotTaskSet = [
        { Definition: options.spriteDefinition },
      ];
    }

    if (Object.keys(mediaProcessTask).length > 0) {
      req.MediaProcessTask = mediaProcessTask;
    }

    // AiContentReviewTask 是 ProcessMedia 顶层参数，不能嵌套在 MediaProcessTask 内。
    req.AiContentReviewTask = { Definition: 10 };

    if (options?.tasksPriority) {
      req.TasksPriority = options.tasksPriority;
    }

    return this.callVodApi("ProcessMedia", req);
  }

  /**
   * 视频剪辑（从已有视频截取片段生成新视频）
   */
  async clipVideo(params: {
    fileId: string;
    startTimeOffset: number;   // 起始偏移（秒）
    endTimeOffset: number;     // 结束偏移（秒）
    clipName?: string;
    classId?: number;
    procedure?: string;
  }) {
    if (!Number.isFinite(params.startTimeOffset)
      || !Number.isFinite(params.endTimeOffset)
      || params.startTimeOffset < 0
      || params.endTimeOffset <= params.startTimeOffset) {
      throw new BusinessException(
        ErrorCode.VALIDATION_ERROR,
        "视频剪辑结束时间必须大于起始时间，且均为非负数",
      );
    }
    const outputConfig: Record<string, unknown> = {};
    if (params.clipName) outputConfig.MediaName = params.clipName;
    if (params.classId !== undefined) outputConfig.ClassId = params.classId;

    return this.callVodApi("EditMedia", {
      InputType: "File",
      FileInfos: [{
        FileId: params.fileId,
        StartTimeOffset: params.startTimeOffset,
        EndTimeOffset: params.endTimeOffset,
      }],
      ...(params.procedure ? { ProcedureName: params.procedure } : {}),
      ...(Object.keys(outputConfig).length ? { OutputConfig: outputConfig } : {}),
    });
  }

  /**
   * 对URL视频进行即时剪辑
   */
  async clipVideoByUrl(params: {
    url: string;
    startTimeOffset: number;
    endTimeOffset: number;
    clipName?: string;
    procedure?: string;
  }) {
    void params;
    throw new BusinessException(
      ErrorCode.VALIDATION_ERROR,
      "腾讯云 EditMedia 不支持直接按 URL 剪辑，请先拉取上传并取得 FileId",
    );
  }

  // ───────── 播放统计 ─────────

  /**
   * 获取视频播放统计（按天）
   * @param fileId 文件ID
   * @param startDate 开始日期 YYYY-MM-DD
   * @param endDate 结束日期 YYYY-MM-DD
   */
  async getDailyPlayStat(fileId: string, startDate: string, endDate: string) {
    return this.callVodApi("DescribeDailyPlayStatFileList", {
      FileId: fileId,
      StartDate: startDate,
      EndDate: endDate,
    });
  }

  /**
   * 获取播放统计概览（多文件汇总）
   */
  async getPlayStatSummary(startDate: string, endDate: string) {
    return this.callVodApi("DescribeDailyPlayStatFileList", {
      StartDate: startDate,
      EndDate: endDate,
    });
  }

  // ───────── 事件通知与回调 ─────────

  /**
   * 设置事件通知接收URL
   */
  async setEventNotificationUrl(url: string) {
    return this.callVodApi("SetEventNotification", {
      Url: url,
      EventTypes: ["FileUploadComplete", "FileDeleteComplete", "ProcedureStateChanged"],
    });
  }

  /**
   * 拉取回调事件（主动拉取模式）
   */
  async pullEvents() {
    return this.callVodApi("PullEvents", {});
  }

  /**
   * 确认已处理回调事件
   */
  async confirmEvent(msgHandle: string) {
    return this.callVodApi("ConfirmEvents", {
      EventHandles: [msgHandle],
    });
  }

  /** 解析VOD事件通知 */
  parseEventNotification(body: Record<string, unknown>): {
    eventType: string;
    fileId: string;
    status: string;
    playUrl?: string;
    coverUrl?: string;
    duration?: number;
    adaptiveStreamingUrl?: string;
    imageSpriteUrl?: string;
  } | null {
    try {
      const event = body.EventType as string | undefined;
      const data = (
        body.TranscodeCompleteEvent
        || body.ProcedureStateChangeEvent
        || body.NewFileUploadEvent
        || body.FileDeleteCompleteEvent
        || {}
      ) as VodCallbackEventData;

      const transcodeOutput = data.MediaProcessResultSet?.find(
        (r) => r.Type === "Transcode",
      )?.TranscodeTask?.Output;
      const adaptiveOutput = data.MediaProcessResultSet?.find(
        (r) => r.Type === "AdaptiveDynamicStreaming",
      )?.AdaptiveDynamicStreamingTask?.Output;
      const coverOutput = data.MediaProcessResultSet?.find(
        (r) => r.Type === "CoverBySnapshot",
      )?.CoverBySnapshotTask?.Output;
      const spriteOutput = data.MediaProcessResultSet?.find(
        (r) => r.Type === "SampleSnapshot",
      )?.SampleSnapshotTask?.Output;

      return {
        eventType: event as string,
        fileId: (data.FileId || body.FileId) as string,
        status: (data.Status || body.Status) as string,
        playUrl: transcodeOutput?.Url || data.PlayUrl,
        coverUrl: coverOutput?.CoverUrl || data.CoverUrl,
        duration: transcodeOutput?.Duration || data.Duration,
        adaptiveStreamingUrl: adaptiveOutput?.Url,
        imageSpriteUrl: spriteOutput?.ImageUrl,
      };
    } catch (e) {
      this.logger.error("解析VOD回调失败", e);
      return null;
    }
  }
}
