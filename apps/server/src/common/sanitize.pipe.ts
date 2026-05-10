import { PipeTransform, Injectable, ArgumentMetadata } from "@nestjs/common";

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

  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    if (typeof value === "string") {
      return this.escape(value);
    }
    if (Array.isArray(value)) {
      return value.map((v) => this.transform(v, _metadata));
    }
    if (value && typeof value === "object") {
      const sanitized: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        sanitized[k] = this.transform(v, _metadata);
      }
      return sanitized;
    }
    return value;
  }

  private escape(str: string): string {
    return str.replace(/[&<>"'/]/g, (ch) => this.escapables[ch] || ch);
  }
}
