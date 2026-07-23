import { PipeTransform, Injectable, ArgumentMetadata } from "@nestjs/common";

/**
 * 防止 XSS 的全局输入清理管道
 *
 * 跳过以下字段类型（不转义）：
 * - 古籍正文（content, text, translation, annotation）
 * - URL 字段（url, iiifUrl, manifestUrl, src, href, link）
 * - JSON 字段和已编码数据
 * - 用户密码、token 等敏感字段
 */
const SKIP_FIELDS = new Set([
  "content", "text", "body", "description", "summary", "intro",
  // detail：商品详情富文本(wangEditor HTML)，转义会变成 &lt;p&gt; 乱码 → C 端 rich-text 渲染成源码
  "detail",
  "translation", "annotation", "excerpt", "evidence",
  "answer", "question",
  "url", "iiifUrl", "manifestUrl", "src", "href", "link", "cover", "path",
  "sourceUrl", "avatar", "imageUrl", "redirectUri",
  // 视频/媒体 URL：VOD/COS 播放地址，转义会把 / → &#x2F; 导致 <video src> 无法播放（视频课程/短视频播不了的真凶）
  "videoUrl", "mediaUrl", "coverUrl", "poster", "fileUrl", "playUrl",
  "thumbnail", "videoCover", "audioUrl", "hlsUrl",
  // images：商品/帖子/评价的图片 URL 数组，转义会把 / → &#x2F; 导致 <image src> 全挂
  // （生产 Product.images 已有被转义的存量脏数据·C 端适配层做了防御性反转义）
  "images", "detailImages",
  // attachments：帖子附件 [{name,size,url}]，JSON 结构容器（详情页以文本节点渲染，前端框架转义兜底）
  "attachments",
  "password", "token", "accessToken", "refreshToken", "hash",
  "secret", "apiKey", "key",
  // 第三方支付回调签名与原始业务报文必须逐字保持不变，否则验签必然失败。
  "resp_data", "sign", "sign_type",
  "aliases", "tags", "metadata", "data", "payload",
  // value：系统/第三方配置的数据容器（常为 JSON 文本），HTML 转义会破坏 JSON 结构导致解析失败；
  // 这类值经加密存储或写入配置，不会被当富文本 innerHTML 渲染，渲染侧由前端框架自动转义兜底。
  "value",
]);

@Injectable()
export class SanitizePipe implements PipeTransform {
  private readonly escapables: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  };

  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    if (metadata.type === "param") return value; // 不处理路由参数
    // 不处理自定义装饰器参数（@UploadedFile 文件对象 / @User 等）：
    // 文件对象的 mimetype/originalname 若被 HTML 转义（image/png→image&#x2F;png）会导致上传白名单校验失败
    if (metadata.type === "custom") return value;
    if (Buffer.isBuffer(value)) return value; // 不递归二进制 Buffer（避免破坏文件内容）
    if (typeof value === "string") {
      if (metadata.data && SKIP_FIELDS.has(metadata.data)) return value;
      return this.escape(value);
    }
    if (Array.isArray(value)) {
      return value.map((v) => this.transform(v, metadata));
    }
    if (value && typeof value === "object") {
      const sanitized: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        const fieldMeta = { ...metadata, data: k };
        sanitized[k] = SKIP_FIELDS.has(k) ? v : this.transform(v, fieldMeta);
      }
      return sanitized;
    }
    return value;
  }

  private escape(str: string): string {
    return str.replace(/[&<>"'/]/g, (ch) => this.escapables[ch] || ch);
  }
}
