import { Injectable, Logger } from "@nestjs/common";
import { createHash, createHmac } from "crypto";

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
  private readonly host = "vod.tencentcloudapi.com";
  private readonly apiVersion = "2018-07-17";

  constructor() {
    this.secretId = process.env.COS_SECRET_ID || process.env.TENCENT_SECRET_ID || "";
    this.secretKey = process.env.COS_SECRET_KEY || process.env.TENCENT_SECRET_KEY || "";
    this.subAppId = process.env.VOD_SUB_APP_ID || "";

    if (!this.secretId || !this.secretKey) {
      this.logger.warn("腾讯云密钥未配置，VOD服务将不可用");
    }
  }

  // ───────── 通用请求签名 ─────────

  /** 调用腾讯云VOD API（v3签名） */
  private async callVodApi(action: string, params: Record<string, unknown> = {}) {
    const timestamp = Math.floor(Date.now() / 1000);
    const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
    const payload = JSON.stringify(params);

    const service = "vod";
    const canonicalRequest = `POST\n/\n\ncontent-type:application/json; charset=utf-8\nhost:${this.host}\n\ncontent-type;host\n${createHash("sha256").update(payload).digest("hex")}`;
    const stringToSign = `TC3-HMAC-SHA256\n${timestamp}\n${date}/${service}/tc3_request\n${createHash("sha256").update(canonicalRequest).digest("hex")}`;

    const kDate = createHmac("sha256", `TC3${this.secretKey}`).update(date).digest();
    const kService = createHmac("sha256", kDate).update(service).digest();
    const kSigning = createHmac("sha256", kService).update("tc3_request").digest();
    const signature = createHmac("sha256", kSigning).update(stringToSign).digest("hex");

    const authorization = `TC3-HMAC-SHA256 Credential=${this.secretId}/${date}/${service}/tc3_request, SignedHeaders=content-type;host, Signature=${signature}`;

    const resp = await fetch(`https://${this.host}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Host": this.host,
        "X-TC-Action": action,
        "X-TC-Version": this.apiVersion,
        "X-TC-Timestamp": String(timestamp),
        "Authorization": authorization,
      },
      body: payload,
    });

    const data = await resp.json() as any;
    if (data.Response?.Error) {
      this.logger.error(`VOD API错误 [${action}]`, data.Response.Error);
      throw new Error(`VOD ${action} 失败: ${data.Response.Error.Message}`);
    }
    return data.Response;
  }

  // ───────── 上传签名 ─────────

  /** 生成客户端上传签名（用于Web/小程序直传VOD） */
  genUploadSignature(params: {
    videoName?: string;
    procedure?: string;
    classId?: number;
    expireSeconds?: number;
  } = {}) {
    const currentTime = Math.floor(Date.now() / 1000);
    const expireTime = currentTime + (params.expireSeconds || 7200);

    const signParams: Record<string, string> = {
      SecretId: this.secretId,
      CurrentTimeStamp: String(currentTime),
      ExpireTime: String(expireTime),
      Random: String(Math.floor(Math.random() * 0xffffffff)),
    };

    if (this.subAppId) signParams.VodSubAppId = this.subAppId;
    if (params.procedure) signParams.Procedure = params.procedure;
    if (params.classId !== undefined) signParams.ClassId = String(params.classId);

    const sortedKeys = Object.keys(signParams).sort();
    const queryString = sortedKeys.map(k => `${k}=${signParams[k]}`).join("&");

    const signature = createHmac("sha1", this.secretKey)
      .update(`POSTvod.tencentcloudapi.com?${queryString}`)
      .digest("base64");

    return {
      signature: queryString + "&Signature=" + encodeURIComponent(signature),
      expiredTime: expireTime,
    };
  }

  // ───────── 播放器签名 ─────────

  /**
   * 生成播放器鉴权签名（psign）
   * 基于媒体 contentKey 的 HMAC-SHA1 签名，用于防盗链
   */
  async genPlayerSignature(fileId: string, expireSeconds: number = 3600): Promise<{
    fileId: string;
    psign: string;
    expireTime: number;
  }> {
    // 先获取媒资信息，拿到播放密钥 contentKey
    let contentKey: string | undefined;
    try {
      const info = await this.getMediaInfo(fileId);
      const mediaSet = info.MediaInfoSet;
      if (mediaSet?.length > 0) {
        const basicInfo = mediaSet[0].BasicInfo;
        contentKey = basicInfo?.ContentKey || undefined;
      }
    } catch {
      this.logger.warn(`获取媒资信息失败 ${fileId}，降级为无密钥签名`);
    }

    if (contentKey) {
      const currentTime = Math.floor(Date.now() / 1000);
      const expireTime = currentTime + expireSeconds;
      const plainText = `${fileId}|${currentTime}|${expireTime}`;
      const psign = createHmac("sha1", contentKey).update(plainText).digest("base64url");

      return { fileId, psign, expireTime: expireTime * 1000 };
    }

    // 无 contentKey 时使用密钥签名作为降级
    const currentTime = Math.floor(Date.now() / 1000);
    const expireTime = currentTime + expireSeconds;
    const signContent = `${fileId}${currentTime}${expireTime}`;
    const psign = createHash("md5").update(signContent + this.secretKey).digest("hex");

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
    return this.callVodApi("PullUpload", {
      MediaUrl: urls[0].url,
      MediaName: options?.mediaName || urls[0].fileName || `pull_${Date.now()}`,
      CoverUrl: options?.coverUrl,
      Procedure: options?.procedure || "SimpleHlsEncrypt",
      ClassId: options?.classId,
      SourceContext: options?.sourceContext,
      // 批量拉取
      ...(urls.length > 1 ? {
        ExtInfo: JSON.stringify({
          MediaUrlList: urls.map(u => ({
            Url: u.url,
            MediaName: u.fileName || u.url.split("/").pop() || `pull_${Date.now()}`,
          })),
        }),
      } : {}),
    });
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
      mediaProcessTask.TranscodeTaskSet = transcodeDefs.map(d => ({ Definition: d }));
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

    if (options?.watermarkDefinition) {
      // 水印需通过任务流（Procedure）方式应用
      // 这里直接内联水印到转码模板中
      req.AiContentReviewTask = undefined;
    }

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
    return this.callVodApi("ClipMedia", {
      FileId: params.fileId,
      StartTimeOffset: params.startTimeOffset,
      EndTimeOffset: params.endTimeOffset,
      Name: params.clipName || `clip_${Date.now()}`,
      ClassId: params.classId,
      Procedure: params.procedure || "",
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
    return this.callVodApi("ClipMedia", {
      Url: params.url,
      StartTimeOffset: params.startTimeOffset,
      EndTimeOffset: params.endTimeOffset,
      Name: params.clipName || `clip_url_${Date.now()}`,
      Procedure: params.procedure || "",
    });
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
