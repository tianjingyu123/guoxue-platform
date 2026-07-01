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
  "translation", "annotation", "excerpt", "evidence",
  "answer", "question",
  "url", "iiifUrl", "manifestUrl", "src", "href", "link", "cover", "path",
  "sourceUrl", "avatar", "imageUrl", "redirectUri",
  "password", "token", "accessToken", "refreshToken", "hash",
  "secret", "apiKey", "key",
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
