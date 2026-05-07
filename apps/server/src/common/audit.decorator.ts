import { SetMetadata } from "@nestjs/common";

export const AUDITABLE_KEY = "auditable";

export interface AuditableOptions {
  action: string;
  targetType?: string;
}

export const Auditable = (options: AuditableOptions) =>
  SetMetadata(AUDITABLE_KEY, options);
