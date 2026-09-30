import { SetMetadata } from "@nestjs/common";

export const AUDITABLE_KEY = "auditable";

export interface AuditableOptions {
  action: string;
  targetType?: string;
  /** 敏感明文查看须等待审计成功，失败时不得返回明文；普通写操作仍异步留痕。 */
  requireSuccess?: boolean;
}

export const Auditable = (options: AuditableOptions) =>
  SetMetadata(AUDITABLE_KEY, options);
